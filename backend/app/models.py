import datetime as dt
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(20), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False, unique=True)
    department = Column(String(120), nullable=False)
    subject = Column(String(120), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    register_number = Column(String(50), nullable=False, unique=True)
    full_name = Column(String(120), nullable=False)
    department = Column(String(120), nullable=False)
    year = Column(String(20), nullable=False)
    section = Column(String(20), nullable=False)
    image = Column(String(255), nullable=True)
    # Legacy fields
    face_embedding = Column(Text, nullable=True)
    # New face registration fields
    face_encoding = Column(Text, nullable=True)
    face_image = Column(String(255), nullable=True)
    face_registered_at = Column(DateTime, nullable=True)
    is_face_registered = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    status = Column(String(20), default="present")
    checked_at = Column(DateTime, default=dt.datetime.utcnow)
    confidence = Column(Float, default=0.0)
    method = Column(String(20), default="face")
    image_path = Column(String(255), nullable=True)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(120), default="AI Attendance Suite")
    timezone = Column(String(80), default="UTC")
    attendance_window_minutes = Column(Integer, default=30)
    enable_face_detection = Column(Boolean, default=True)
    enable_anti_spoof = Column(Boolean, default=True)
    require_email_verification = Column(Boolean, default=False)
    allow_self_registration = Column(Boolean, default=True)
    default_role = Column(String(20), default="student")
    face_detection_sensitivity = Column(Float, default=0.7)
    role_permissions = Column(Text, default='{"admin":["all"],"faculty":["students","attendance","reports"],"student":["attendance","profile"]}')
