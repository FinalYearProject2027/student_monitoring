// DOM Elements
const videoElement = document.getElementById('video-element');
const canvasOverlay = document.getElementById('canvas-overlay');
const ctx = canvasOverlay.getContext('2d');
const btnWebcam = document.getElementById('btn-webcam');
const fileUpload = document.getElementById('file-upload');
const videoPlaceholder = document.getElementById('video-placeholder');
const connectionDot = document.getElementById('connection-dot');
const connectionStatus = document.getElementById('connection-status');
const facesCounter = document.getElementById('faces-counter');
const fpsCounter = document.getElementById('fps-counter');

// State
let isWebcamActive = false;
let stream = null;
let ws = null;
let isConnected = false;
let animationId = null;
let lastFrameTime = 0;
let fps = 0;

// Connect to Backend WebSocket
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8000/ws/detect');
    
    ws.onopen = () => {
        isConnected = true;
        connectionDot.classList.add('connected');
        connectionStatus.textContent = 'Connected to YOLOv8';
    };
    
    ws.onclose = () => {
        isConnected = false;
        connectionDot.classList.remove('connected');
        connectionStatus.textContent = 'Disconnected';
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.boxes) {
            drawBoxes(data.boxes);
            facesCounter.textContent = data.boxes.length;
        }
    };
}

// Initial connection
connectWebSocket();

// Handle Resize for Canvas
function resizeCanvas() {
    canvasOverlay.width = videoElement.clientWidth;
    canvasOverlay.height = videoElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
videoElement.addEventListener('loadedmetadata', resizeCanvas);

// Draw Bounding Boxes
function drawBoxes(boxes) {
    ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    // The boxes from backend are based on the video's intrinsic dimensions
    // We need to scale them to the canvas display size
    const scaleX = canvasOverlay.width / videoElement.videoWidth;
    const scaleY = canvasOverlay.height / videoElement.videoHeight;
    
    boxes.forEach(box => {
        const x = box.x1 * scaleX;
        const y = box.y1 * scaleY;
        const w = (box.x2 - box.x1) * scaleX;
        const h = (box.y2 - box.y1) * scaleY;
        
        // Draw box
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Draw label background
        ctx.fillStyle = '#3b82f6';
        const label = `Face ${(box.confidence * 100).toFixed(0)}%`;
        ctx.font = '14px Inter';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y - 20, textWidth + 10, 20);
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 5, y - 5);
    });
}

// Extract frames and send to backend
function processVideoFrame(timestamp) {
    if (!videoElement.paused && !videoElement.ended) {
        // Calculate FPS
        if (lastFrameTime > 0) {
            const delta = timestamp - lastFrameTime;
            fps = Math.round(1000 / delta);
            // Update UI every few frames to avoid flicker
            if (timestamp % 10 < 2) fpsCounter.textContent = fps;
        }
        lastFrameTime = timestamp;

        // Send frame if connected
        if (isConnected && ws.readyState === WebSocket.OPEN) {
            // Create temporary canvas to grab image data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = videoElement.videoWidth;
            tempCanvas.height = videoElement.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
            
            // Convert to JPEG base64 (lower quality for speed)
            const base64Image = tempCanvas.toDataURL('image/jpeg', 0.7);
            ws.send(base64Image);
        }
    }
    
    // Request next frame
    animationId = requestAnimationFrame(processVideoFrame);
}

// Toggle Webcam
btnWebcam.addEventListener('click', async () => {
    if (isWebcamActive) {
        // Stop webcam
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.srcObject = null;
        videoElement.style.opacity = '0';
        videoPlaceholder.style.display = 'flex';
        btnWebcam.innerHTML = '<span class="btn-icon">📷</span> Live Camera';
        btnWebcam.classList.remove('active');
        isWebcamActive = false;
        
        if (animationId) cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
        facesCounter.textContent = '0';
        fpsCounter.textContent = '0';
    } else {
        // Start webcam
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            videoElement.style.opacity = '1';
            videoPlaceholder.style.display = 'none';
            btnWebcam.innerHTML = '<span class="btn-icon">🛑</span> Stop Camera';
            btnWebcam.classList.add('active');
            isWebcamActive = true;
            
            // Clear any file input
            fileUpload.value = '';
            
            // Start processing frames when video starts playing
            videoElement.onplay = () => {
                resizeCanvas();
                lastFrameTime = 0;
                animationId = requestAnimationFrame(processVideoFrame);
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam.");
        }
    }
});

// Handle Video Upload
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Stop webcam if active
        if (isWebcamActive) {
            btnWebcam.click();
        }
        
        const url = URL.createObjectURL(file);
        videoElement.src = url;
        videoElement.style.opacity = '1';
        videoPlaceholder.style.display = 'none';
        
        videoElement.onplay = () => {
            resizeCanvas();
            lastFrameTime = 0;
            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(processVideoFrame);
        };
    }
});
