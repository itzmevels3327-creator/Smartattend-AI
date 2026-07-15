import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AttendanceRecord, Faculty, Student, Subject, User
from ..schemas import AttendanceCreate, AttendanceOut
from .auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/today", response_model=list[AttendanceOut])
def today_attendance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "faculty"}:
        raise HTTPException(status_code=403, detail="Access denied")
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return db.query(AttendanceRecord).filter(AttendanceRecord.checked_at >= start).order_by(AttendanceRecord.checked_at.desc()).all()


@router.post("/mark", response_model=AttendanceOut)
def mark_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "faculty"}:
        raise HTTPException(status_code=403, detail="Access denied")
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()

    # Determine faculty: prefer payload.faculty_id, otherwise infer from current_user if faculty.
    # If admin and no faculty_id is provided, fall back to the first faculty record (convenience for testing).
    faculty = None
    if payload.faculty_id:
        faculty = db.query(Faculty).filter(Faculty.id == payload.faculty_id).first()
    else:
        if current_user.role == "faculty":
            faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        elif current_user.role == "admin":
            faculty = db.query(Faculty).order_by(Faculty.id).first()

    if not student or not faculty or not subject:
        raise HTTPException(status_code=404, detail="Student, faculty or subject not found")

    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id, AttendanceRecord.checked_at >= start).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this student today")

    try:
        record = AttendanceRecord(student_id=student.id, faculty_id=faculty.id, subject_id=subject.id, confidence=payload.confidence, method=payload.method)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception as exc:
        db.rollback()
        logger.exception("Attendance marking failed")
        raise HTTPException(status_code=500, detail=f"Attendance could not be marked: {exc}") from exc


@router.get("/history", response_model=list[AttendanceOut])
def history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "faculty", "student"}:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.query(AttendanceRecord).order_by(AttendanceRecord.checked_at.desc()).all()
