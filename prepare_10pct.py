"""
Extract 10% of dataset from each person, each letter.
Apply aggressive augmentation during training.
"""

import re
import random
import shutil
import zipfile
from pathlib import Path
from collections import defaultdict

import cv2
import numpy as np
from tqdm import tqdm

BASE_DIR = Path(__file__).resolve().parent
FRAMES_DIR = BASE_DIR / "isldatset" / "Frames"
OUTPUT_DIR = BASE_DIR / "data_fast"
RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

FILENAME_RE = re.compile(r"^(Person\d+)-([A-Z])-(\d+)-(\d+)\.jpg$", re.IGNORECASE)

def extract_zips():
    """Extract all Person*.zip files."""
    zips = sorted(FRAMES_DIR.glob("Person*.zip"))
    for zf in zips:
        person_name = zf.stem
        dest = FRAMES_DIR / person_name
        if dest.exists() and any(dest.iterdir()):
            print(f"  {person_name}/ already exists")
            continue
        print(f"  Extracting {zf.name} → {dest}/")
        dest.mkdir(exist_ok=True)
        with zipfile.ZipFile(zf) as z:
            for member in tqdm(z.namelist(), desc=f"  {person_name}", unit="file"):
                filename = Path(member).name
                if filename.lower().endswith(".jpg"):
                    target = dest / filename
                    if not target.exists():
                        with z.open(member) as src, open(target, "wb") as dst:
                            dst.write(src.read())

def build_manifest():
    """Scan all frames, organize by person/letter."""
    manifest = defaultdict(lambda: defaultdict(list))
    person_dirs = sorted(FRAMES_DIR.glob("Person*"))
    for pdir in [d for d in person_dirs if d.is_dir()]:
        for fpath in pdir.iterdir():
            m = FILENAME_RE.match(fpath.name)
            if m:
                person, letter = m.group(1), m.group(2).upper()
                manifest[person][letter].append(str(fpath))
    return manifest

def augment_image(img, rng=None):
    """Apply random augmentations."""
    if rng is None:
        rng = np.random.default_rng()
    h, w = img.shape[:2]
    
    augs = []
    
    # Rotation
    angle = rng.uniform(-15, 15)
    M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1)
    augs.append(cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT_101))
    
    # Brightness/contrast
    alpha = rng.uniform(0.7, 1.3)
    beta = rng.integers(-30, 31)
    augs.append(cv2.convertScaleAbs(img, alpha=alpha, beta=int(beta)))
    
    # Flip
    augs.append(cv2.flip(img, 1))
    
    # Blur
    augs.append(cv2.GaussianBlur(img, (5, 5), 0))
    
    # Noise
    noise = rng.normal(0, 15, img.shape).astype(np.int16)
    augs.append(np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8))
    
    # Random crop + resize
    crop_frac = rng.uniform(0.8, 0.95)
    new_h, new_w = int(h * crop_frac), int(w * crop_frac)
    top = rng.integers(0, h - new_h + 1)
    left = rng.integers(0, w - new_w + 1)
    cropped = img[top:top+new_h, left:left+new_w]
    augs.append(cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR))
    
    return augs

def main():
    print("=" * 60)
    print("Preparing 2% Dataset with Augmentation")
    print("=" * 60 + "\n")
    
    # Extract
    print("[1/3] Extracting zips...")
    extract_zips()
    
    # Build manifest
    print("\n[2/3] Building manifest...")
    manifest = build_manifest()
    print(f"Found {sum(len(l) for p in manifest.values() for l in p.values())} frames\n")
    
    # Sample 10% and augment
    print("[3/3] Sampling 10% + augmenting...")
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir()
    
    total_sampled = 0
    total_augmented = 0
    rng = np.random.default_rng(RANDOM_SEED)
    
    for person in sorted(manifest.keys()):
        for letter in sorted(manifest[person].keys()):
            paths = manifest[person][letter]
            # Sample 2%
            sample_size = max(1, len(paths) // 50)
            sampled = random.sample(paths, sample_size)
            
            letter_dir = OUTPUT_DIR / letter
            letter_dir.mkdir(exist_ok=True)
            
            counter = 0
            for orig_path in sampled:
                img = cv2.imread(orig_path)
                
                # Save original
                cv2.imwrite(str(letter_dir / f"{person}_{counter:05d}_orig.jpg"), img)
                counter += 1
                total_sampled += 1
                
                # Augment 5 times
                augs = augment_image(img, rng)
                for aug_img in augs:
                    cv2.imwrite(str(letter_dir / f"{person}_{counter:05d}_aug.jpg"), aug_img)
                    counter += 1
                    total_augmented += 1
    
    print(f"\nSampled: {total_sampled} original images")
    print(f"Augmented: {total_augmented} augmented images")
    print(f"Total: {total_sampled + total_augmented} images\n")
    print(f"Output: {OUTPUT_DIR}\n")

if __name__ == "__main__":
    main()
