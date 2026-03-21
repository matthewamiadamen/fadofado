"""ISL Fingerspelling API — Flask + SocketIO backend for CNN inference."""

import os, base64, numpy as np, cv2, torch, torch.nn as nn
from torchvision import models, transforms
from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from irish_data import WORDS, EN_TO_IRISH

# ── Config ────────────────────────────────────────────────────
MODEL_PATH  = os.path.join("checkpoints", "best_model.pth")
HAND_MODEL  = "hand_landmarker.task"
LETTERS     = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
NUM_CLASSES = 26
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ── Globals ───────────────────────────────────────────────────
isl_model      = None
hand_landmarker = None
model_loaded   = False

img_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Model ─────────────────────────────────────────────────────
def _create_model():
    m = models.mobilenet_v3_small(weights=None)
    m.classifier[3] = nn.Linear(m.classifier[3].in_features, NUM_CLASSES)
    return m

def load_model():
    global isl_model, model_loaded
    if not os.path.exists(MODEL_PATH):
        print(f"[WARN] Model not found at {MODEL_PATH}")
        return False
    isl_model = _create_model()
    isl_model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
    isl_model.to(DEVICE).eval()
    model_loaded = True
    print(f"[OK] Model loaded from {MODEL_PATH}")
    return True

# ── Hand detection (MediaPipe tasks API) ──────────────────────
def init_hand_detector():
    global hand_landmarker
    try:
        import mediapipe as mp
        if not os.path.exists(HAND_MODEL):
            import urllib.request
            url = ("https://storage.googleapis.com/mediapipe-models/"
                   "hand_landmarker/hand_landmarker/float16/latest/"
                   "hand_landmarker.task")
            print("[INFO] Downloading hand-landmarker model …")
            urllib.request.urlretrieve(url, HAND_MODEL)
        opts = mp.tasks.vision.HandLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=HAND_MODEL),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_hands=1,
        )
        hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(opts)
        print("[OK] Hand detector ready")
    except Exception as exc:
        print(f"[WARN] Hand detector failed: {exc}")

# ── Frame processing ──────────────────────────────────────────
def _make_model_input(frame, landmarks, h, w):
    """Replicate training-data domain: isolate hand on black bg, grayscale,
    square crop centred on hand, resize to 224×224."""

    # 1. Pixel coords of the 21 hand landmarks
    pts = np.array([[int(p.x * w), int(p.y * h)] for p in landmarks],
                   dtype=np.int32)

    # 2. Convex hull mask — isolates hand from background (like dataset)
    hull = cv2.convexHull(pts)
    mask = np.zeros((h, w), dtype=np.uint8)
    # Dilate the hull so we keep fingertips / edges with generous margin
    cv2.fillConvexPoly(mask, hull, 255)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                                       (45, 45)))

    # 3. Black-out background (matches training images: hand on black)
    masked = cv2.bitwise_and(frame, frame, mask=mask)

    # 4. Bounding box around landmarks, padded, made square
    xs, ys = pts[:, 0], pts[:, 1]
    pad = 50
    x1 = max(0, int(xs.min()) - pad)
    y1 = max(0, int(ys.min()) - pad)
    x2 = min(w, int(xs.max()) + pad)
    y2 = min(h, int(ys.max()) + pad)

    # make square (centred)
    cw, ch = x2 - x1, y2 - y1
    side = max(cw, ch)
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    x1 = max(0, cx - side // 2)
    y1 = max(0, cy - side // 2)
    x2 = min(w, x1 + side)
    y2 = min(h, y1 + side)

    crop = masked[y1:y2, x1:x2]
    if crop.size == 0:
        return None, None

    # 5. Grayscale → 3-channel (training images are grayscale)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    rgb3 = cv2.merge([gray, gray, gray])

    # 6. Standard transform → tensor
    tensor = img_transform(rgb3).unsqueeze(0).to(DEVICE)

    bbox = [x1 / w, y1 / h, x2 / w, y2 / h]
    return tensor, bbox


def process_frame(b64):
    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        frame = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return {"hand_present": False}

        h, w = frame.shape[:2]

        if hand_landmarker is None:
            return {"hand_present": False}

        import mediapipe as mp
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hand_landmarker.detect(
            mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        )
        if not res.hand_landmarks:
            return {"hand_present": False}

        lm = res.hand_landmarks[0]
        if not model_loaded:
            xs = [p.x * w for p in lm]
            ys = [p.y * h for p in lm]
            pad = 40
            bbox = [max(0, min(xs) - pad) / w, max(0, min(ys) - pad) / h,
                    min(w, max(xs) + pad) / w, min(h, max(ys) + pad) / h]
            return {"hand_present": True, "letter": None,
                    "confidence": 0, "bbox": bbox}

        tensor, bbox = _make_model_input(frame, lm, h, w)
        if tensor is None:
            return {"hand_present": True, "letter": None,
                    "confidence": 0, "bbox": bbox}

        with torch.no_grad():
            probs = torch.softmax(isl_model(tensor), 1)
            conf, idx = probs.max(1)

        return {"hand_present": True,
                "letter": LETTERS[idx.item()],
                "confidence": round(conf.item() * 100, 1),
                "bbox": bbox}
    except Exception as exc:
        print(f"[ERR] {exc}")
        return {"hand_present": False}

# ── Fada helpers ──────────────────────────────────────────────
_FADA = str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU")
def strip_fadas(t): return t.translate(_FADA)

def translate_sentence(text):
    return " ".join(EN_TO_IRISH.get(w, w) for w in text.lower().split())

# ── Routes ────────────────────────────────────────────────────
@app.route("/api/words")
def api_words():
    return jsonify(WORDS)

@app.route("/api/status")
def api_status():
    return jsonify(model_loaded=model_loaded,
                   hand_detector=hand_landmarker is not None)

# ── SocketIO handlers ────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    emit("status", {"model_loaded": model_loaded,
                     "hand_detector": hand_landmarker is not None})

@socketio.on("frame")
def on_frame(data):
    emit("prediction", process_frame(data.get("image", "")))

@socketio.on("translate")
def on_translate(data):
    text = data.get("text", "")
    emit("translation", {"english": text, "irish": translate_sentence(text)})

# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  ISL Fingerspelling API (Flask + SocketIO)")
    print("=" * 50)
    load_model()
    init_hand_detector()
    print(f"\n  → API running on http://localhost:5000\n")
    socketio.run(app, host="0.0.0.0", port=5000,
                 debug=False, allow_unsafe_werkzeug=True)
