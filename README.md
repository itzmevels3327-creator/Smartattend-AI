# AI Powered Attendance Management System

A full-stack attendance management experience with a premium React + Tailwind frontend, a FastAPI backend, JWT authentication, and a lightweight AI face-based attendance workflow.

## Features
- Secure JWT authentication for admin, faculty, and student roles
- Student management and face registration workflow
- Attendance marking and attendance history
- Reports summary and dashboard analytics
- Modern responsive UI with glassmorphism and animated cards

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, Framer Motion, React Router
- Backend: FastAPI, SQLAlchemy, JWT, OpenCV, NumPy
- Database: SQLite by default, PostgreSQL ready via `DATABASE_URL`

## Quick Start
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Account Setup
Create the first admin user through the authentication registration flow or by inserting a secure user into the database.

## API Notes
- Health check: `/health`
- Auth: `/auth/login`, `/auth/register`, `/auth/me`
- Students: `/students`
- Attendance: `/attendance/mark`, `/attendance/today`
- Reports: `/reports/summary`
