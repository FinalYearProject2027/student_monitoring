from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import json
import os

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the fine-tuned YOLOv8 model
# Assuming the script runs in the backend folder, and model.pt is in the parent folder
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "model.pt")
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}. Please ensure model.pt is in the parent directory.")
    model = None

@app.get("/")
def read_root():
    return {"status": "Backend is running. Connect to /ws/detect for WebSocket inference."}

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    if model is None:
        await websocket.send_text(json.dumps({"error": "Model not loaded"}))
        await websocket.close()
        return

    try:
        while True:
            # Receive frame as base64 string
            data = await websocket.receive_text()
            
            # Strip data URL prefix if present
            if "," in data:
                data = data.split(",")[1]
                
            # Decode base64 to numpy array for OpenCV
            img_bytes = base64.b64decode(data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is not None:
                # Perform inference
                results = model(img, verbose=False)
                
                # Extract predictions
                boxes = []
                for result in results:
                    for box in result.boxes:
                        b = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                        conf = float(box.conf[0])
                        boxes.append({
                            "x1": b[0],
                            "y1": b[1],
                            "x2": b[2],
                            "y2": b[3],
                            "confidence": conf
                        })
                
                # Send results back to client
                await websocket.send_text(json.dumps({"boxes": boxes}))
            else:
                await websocket.send_text(json.dumps({"error": "Failed to decode image"}))
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error processing frame: {e}")
