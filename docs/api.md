# API Documentation

## Authentication
- POST /auth/login
- POST /auth/register
- GET /auth/me
- POST /auth/logout

## Students
- GET /students
- POST /students
- PUT /students/{student_id}
- DELETE /students/{student_id}
- POST /students/{student_id}/register-face

## Attendance
- POST /attendance/mark
- GET /attendance/today
- GET /attendance/history

## Reports
- GET /reports/summary

## Settings
- GET /settings
- PUT /settings
