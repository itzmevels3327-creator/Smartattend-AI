import logging
import os
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import User, Department, Subject, Settings, Faculty, Student
from .auth import get_password_hash
from .routers import auth as auth_router
from .routers import students as students_router
from .routers import attendance as attendance_router
from .routers import reports as reports_router
from .routers import settings as settings_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("attendance_api")

Base.metadata.create_all(bind=engine)


def ensure_schema_columns():
    inspector = inspect(engine)
    if not inspector.has_table("students"):
        return
    student_columns = {column["name"] for column in inspector.get_columns("students")}
    with engine.begin() as connection:
        if "face_encoding" not in student_columns:
            connection.execute(text("ALTER TABLE students ADD COLUMN face_encoding TEXT"))
        if "face_image" not in student_columns:
            connection.execute(text("ALTER TABLE students ADD COLUMN face_image VARCHAR(255)"))
        if "face_registered_at" not in student_columns:
            connection.execute(text("ALTER TABLE students ADD COLUMN face_registered_at DATETIME"))
        if "is_face_registered" not in student_columns:
            connection.execute(text("ALTER TABLE students ADD COLUMN is_face_registered BOOLEAN DEFAULT 0"))

    if not inspector.has_table("settings"):
        return
    settings_columns = {column["name"] for column in inspector.get_columns("settings")}
    with engine.begin() as connection:
        if "require_email_verification" not in settings_columns:
            connection.execute(text("ALTER TABLE settings ADD COLUMN require_email_verification BOOLEAN DEFAULT 0"))
        if "allow_self_registration" not in settings_columns:
            connection.execute(text("ALTER TABLE settings ADD COLUMN allow_self_registration BOOLEAN DEFAULT 1"))
        if "default_role" not in settings_columns:
            connection.execute(text("ALTER TABLE settings ADD COLUMN default_role VARCHAR(20) DEFAULT 'student'"))
        if "face_detection_sensitivity" not in settings_columns:
            connection.execute(text("ALTER TABLE settings ADD COLUMN face_detection_sensitivity FLOAT DEFAULT 0.7"))
        if "role_permissions" not in settings_columns:
            connection.execute(text("ALTER TABLE settings ADD COLUMN role_permissions TEXT DEFAULT '{\"admin\":[\"all\"],\"faculty\":[\"students\",\"attendance\",\"reports\"],\"student\":[\"attendance\",\"profile\"]}'"))


ensure_schema_columns()

app = FastAPI(title="AI Attendance Management System", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(students_router.router, prefix="/students", tags=["students"])
app.include_router(attendance_router.router, prefix="/attendance", tags=["attendance"])
app.include_router(reports_router.router, prefix="/reports", tags=["reports"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning("HTTP %s for %s: %s", exc.status_code, request.url.path, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error for %s: %s", request.url.path, exc)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error for %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": str(exc) or "Internal server error"})


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    seed_data()


def seed_data():
    db = next(get_db())
    try:
        if not db.query(User).count():
            db.add(User(name="Admin", email="admin@example.com", password_hash=get_password_hash("Admin123!"), role="admin"))

        department = db.query(Department).filter(Department.code == "CSE").first()
        if not department:
            db.add(Department(name="Computer Science", code="CSE"))
            db.add(Department(name="Mechanical", code="MEC"))
        subject = db.query(Subject).filter(Subject.code == "DSA").first()
        if not subject:
            cs_dept = db.query(Department).filter(Department.code == "CSE").first()
            if cs_dept:
                db.add(Subject(name="Data Structures", code="DSA", department_id=cs_dept.id))
        settings = db.query(Settings).first()
        if not settings:
            db.add(Settings())

        # seed a sample faculty user + faculty record
        faculty_user = db.query(User).filter(User.email == "faculty@example.com").first()
        if not faculty_user:
            faculty_user = User(name="Faculty One", email="faculty@example.com", password_hash=get_password_hash("Faculty123!"), role="faculty")
            db.add(faculty_user)
            db.commit()
            db.refresh(faculty_user)

        faculty_rec = db.query(Faculty).filter(Faculty.user_id == faculty_user.id).first()
        if not faculty_rec:
            # associate with existing subject if possible
            subj = db.query(Subject).first()
            faculty_rec = Faculty(full_name=faculty_user.name, email=faculty_user.email, department=(subj.department_id if subj else "CSE"), subject=(subj.name if subj else "Data Structures"), user_id=faculty_user.id)
            db.add(faculty_rec)

        # seed a sample student
        sample_student = db.query(Student).filter(Student.register_number == "S1001").first()
        if not sample_student:
            db.add(Student(register_number="S1001", full_name="Test Student", department="Computer Science", year="1", section="A"))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Seeding failed: %s", exc)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "AI Attendance Management API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


