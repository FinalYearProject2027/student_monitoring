# Face Detection Web Application (YOLOv8) - Final Implementation

This document outlines the final architecture and implementation details for the YOLOv8 face detection web application we built.

## Architecture Overview

The system is split into a Python backend for heavy model inference and a modern Vite web frontend for real-time video capture and display.

### 1. Python Backend (FastAPI)
- **Framework**: `FastAPI` + `uvicorn` (with `websockets`).
- **Core Logic**: Hosts the `model.pt` PyTorch model using the `ultralytics` library.
- **Communication**: Opens a WebSocket endpoint at `/ws/detect`. It receives base64-encoded JPEG frames from the frontend, decodes them using `opencv-python` and `numpy`, runs them through the YOLOv8 model, and returns a JSON array of bounding boxes and confidence scores.

### 2. Modern Web Frontend (Vite + HTML/JS/CSS)
- **Framework**: Vanilla JS built with Vite.
- **UI Design**: A premium dark-mode aesthetic with glassmorphism panels.
- **Video Capture**: Uses `navigator.mediaDevices.getUserMedia` for live webcam access, or an HTML5 file input for uploading local video files.
- **Canvas Overlay**: An HTML5 `<canvas>` sits perfectly on top of the `<video>` element. When WebSocket messages arrive with bounding boxes, the frontend scales the coordinates to the current video size and draws the boxes in real-time.
- **Performance**: A client-side FPS counter calculates the round-trip latency of the WebSocket frames.

## Dependencies

**Backend (`backend/requirements.txt`)**:
- `fastapi`
- `uvicorn`
- `websockets` (crucial for Uvicorn to accept WebSocket connections)
- `python-multipart`
- `ultralytics`
- `opencv-python-headless`
- `numpy`
- `pydantic`

**Frontend (`frontend/package.json`)**:
- `vite`

## Running the Application

### Backend
Navigate to the `backend` folder and run:
```powershell
py -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
pip install websockets
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
Navigate to the `frontend` folder in a new terminal and run:
```powershell
npm install
npm run dev
```
