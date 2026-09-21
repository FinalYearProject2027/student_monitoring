import os
from ultralytics import YOLO

try:
    MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pt")
    print(f"Loading model from {MODEL_PATH}")
    model = YOLO(MODEL_PATH)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
