from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AttendanceRecord, Faculty, Student, User
from .auth import get_current_user

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "faculty"}:
        raise HTTPException(status_code=403, detail="Access denied")
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_records = db.query(AttendanceRecord).count()
    present_today = db.query(AttendanceRecord).filter(AttendanceRecord.status == "present").count()
    attendance_percentage = round((present_today / total_students) * 100, 2) if total_students else 0.0

    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": max(total_students - present_today, 0),
        "faculty_count": total_faculty,
        "attendance_percentage": attendance_percentage,
        "monthly_attendance": total_records,
    }
