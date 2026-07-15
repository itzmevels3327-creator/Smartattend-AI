import io
import json
import os
import uuid
from datetime import datetime

import cv2
import numpy as np
from sqlalchemy.orm import Session

try:
    import face_recognition  # type: ignore
except ImportError:  # pragma: no cover - runtime dependency guard
    face_recognition = None

from ..models import Student


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _secure_filename(filename: str) -> str:
    return os.path.basename(filename).replace(' ', '_')


def extract_face_encoding(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image data")

    if face_recognition is not None:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(img_rgb, model="hog")
        if len(face_locations) == 0:
            raise ValueError("No face detected in the uploaded image")
        if len(face_locations) > 1:
            raise ValueError("Multiple faces detected in the uploaded image; please upload an image with a single face")

        encodings = face_recognition.face_encodings(img_rgb, known_face_locations=face_locations)
        if not encodings:
            raise ValueError("Could not extract face encoding")
        return encodings[0]

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    if len(faces) == 0:
        raise ValueError("No face detected in the uploaded image")
    if len(faces) > 1:
        raise ValueError("Multiple faces detected in the uploaded image; please upload an image with a single face")

    x, y, w, h = faces[0]
    face_region = gray[y:y + h, x:x + w]
    resized = cv2.resize(face_region, (32, 32))
    normalized = resized.astype(np.float32) / 255.0
    return normalized.reshape(-1)


def save_uploaded_image_bytes(image_bytes: bytes, filename: str, student_id: int) -> str:
    safe = _secure_filename(filename)
    unique = f"student_{student_id}_{uuid.uuid4().hex}_{safe}"
    file_path = os.path.join(UPLOAD_DIR, unique)
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    return file_path


def register_student_face(db: Session, student: Student, image_bytes: bytes, filename: str) -> str:
    if student.is_face_registered:
        raise ValueError("Face already registered for this student")

    encoding = extract_face_encoding(image_bytes)
    encoding_list = encoding.tolist()

    stored_path = save_uploaded_image_bytes(image_bytes, filename, student.id)

    student.face_encoding = json.dumps(encoding_list)
    student.face_image = stored_path
    student.face_registered_at = datetime.utcnow()
    student.is_face_registered = True

    db.add(student)
    db.commit()
    db.refresh(student)
    return student.face_encoding
