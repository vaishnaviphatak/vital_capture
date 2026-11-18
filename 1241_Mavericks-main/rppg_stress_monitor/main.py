import base64
import json
import numpy as np
import cv2
import os
import sqlite3
import tempfile
import face_recognition
import traceback
import requests
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from rppg_processor import RPPGProcessor

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

# Local SQLite setup (backup & offline cache)
DB_PATH = os.path.join(os.path.dirname(__file__), "patients.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                face_encoding TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS History (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                bpm REAL,
                rmssd REAL,
                resp_rate REAL,
                stress_lvl TEXT,
                FOREIGN KEY (user_id) REFERENCES Users (id)
            )
        """)
        conn.commit()

init_db()

class RegisterRequest(BaseModel):
    name: str
    image_b64: str

class LoginRequest(BaseModel):
    image_b64: str

class SaveHistoryRequest(BaseModel):
    user_id: int
    bpm: float
    rmssd: float
    resp_rate: float
    stress_lvl: str

def parse_b64_image(b64_string: str) -> np.ndarray:
    encoded_data = b64_string.split(',')[1] if ',' in b64_string else b64_string
    np_arr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return frame

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/supabase/status")
async def supabase_status():
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/users?select=id&limit=1", headers=get_supabase_headers(), timeout=5)
        if r.status_code in [200, 206]:
            return {"status": "connected", "database": "Supabase Cloud Active", "url": SUPABASE_URL}
    except Exception as e:
        pass
    return {"status": "offline_fallback", "database": "Local SQLite (patients.db)"}

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
        temp.write(await file.read())
        temp_path = temp.name

    try:
        cap = cv2.VideoCapture(temp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or np.isnan(fps):
            fps = 30.0
            
        batch_processor = RPPGProcessor(fps=int(fps))
        batch_processor.window_size = 9999999
        
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            batch_processor.add_frame(frame)
            frame_count += 1
            if frame_count > fps * 60:
                break

        cap.release()
        
        if len(batch_processor.rgb_buffer) < 30:
            return {"error": "Could not detect face consistently in video.", "confidence": 0}
            
        metrics = batch_processor.calculate_metrics()
        return metrics
    except Exception as e:
        return {"error": f"Failed to process video: {str(e)}", "confidence": 0}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/register")
async def register_user(req: RegisterRequest):
    try:
        frame = parse_b64_image(req.image_b64)
        if frame is None:
            return {"error": "Invalid camera image."}

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb_frame)
        if not encodings:
            return {"error": "No face detected. Ensure your face is centered and well lit."}

        encoding_json = json.dumps(encodings[0].tolist())
        user_id = None
        source = "Local SQLite"

        # 1. Register in Supabase
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                res = requests.post(
                    f"{SUPABASE_URL}/rest/v1/users",
                    headers=get_supabase_headers(),
                    json={"user_name": req.name, "face_encoding": encoding_json},
                    timeout=6
                )
                if res.status_code in [200, 201]:
                    data = res.json()
                    if len(data) > 0:
                        user_id = data[0]["id"]
                        source = "Supabase Cloud"
            except Exception as e:
                print(f"[Supabase Register Exception]: {e}")

        # 2. Local Backup Cache in SQLite
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO Users (user_name, face_encoding) VALUES (?, ?)", (req.name, encoding_json))
            conn.commit()
            if user_id is None:
                user_id = cursor.lastrowid

        return {"message": "Registered successfully", "user_id": user_id, "name": req.name, "storage": source}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Registration failed: {str(e)}"}

@app.post("/login")
async def login_user(req: LoginRequest):
    try:
        frame = parse_b64_image(req.image_b64)
        if frame is None:
            return {"error": "Invalid camera frame."}

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb_frame)
        if not encodings:
            return {"error": "No face detected. Please face the camera."}

        user_encoding = encodings[0]
        
        # 1. Query Supabase
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/users?select=id,user_name,face_encoding&order=id.desc",
                    headers=get_supabase_headers(),
                    timeout=6
                )
                if r.status_code in [200, 206]:
                    users = r.json()
                    for row in users:
                        db_id = row["id"]
                        db_name = row["user_name"]
                        db_encoding = np.array(json.loads(row["face_encoding"]))
                        matches = face_recognition.compare_faces([db_encoding], user_encoding, tolerance=0.55)
                        if matches[0]:
                            # Fetch user history from Supabase
                            hr = requests.get(
                                f"{SUPABASE_URL}/rest/v1/history?user_id=eq.{db_id}&order=timestamp.desc",
                                headers=get_supabase_headers(),
                                timeout=6
                            )
                            history = hr.json() if hr.status_code in [200, 206] else []
                            return {
                                "message": "Login successful", 
                                "user_id": db_id, 
                                "name": db_name, 
                                "history": history, 
                                "storage": "Supabase Cloud"
                            }
            except Exception as e:
                print(f"[Supabase Login Exception]: {e}")

        # 2. Query Local SQLite Fallback
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, user_name, face_encoding FROM Users ORDER BY id DESC")
            users = cursor.fetchall()

            for row in users:
                db_id = row["id"]
                db_name = row["user_name"]
                db_encoding = np.array(json.loads(row["face_encoding"]))
                matches = face_recognition.compare_faces([db_encoding], user_encoding, tolerance=0.55)
                if matches[0]:
                    cursor.execute("SELECT id, timestamp, bpm, rmssd, resp_rate, stress_lvl FROM History WHERE user_id = ? ORDER BY id DESC", (db_id,))
                    history_rows = cursor.fetchall()
                    history = [{
                        "id": h["id"],
                        "timestamp": h["timestamp"],
                        "bpm": h["bpm"],
                        "rmssd": h["rmssd"],
                        "resp_rate": h["resp_rate"],
                        "stress_lvl": h["stress_lvl"]
                    } for h in history_rows]
                    
                    return {
                        "message": "Login successful", 
                        "user_id": db_id, 
                        "name": db_name, 
                        "history": history, 
                        "storage": "Local SQLite"
                    }

        return {"error": "Face not recognized. Please click 'Register Profile' first."}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Login failed: {str(e)}"}

@app.post("/save_history")
async def save_history(req: SaveHistoryRequest):
    try:
        now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        history = []
        source = "Local SQLite"

        # 1. Insert directly into Supabase
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                res = requests.post(
                    f"{SUPABASE_URL}/rest/v1/history",
                    headers=get_supabase_headers(),
                    json={
                        "user_id": req.user_id,
                        "bpm": req.bpm,
                        "rmssd": req.rmssd,
                        "resp_rate": req.resp_rate,
                        "stress_lvl": req.stress_lvl
                    },
                    timeout=6
                )
                if res.status_code in [200, 201]:
                    source = "Supabase Cloud"
                    # Fetch updated history
                    hr = requests.get(
                        f"{SUPABASE_URL}/rest/v1/history?user_id=eq.{req.user_id}&order=timestamp.desc",
                        headers=get_supabase_headers(),
                        timeout=6
                    )
                    if hr.status_code in [200, 206]:
                        history = hr.json()
            except Exception as e:
                print(f"[Supabase History Exception]: {e}")

        # 2. Local SQLite Backup
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO History (user_id, timestamp, bpm, rmssd, resp_rate, stress_lvl) VALUES (?, ?, ?, ?, ?, ?)",
                (req.user_id, now_ts, req.bpm, req.rmssd, req.resp_rate, req.stress_lvl)
            )
            conn.commit()

            if not history:
                cursor.execute("SELECT id, timestamp, bpm, rmssd, resp_rate, stress_lvl FROM History WHERE user_id = ? ORDER BY id DESC", (req.user_id,))
                history_rows = cursor.fetchall()
                history = [{
                    "id": h["id"],
                    "timestamp": h["timestamp"],
                    "bpm": h["bpm"],
                    "rmssd": h["rmssd"],
                    "resp_rate": h["resp_rate"],
                    "stress_lvl": h["stress_lvl"]
                } for h in history_rows]

        return {"message": "History saved successfully", "history": history, "storage": source}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Failed to save session: {str(e)}"}

@app.websocket("/ws/video")
async def video_endpoint(websocket: WebSocket):
    await websocket.accept()
    processor = RPPGProcessor(fps=30)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("command") == "reset":
                processor = RPPGProcessor(fps=30)
                continue
            
            if 'frame' not in payload:
                continue

            encoded_data = payload['frame'].split(',')[1] if ',' in payload['frame'] else payload['frame']
            np_arr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            result = processor.process_frame(frame)
            if result:
                await websocket.send_json(result)
    except Exception:
        pass

# Unified Frontend Serving
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DIST_PATH = os.path.join(os.path.dirname(__file__), "rppg-client", "dist")
ASSETS_PATH = os.path.join(DIST_PATH, "assets")

if os.path.isdir(ASSETS_PATH):
    app.mount("/assets", StaticFiles(directory=ASSETS_PATH), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    file_path = os.path.join(DIST_PATH, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    index_path = os.path.join(DIST_PATH, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"error": "Frontend build not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
