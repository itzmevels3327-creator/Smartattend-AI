"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding started...");
    // Clean database
    await prisma.attendanceRecord.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.course.deleteMany();
    await prisma.class.deleteMany();
    await prisma.facultyProfile.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.holiday.deleteMany();
    await prisma.auditLog.deleteMany();
    // 1. Create Departments
    const cseDept = await prisma.department.create({
        data: { name: "Computer Science & Engineering", code: "CSE" },
    });
    const eceDept = await prisma.department.create({
        data: { name: "Electronics & Communication", code: "ECE" },
    });
    // 2. Create Courses
    const btechCSE = await prisma.course.create({
        data: { name: "B.Tech Computer Science", code: "CS-BTECH", departmentId: cseDept.id },
    });
    const btechECE = await prisma.course.create({
        data: { name: "B.Tech Electronics", code: "EC-BTECH", departmentId: eceDept.id },
    });
    // 3. Create Classes
    const classA = await prisma.class.create({
        data: { name: "CSE - Semester 5 - Sec A", departmentId: cseDept.id, semester: 5 },
    });
    const classB = await prisma.class.create({
        data: { name: "ECE - Semester 5 - Sec A", departmentId: eceDept.id, semester: 5 },
    });
    // 4. Create Users (SuperAdmin, Admin, Faculty, Student)
    const salt = await bcryptjs_1.default.genSalt(10);
    const commonPasswordHash = await bcryptjs_1.default.hash("admin123", salt);
    const facultyPasswordHash = await bcryptjs_1.default.hash("faculty123", salt);
    const studentPasswordHash = await bcryptjs_1.default.hash("student123", salt);
    const adminUser = await prisma.user.create({
        data: {
            email: "admin@institution.edu",
            name: "Dr. Sarah Jenkins",
            passwordHash: commonPasswordHash,
            role: "ADMIN",
        },
    });
    const facultyUser = await prisma.user.create({
        data: {
            email: "faculty@institution.edu",
            name: "Prof. Alan Turing",
            passwordHash: facultyPasswordHash,
            role: "FACULTY",
        },
    });
    const studentUser1 = await prisma.user.create({
        data: {
            email: "student@institution.edu",
            name: "John Doe",
            passwordHash: studentPasswordHash,
            role: "STUDENT",
        },
    });
    const studentUser2 = await prisma.user.create({
        data: {
            email: "jane@institution.edu",
            name: "Jane Smith",
            passwordHash: studentPasswordHash,
            role: "STUDENT",
        },
    });
    // 5. Create Profiles
    const facultyProfile = await prisma.facultyProfile.create({
        data: {
            userId: facultyUser.id,
            employeeId: "EMP-001",
            departmentId: cseDept.id,
            designation: "Senior Professor",
        },
    });
    const studentProfile1 = await prisma.studentProfile.create({
        data: {
            userId: studentUser1.id,
            rollNumber: "CS-2023-042",
            departmentId: cseDept.id,
            classId: classA.id,
            currentSemester: 5,
            faceRegistered: true,
            // Preset embedding for student
            faceEmbedding: JSON.stringify(Array(128).fill(0.01)),
        },
    });
    const studentProfile2 = await prisma.studentProfile.create({
        data: {
            userId: studentUser2.id,
            rollNumber: "CS-2023-085",
            departmentId: cseDept.id,
            classId: classA.id,
            currentSemester: 5,
            faceRegistered: false,
        },
    });
    // 6. Create Subjects
    const mlSubject = await prisma.subject.create({
        data: { name: "Machine Learning", code: "CS-501", credits: 4, courseId: btechCSE.id, facultyId: facultyProfile.id },
    });
    const cvSubject = await prisma.subject.create({
        data: { name: "Computer Vision", code: "CS-502", credits: 4, courseId: btechCSE.id, facultyId: facultyProfile.id },
    });
    const seSubject = await prisma.subject.create({
        data: { name: "Software Engineering", code: "CS-503", credits: 3, courseId: btechCSE.id, facultyId: facultyProfile.id },
    });
    // 7. Create Timetable
    await prisma.timetable.create({
        data: { classId: classA.id, subjectId: mlSubject.id, facultyId: facultyProfile.id, dayOfWeek: 1, startTime: "09:00", endTime: "10:30", room: "LHC-101" },
    });
    await prisma.timetable.create({
        data: { classId: classA.id, subjectId: cvSubject.id, facultyId: facultyProfile.id, dayOfWeek: 2, startTime: "11:00", endTime: "12:30", room: "LHC-102" },
    });
    await prisma.timetable.create({
        data: { classId: classA.id, subjectId: seSubject.id, facultyId: facultyProfile.id, dayOfWeek: 3, startTime: "14:00", endTime: "15:30", room: "LHC-101" },
    });
    // 8. Create Leave Request
    await prisma.leaveRequest.create({
        data: {
            studentId: studentProfile1.id,
            startDate: "2026-07-15",
            endDate: "2026-07-17",
            reason: "Family event and traveling out of station.",
            status: "PENDING",
        },
    });
    // 9. Generate Historical Attendance Records
    // Generate attendance records for past 30 days for CSE subjects
    console.log("Generating attendance records...");
    const statuses = ["PRESENT", "ABSENT", "LATE"];
    const methods = ["FACE", "MANUAL", "QR", "GPS"];
    for (let i = 30; i >= 1; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6)
            continue;
        const dateStr = d.toISOString().split("T")[0];
        // For ML (every Monday/Wednesday)
        if (d.getDay() === 1 || d.getDay() === 3) {
            // Student 1 (High Attendance)
            const p1 = Math.random();
            await prisma.attendanceRecord.create({
                data: {
                    date: dateStr,
                    dateTime: d,
                    status: p1 > 0.1 ? "PRESENT" : "ABSENT",
                    method: p1 > 0.1 ? "FACE" : "MANUAL",
                    studentId: studentProfile1.id,
                    subjectId: mlSubject.id,
                    classId: classA.id,
                    confidence: p1 > 0.1 ? 0.94 : null,
                },
            });
            // Student 2 (Lower Attendance - Risk Category)
            const p2 = Math.random();
            await prisma.attendanceRecord.create({
                data: {
                    date: dateStr,
                    dateTime: d,
                    status: p2 > 0.4 ? "PRESENT" : "ABSENT",
                    method: p2 > 0.4 ? "QR" : "MANUAL",
                    studentId: studentProfile2.id,
                    subjectId: mlSubject.id,
                    classId: classA.id,
                    confidence: null,
                },
            });
        }
        // For CV (every Tuesday)
        if (d.getDay() === 2) {
            const p1 = Math.random();
            await prisma.attendanceRecord.create({
                data: {
                    date: dateStr,
                    dateTime: d,
                    status: p1 > 0.15 ? "PRESENT" : "ABSENT",
                    method: p1 > 0.15 ? "FACE" : "MANUAL",
                    studentId: studentProfile1.id,
                    subjectId: cvSubject.id,
                    classId: classA.id,
                    confidence: 0.96,
                },
            });
            const p2 = Math.random();
            await prisma.attendanceRecord.create({
                data: {
                    date: dateStr,
                    dateTime: d,
                    status: p2 > 0.5 ? "PRESENT" : "ABSENT",
                    method: p2 > 0.5 ? "GPS" : "MANUAL",
                    studentId: studentProfile2.id,
                    subjectId: cvSubject.id,
                    classId: classA.id,
                    confidence: null,
                },
            });
        }
    }
    // 10. Audit Logs
    await prisma.auditLog.create({
        data: {
            userId: adminUser.id,
            action: "SYSTEM_INITIALIZED",
            details: "Database seeded with complete baseline demo data.",
        },
    });
    console.log("Seeding completed successfully!");
}
main()
    .catch((e) => {
    console.error("Seeding Error:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
