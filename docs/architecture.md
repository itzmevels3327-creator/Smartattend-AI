# Architecture Overview

The system uses a clean three-layer approach:
- Frontend: React + Vite + Tailwind for the polished dashboard experience
- Backend: FastAPI with SQLAlchemy for business logic and data access
- AI Layer: OpenCV-based face detection and simple embedding comparison for registration and recognition workflow

## Flow
1. User authenticates through JWT-backed login
2. Admin or faculty manages students and attendance
3. Face registration uploads images and stores embeddings
4. Attendance marking checks for duplicate entries and records attendance
5. Reports and dashboards aggregate records and present analytics
