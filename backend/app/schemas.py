from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    code: str


class SubjectCreate(BaseModel):
    name: str
    code: str
    department_id: int


class FacultyCreate(BaseModel):
    full_name: str
    email: EmailStr
    department: str
    subject: str


class StudentCreate(BaseModel):
    register_number: str
    full_name: str
    department: str
    year: str
    section: str


class StudentOut(BaseModel):
    id: int
    register_number: str
    full_name: str
    department: str
    year: str
    section: str
    image: Optional[str] = None
    face_embedding: Optional[str] = None
    face_encoding: Optional[str] = None
    face_image: Optional[str] = None
    face_registered_at: Optional[datetime] = None
    is_face_registered: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    student_id: int
    faculty_id: int | None = None
    subject_id: int
    confidence: float = 0.0
    method: str = "face"


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    faculty_id: int
    subject_id: int
    status: str
    confidence: float
    method: str
    checked_at: datetime

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    timezone: Optional[str] = None
    attendance_window_minutes: Optional[int] = None
    enable_face_detection: Optional[bool] = None
    enable_anti_spoof: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    allow_self_registration: Optional[bool] = None
    default_role: Optional[str] = None
    face_detection_sensitivity: Optional[float] = None
    role_permissions: Optional[dict] = None
