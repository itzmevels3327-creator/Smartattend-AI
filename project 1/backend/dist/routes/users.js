"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Validate helper
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 */
router.get("/profile", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const user = await db_1.default.user.findUnique({
            where: { id: req.user.id },
            include: {
                studentProfile: {
                    include: {
                        department: true,
                        class: true,
                    },
                },
                facultyProfile: {
                    include: {
                        department: true,
                    },
                },
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        // Sanitize password hash
        const { passwordHash, ...safeUser } = user;
        return res.json(safeUser);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   GET /api/users/students
 * @desc    Get list of all students (Admin & Faculty)
 */
router.get("/students", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN", "FACULTY"]), async (req, res) => {
    try {
        const students = await db_1.default.studentProfile.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                department: true,
                class: true,
            },
        });
        return res.json(students);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error retrieving students" });
    }
});
/**
 * @route   POST /api/users/students
 * @desc    Create a new student (Admin only)
 */
router.post("/students", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("rollNumber").notEmpty().withMessage("Roll number is required"),
    (0, express_validator_1.body)("departmentId").notEmpty().withMessage("Department ID is required"),
    (0, express_validator_1.body)("classId").optional(),
], validate, async (req, res) => {
    try {
        const { email, name, rollNumber, departmentId, classId, currentSemester } = req.body;
        // Check if user or rollNumber already exists
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const existingRoll = await db_1.default.studentProfile.findUnique({ where: { rollNumber } });
        if (existingRoll) {
            return res.status(400).json({ error: "Roll number already exists" });
        }
        // Default temporary password: "student123"
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash("student123", salt);
        // Create User and StudentProfile in transaction
        const result = await db_1.default.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: "STUDENT",
                },
            });
            const newProfile = await tx.studentProfile.create({
                data: {
                    userId: newUser.id,
                    rollNumber,
                    departmentId,
                    classId: classId || null,
                    currentSemester: currentSemester ? parseInt(currentSemester) : 1,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return newProfile;
        });
        return res.status(201).json(result);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error creating student" });
    }
});
/**
 * @route   POST /api/users/students/bulk-import
 * @desc    Bulk import students (Admin only)
 */
router.post("/students/bulk-import", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("students").isArray({ min: 1 }).withMessage("Students array is required"),
], validate, async (req, res) => {
    try {
        const { students } = req.body; // Array of objects with email, name, rollNumber, departmentId, classId, currentSemester
        let importedCount = 0;
        let skippedCount = 0;
        const errorsList = [];
        const salt = await bcryptjs_1.default.genSalt(10);
        const defaultPasswordHash = await bcryptjs_1.default.hash("student123", salt);
        for (const item of students) {
            const { email, name, rollNumber, departmentCode, classId, currentSemester } = item;
            try {
                if (!email || !name || !rollNumber || !departmentCode) {
                    errorsList.push(`Skipped roll number: ${rollNumber || "Unknown"} (Missing required fields)`);
                    skippedCount++;
                    continue;
                }
                // Find department
                const dept = await db_1.default.department.findFirst({
                    where: {
                        OR: [
                            { id: departmentCode },
                            { code: departmentCode }
                        ]
                    }
                });
                if (!dept) {
                    errorsList.push(`Skipped roll number: ${rollNumber} (Department code ${departmentCode} not found)`);
                    skippedCount++;
                    continue;
                }
                // Check if exists
                const existingUser = await db_1.default.user.findUnique({ where: { email } });
                const existingRoll = await db_1.default.studentProfile.findUnique({ where: { rollNumber } });
                if (existingUser || existingRoll) {
                    errorsList.push(`Skipped roll number: ${rollNumber} (User email or roll number already exists)`);
                    skippedCount++;
                    continue;
                }
                await db_1.default.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: {
                            email,
                            name,
                            passwordHash: defaultPasswordHash,
                            role: "STUDENT",
                        },
                    });
                    await tx.studentProfile.create({
                        data: {
                            userId: newUser.id,
                            rollNumber,
                            departmentId: dept.id,
                            classId: classId || null,
                            currentSemester: currentSemester ? parseInt(currentSemester) : 1,
                        },
                    });
                });
                importedCount++;
            }
            catch (err) {
                errorsList.push(`Error on roll number ${rollNumber || "Unknown"}: ${err.message}`);
                skippedCount++;
            }
        }
        await db_1.default.auditLog.create({
            data: {
                userId: req.user?.id,
                action: "BULK_STUDENTS_IMPORT",
                details: `Imported ${importedCount} students, skipped ${skippedCount}`,
                ipAddress: req.ip,
            },
        });
        return res.json({
            message: "Bulk import completed",
            importedCount,
            skippedCount,
            errors: errorsList,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error importing students" });
    }
});
/**
 * @route   GET /api/users/faculty
 * @desc    Get all faculty members
 */
router.get("/faculty", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), async (req, res) => {
    try {
        const faculty = await db_1.default.facultyProfile.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                department: true,
            },
        });
        return res.json(faculty);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error retrieving faculty" });
    }
});
/**
 * @route   POST /api/users/faculty
 * @desc    Create a new faculty member (Admin only)
 */
router.post("/faculty", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("employeeId").notEmpty().withMessage("Employee ID is required"),
    (0, express_validator_1.body)("departmentId").notEmpty().withMessage("Department ID is required"),
    (0, express_validator_1.body)("designation").notEmpty().withMessage("Designation is required"),
], validate, async (req, res) => {
    try {
        const { email, name, employeeId, departmentId, designation } = req.body;
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const existingEmp = await db_1.default.facultyProfile.findUnique({ where: { employeeId } });
        if (existingEmp) {
            return res.status(400).json({ error: "Employee ID already exists" });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash("faculty123", salt);
        const result = await db_1.default.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: "FACULTY",
                },
            });
            const newProfile = await tx.facultyProfile.create({
                data: {
                    userId: newUser.id,
                    employeeId,
                    departmentId,
                    designation,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return newProfile;
        });
        return res.status(201).json(result);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error creating faculty" });
    }
});
/**
 * @route   GET /api/users/departments
 * @desc    Get all departments
 */
router.get("/departments", auth_1.authenticateToken, async (req, res) => {
    try {
        const departments = await db_1.default.department.findMany({
            include: {
                _count: {
                    select: {
                        students: true,
                        faculties: true,
                    },
                },
            },
        });
        return res.json(departments);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   POST /api/users/departments
 * @desc    Create department (Admin only)
 */
router.post("/departments", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Department name is required"),
    (0, express_validator_1.body)("code").notEmpty().withMessage("Department code is required"),
], validate, async (req, res) => {
    try {
        const { name, code } = req.body;
        const existing = await db_1.default.department.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: "Department code already exists" });
        }
        const department = await db_1.default.department.create({
            data: { name, code: code.toUpperCase() },
        });
        return res.status(201).json(department);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   GET /api/users/courses
 * @desc    Get all courses
 */
router.get("/courses", auth_1.authenticateToken, async (req, res) => {
    try {
        const courses = await db_1.default.course.findMany({
            include: { department: true },
        });
        return res.json(courses);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   POST /api/users/courses
 * @desc    Create course (Admin only)
 */
router.post("/courses", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Course name is required"),
    (0, express_validator_1.body)("code").notEmpty().withMessage("Course code is required"),
    (0, express_validator_1.body)("departmentId").notEmpty().withMessage("Department ID is required"),
], validate, async (req, res) => {
    try {
        const { name, code, departmentId } = req.body;
        const existing = await db_1.default.course.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: "Course code already exists" });
        }
        const course = await db_1.default.course.create({
            data: { name, code: code.toUpperCase(), departmentId },
        });
        return res.status(201).json(course);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   GET /api/users/classes
 * @desc    Get all classes
 */
router.get("/classes", auth_1.authenticateToken, async (req, res) => {
    try {
        const classes = await db_1.default.class.findMany({
            include: {
                _count: {
                    select: { students: true },
                },
            },
        });
        return res.json(classes);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   POST /api/users/classes
 * @desc    Create a class (Admin only)
 */
router.post("/classes", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Class name is required"),
    (0, express_validator_1.body)("departmentId").notEmpty().withMessage("Department is required"),
    (0, express_validator_1.body)("semester").isInt({ min: 1 }).withMessage("Semester must be a positive integer"),
], validate, async (req, res) => {
    try {
        const { name, departmentId, semester } = req.body;
        const newClass = await db_1.default.class.create({
            data: {
                name,
                departmentId,
                semester: parseInt(semester),
            },
        });
        return res.status(201).json(newClass);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   GET /api/users/subjects
 * @desc    Get all subjects
 */
router.get("/subjects", auth_1.authenticateToken, async (req, res) => {
    try {
        const subjects = await db_1.default.subject.findMany({
            include: {
                course: true,
                faculty: {
                    include: {
                        user: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
        return res.json(subjects);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
/**
 * @route   POST /api/users/subjects
 * @desc    Create a subject (Admin only)
 */
router.post("/subjects", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN"]), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Subject name is required"),
    (0, express_validator_1.body)("code").notEmpty().withMessage("Subject code is required"),
    (0, express_validator_1.body)("courseId").notEmpty().withMessage("Course ID is required"),
    (0, express_validator_1.body)("facultyId").optional(),
], validate, async (req, res) => {
    try {
        const { name, code, courseId, facultyId, credits } = req.body;
        const existing = await db_1.default.subject.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: "Subject code already exists" });
        }
        const subject = await db_1.default.subject.create({
            data: {
                name,
                code: code.toUpperCase(),
                courseId,
                facultyId: facultyId || null,
                credits: credits ? parseInt(credits) : 3,
            },
        });
        return res.status(201).json(subject);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
