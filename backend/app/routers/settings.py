import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Settings, User
from ..schemas import SettingsUpdate
from .auth import get_current_user

router = APIRouter()


def serialize_settings(settings: Settings):
    payload = {
        "id": settings.id,
        "company_name": settings.company_name,
        "timezone": settings.timezone,
        "attendance_window_minutes": settings.attendance_window_minutes,
        "enable_face_detection": settings.enable_face_detection,
        "enable_anti_spoof": settings.enable_anti_spoof,
        "require_email_verification": settings.require_email_verification,
        "allow_self_registration": settings.allow_self_registration,
        "default_role": settings.default_role,
        "face_detection_sensitivity": settings.face_detection_sensitivity,
        "role_permissions": {},
    }
    if settings.role_permissions:
        try:
            payload["role_permissions"] = json.loads(settings.role_permissions)
        except Exception:
            payload["role_permissions"] = {}
    return payload


@router.get("")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return serialize_settings(settings)


@router.put("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "role_permissions":
            setattr(settings, key, json.dumps(value) if value is not None else None)
        else:
            setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return serialize_settings(settings)
