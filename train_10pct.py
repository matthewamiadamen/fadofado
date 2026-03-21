"""
Train a simple CNN on 10% augmented ISL dataset.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from pathlib import Path
from tqdm import tqdm
from PIL import Image

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DATA_DIR = Path("data_10pct")
CHECKPOINT_DIR = Path("checkpoints")
CHECKPOINT_DIR.mkdir(exist_ok=True)

LETTERS = sorted([d.name for d in DATA_DIR.iterdir() if d.is_dir()])
LABEL_MAP = {letter: idx for idx, letter in enumerate(LETTERS)}

class ISLDataset(Dataset):
    def __init__(self, transform=None):
        self.samples = []
        self.transform = transform or transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        
        for letter_dir in DATA_DIR.iterdir():
            if not letter_dir.is_dir():
                continue
            label = LABEL_MAP[letter_dir.name]
            for img_path in letter_dir.glob("*.jpg"):
                self.samples.append((str(img_path), label))
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        img = self.transform(img)
        return img, label

def create_model(num_classes):
    model = models.mobilenet_v3_small(weights="DEFAULT")
    # Freeze entire backbone initially
    for param in model.features.parameters():
        param.requires_grad = False
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model.to(DEVICE)

def unfreeze_last_layers(model, n=4):
    """Unfreeze the last n feature blocks for fine-tuning."""
    layers = list(model.features.children())
    for layer in layers[-n:]:
        for param in layer.parameters():
            param.requires_grad = True

def train_epoch(model, loader, criterion, optimizer):
    model.train()
    losses, accs = [], []
    for imgs, labels in tqdm(loader, desc="train", unit="batch"):
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        logits = model(imgs)
        loss = criterion(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        
        losses.append(loss.item())
        probs = torch.softmax(logits, dim=1)
        acc = (probs.argmax(1) == labels).float().mean().item()
        accs.append(acc)
    
    return sum(losses) / len(losses), sum(accs) / len(accs)

@torch.no_grad()
def eval_epoch(model, loader, criterion):
    model.eval()
    losses, accs = [], []
    for imgs, labels in tqdm(loader, desc="eval", unit="batch"):
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        logits = model(imgs)
        loss = criterion(logits, labels)
        losses.append(loss.item())
        
        probs = torch.softmax(logits, dim=1)
        acc = (probs.argmax(1) == labels).float().mean().item()
        accs.append(acc)
    
    return sum(losses) / len(losses), sum(accs) / len(accs)

def main():
    print(f"Device: {DEVICE}")
    print(f"Letters: {len(LETTERS)} ({', '.join(LETTERS[:5])}...)\n")
    
    # Data — 70% train, 15% val, 15% test
    dataset = ISLDataset()
    total = len(dataset)
    train_size = int(0.70 * total)
    val_size = int(0.15 * total)
    test_size = total - train_size - val_size
    train_data, val_data, test_data = torch.utils.data.random_split(
        dataset, [train_size, val_size, test_size],
        generator=torch.Generator().manual_seed(42),
    )
    
    train_loader = DataLoader(train_data, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_data, batch_size=32, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_data, batch_size=32, shuffle=False, num_workers=0)
    
    print(f"Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}\n")
    
    # Model
    model = create_model(len(LETTERS))
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    
    # === PHASE 1: Frozen backbone, train classifier only (fast) ===
    print("=" * 60)
    print("PHASE 1: Training classifier head (backbone frozen)")
    print("=" * 60)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                            lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=3)
    
    best_val_acc = 0
    for epoch in range(1, 4):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_acc = eval_epoch(model, val_loader, criterion)
        
        print(f"Epoch {epoch:2d}: train_loss={train_loss:.3f} train_acc={train_acc:.2%}  "
              f"val_loss={val_loss:.3f} val_acc={val_acc:.2%}")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), CHECKPOINT_DIR / "best_model.pth")
            print(f"  → Saved best model (val_acc={best_val_acc:.2%})")
        scheduler.step()
    
    # === PHASE 2: Unfreeze last layers, fine-tune with lower LR ===
    print(f"\n{'=' * 60}")
    print("PHASE 2: Fine-tuning (last 4 backbone layers unfrozen)")
    print("=" * 60)
    unfreeze_last_layers(model, n=4)
    optimizer = optim.AdamW([
        {"params": model.features.parameters(), "lr": 1e-4},
        {"params": model.classifier.parameters(), "lr": 5e-4},
    ], weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=7)
    
    for epoch in range(4, 11):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_acc = eval_epoch(model, val_loader, criterion)
        
        print(f"Epoch {epoch:2d}: train_loss={train_loss:.3f} train_acc={train_acc:.2%}  "
              f"val_loss={val_loss:.3f} val_acc={val_acc:.2%}")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), CHECKPOINT_DIR / "best_model.pth")
            print(f"  → Saved best model (val_acc={best_val_acc:.2%})")
        scheduler.step()
    
    # Test — load best model and evaluate on held-out test set
    print(f"\n{'='*60}")
    print("Loading best model for final test evaluation...")
    model.load_state_dict(torch.load(CHECKPOINT_DIR / "best_model.pth",
                                     map_location=DEVICE, weights_only=True))
    test_loss, test_acc = eval_epoch(model, test_loader, criterion)
    
    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"  Best val acc:  {best_val_acc:.2%}")
    print(f"  Test loss:     {test_loss:.3f}")
    print(f"  Test accuracy: {test_acc:.2%}")
    print(f"{'='*60}")
    print(f"Model saved to: {CHECKPOINT_DIR / 'best_model.pth'}")

if __name__ == "__main__":
    main()
