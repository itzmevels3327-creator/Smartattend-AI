import logging
import os
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Student, User
from ..schemas import StudentCreate, StudentOut
from ..services.face_service import register_student_face
from .auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=list[StudentOut])
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), search: str | None = Query(default=None)):
    if current_user.role not in {"admin", "faculty"}:
        raise HTTPException(status_code=403, detail="Access denied")
    query = db.query(Student)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(Student.full_name.ilike(term), Student.register_number.ilike(term), Student.department.ilike(term)))
    return query.order_by(Student.created_at.desc()).all()


@router.post("", response_model=StudentOut)
def create_student(payload: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add students")
    try:
        student = Student(**payload.model_dump())
        db.add(student)
        db.commit()
        db.refresh(student)
        return student
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Student creation failed")
        raise HTTPException(status_code=400, detail=f"Could not create student: {exc.orig}") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Student creation failed")
        raise HTTPException(status_code=500, detail=f"Could not create student: {exc}") from exc


@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: int, payload: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update students")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    try:
        for key, value in payload.model_dump().items():
            setattr(student, key, value)
        db.commit()
        db.refresh(student)
        return student
    except Exception as exc:
        db.rollback()
        logger.exception("Student update failed")
        raise HTTPException(status_code=500, detail=f"Could not update student: {exc}") from exc


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete students")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    try:
        db.delete(student)
        db.commit()
        return {"message": "Student deleted successfully"}
    except Exception as exc:
        db.rollback()
        logger.exception("Student deletion failed")
        raise HTTPException(status_code=500, detail=f"Could not delete student: {exc}") from exc


@router.post("/{student_id}/register-face")
async def register_face(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "faculty"}:
        raise HTTPException(status_code=403, detail="Access denied")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    contents = await file.read()
    max_size = 5 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    allowed = {".jpg", ".jpeg", ".png"}
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, JPEG and PNG are allowed")

    if student.is_face_registered:
        raise HTTPException(status_code=400, detail="Face already registered for this student")

    try:
        encoding = register_student_face(db, student, contents, filename)
        return {"message": "Face registered successfully", "face_encoding": encoding, "student_id": student.id}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as exc:
        logger.exception("Face registration failed")
        raise HTTPException(status_code=500, detail=f"Face registration failed: {exc}") from exc
