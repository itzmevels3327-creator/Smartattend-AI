import os
import sys
import logging
import random
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ai-service")

# Try to import heavy ML/Vision libraries, enable simulation mode if they fail to load
SIMULATION_MODE = False
SIMULATION_REASON = ""

try:
    import cv2
    logger.info("OpenCV imported successfully.")
except ImportError as e:
    SIMULATION_MODE = True
    SIMULATION_REASON = f"OpenCV import failed: {str(e)}"
    logger.warning(f"OpenCV import failed, running in simulation mode. Reason: {e}")

try:
    import face_recognition
    logger.info("face_recognition imported successfully.")
except ImportError as e:
    SIMULATION_MODE = True
    SIMULATION_REASON = f"face_recognition import failed: {str(e)}"
    logger.warning(f"face_recognition import failed, running in simulation mode. Reason: {e}")

try:
    from deepface import DeepFace
    logger.info("DeepFace imported successfully.")
except ImportError as e:
    # DeepFace isn't strictly required if face_recognition works, but we record it.
    logger.warning(f"DeepFace import failed. Will use face_recognition or simulation fallback. Reason: {e}")

try:
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    logger.info("Data science libraries imported successfully.")
except ImportError as e:
    logger.warning(f"sklearn/pandas import failed, predictive queries will use rule-based fallback. Reason: {e}")

app = FastAPI(
    title="AI Attendance System AI Service",
    description="FastAPI service for Face Recognition and Predictive Attendance Analytics",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class RiskPredictionRequest(BaseModel):
    attendance_rate: float
    total_classes: int
    missed_classes: int
    semester: int
    backlogs: int
    participation_score: float # 0 to 10

class RiskPredictionResponse(BaseModel):
    risk_level: str # "LOW", "MEDIUM", "HIGH"
    risk_probability: float
    insights: List[str]

class StatusResponse(BaseModel):
    status: str
    simulation_mode: bool
    reason: Optional[str]
    gpu_available: bool

@app.get("/health", response_model=StatusResponse)
def health_check():
    return {
        "status": "healthy",
        "simulation_mode": SIMULATION_MODE,
        "reason": SIMULATION_REASON if SIMULATION_MODE else None,
        "gpu_available": False # Default, can be refined based on tensorflow/torch status
    }

@app.post("/register-face")
async def register_face(
    student_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Reads an uploaded face image and returns a 128-dimensional face embedding.
    """
    logger.info(f"Registering face for student: {student_id}")
    try:
        contents = await file.read()
        
        # If in simulation mode, generate a mock embedding
        if SIMULATION_MODE:
            # Seed based on student_id to make it deterministic for the same student
            random.seed(student_id)
            mock_embedding = [random.uniform(-0.15, 0.15) for _ in range(128)]
            return {
                "success": True,
                "student_id": student_id,
                "embedding": mock_embedding,
                "message": "Face registered successfully (SIMULATED)"
            }

        # Actual implementation
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        # Convert to RGB (face_recognition expects RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect face encodings
        encodings = face_recognition.face_encodings(rgb_img)
        
        if not encodings:
            raise HTTPException(status_code=400, detail="No faces detected in the uploaded image.")
        
        # Take the first face encoding detected
        face_embedding = encodings[0].tolist()
        
        return {
            "success": True,
            "student_id": student_id,
            "embedding": face_embedding,
            "message": "Face registered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error in register_face: {e}")
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")
        raise e

@app.post("/verify-face")
async def verify_face(
    student_id: str = Form(...),
    registered_embedding: str = Form(...), # JSON stringified float array
    file: UploadFile = File(...)
):
    """
    Compares the uploaded image against the registered embedding to verify attendance.
    """
    logger.info(f"Verifying face for student: {student_id}")
    try:
        contents = await file.read()
        
        # Parse registered embedding
        import json
        try:
            reg_emb = json.loads(registered_embedding)
            if not isinstance(reg_emb, list) or len(reg_emb) == 0:
                raise ValueError("Embedding must be a non-empty list.")
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Invalid registered embedding format: {str(err)}")

        if SIMULATION_MODE:
            # Let's perform a mock validation. If the file name contains "fail", verify fails.
            filename = file.filename.lower() if file.filename else ""
            is_match = "fail" not in filename
            confidence = random.uniform(0.35, 0.49) if not is_match else random.uniform(0.85, 0.99)
            
            return {
                "success": True,
                "verified": is_match,
                "confidence": confidence,
                "message": "Face verification completed (SIMULATED)"
            }

        # Actual implementation
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb_img)
        
        if not encodings:
            return {
                "success": True,
                "verified": False,
                "confidence": 0.0,
                "message": "No faces detected in the live photo."
            }

        live_emb = encodings[0]
        
        # Compute Euclidean distance
        distance = np.linalg.norm(np.array(reg_emb) - live_emb)
        
        # Standard threshold for dlib face recognition is 0.6 (lower is better/closer match)
        threshold = 0.6
        verified = bool(distance < threshold)
        
        # Map distance to a confidence percentage (e.g. distance = 0 -> 100%, distance >= 0.6 -> low confidence)
        confidence = float(max(0.0, min(1.0, 1.0 - (distance / (threshold * 2)))))

        return {
            "success": True,
            "verified": verified,
            "confidence": confidence,
            "message": "Face verification completed"
        }

    except Exception as e:
        logger.error(f"Error in verify_face: {e}")
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")
        raise e

@app.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(request: RiskPredictionRequest):
    """
    Predicts if a student is at risk of falling below the minimum 75% attendance threshold.
    """
    logger.info("Predicting low attendance risk")
    try:
        rate = request.attendance_rate
        
        # A simple, explainable ML/Rule logic for prediction.
        # In a real environment, we would load a pre-trained RandomForest / XGBoost model.
        # Below we simulate it, but ground it in logical rules that behave like a model.
        
        probability = 0.0
        
        # Base probability depends heavily on current attendance rate
        if rate >= 90:
            probability = random.uniform(0.01, 0.08)
        elif rate >= 75:
            probability = random.uniform(0.10, 0.25)
        elif rate >= 60:
            probability = random.uniform(0.45, 0.65)
        else:
            probability = random.uniform(0.75, 0.98)
            
        # Adjust based on factors
        # semester pressure
        if request.semester > 4:
            probability += 0.05
        # backlogs increase risk
        probability += min(0.20, request.backlogs * 0.05)
        # low class participation increases risk
        if request.participation_score < 5.0:
            probability += (5.0 - request.participation_score) * 0.04
            
        probability = float(max(0.0, min(1.0, probability)))
        
        if probability < 0.35:
            risk = "LOW"
        elif probability < 0.70:
            risk = "MEDIUM"
        else:
            risk = "HIGH"
            
        # Generate explanatory insights
        insights = []
        if rate < 75:
            insights.append(f"Current attendance is {rate:.1f}%, which is below the mandatory 75% threshold.")
        else:
            insights.append(f"Current attendance is stable at {rate:.1f}%.")
            
        if request.backlogs > 0:
            insights.append(f"Student has {request.backlogs} backlog course(s), potentially impacting schedule consistency.")
        if request.participation_score < 6.0:
            insights.append(f"Class engagement score ({request.participation_score:.1f}/10) indicates high risk of disengagement.")
        else:
            insights.append("High class participation acts as a protective factor against absenteeism.")
            
        if risk == "HIGH":
            insights.append("Action Required: Schedule counseling session and send automated warning email.")
        elif risk == "MEDIUM":
            insights.append("Precautionary: Keep track of upcoming classes to prevent falling below 75%.")
            
        return {
            "risk_level": risk,
            "risk_probability": probability,
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Error in predict_risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
