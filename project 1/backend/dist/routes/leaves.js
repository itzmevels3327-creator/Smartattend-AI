"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
/**
 * @route   GET /api/leaves
 * @desc    Fetch leave requests (filtered by user context)
 */
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        let leaves;
        if (req.user?.role === "STUDENT") {
            const student = await db_1.default.studentProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!student)
                return res.status(404).json({ error: "Student profile not found" });
            leaves = await db_1.default.leaveRequest.findMany({
                where: { studentId: student.id },
                include: {
                    approvedBy: { include: { user: { select: { name: true } } } },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        else if (req.user?.role === "FACULTY") {
            const faculty = await db_1.default.facultyProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!faculty)
                return res.status(404).json({ error: "Faculty profile not found" });
            // Faculty sees leaves from students in their department
            leaves = await db_1.default.leaveRequest.findMany({
                where: {
                    student: {
                        departmentId: faculty.departmentId,
                    },
                },
                include: {
                    student: {
                        include: {
                            user: { select: { name: true } },
                        },
                    },
                    approvedBy: { include: { user: { select: { name: true } } } },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        else {
            // Admin sees everything
            leaves = await db_1.default.leaveRequest.findMany({
                include: {
                    student: {
                        include: {
                            user: { select: { name: true } },
                        },
                    },
                    approvedBy: { include: { user: { select: { name: true } } } },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        return res.json(leaves);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error fetching leaves." });
    }
});
/**
 * @route   POST /api/leaves
 * @desc    Submit a leave request (Student only)
 */
router.post("/", auth_1.authenticateToken, (0, auth_1.requireRoles)(["STUDENT"]), [
    (0, express_validator_1.body)("startDate").isDate().withMessage("Start date is required"),
    (0, express_validator_1.body)("endDate").isDate().withMessage("End date is required"),
    (0, express_validator_1.body)("reason").notEmpty().withMessage("Reason is required"),
], validate, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;
        const student = await db_1.default.studentProfile.findUnique({
            where: { userId: req.user?.id },
        });
        if (!student)
            return res.status(404).json({ error: "Student profile not found" });
        const leave = await db_1.default.leaveRequest.create({
            data: {
                studentId: student.id,
                startDate,
                endDate,
                reason,
                status: "PENDING",
            },
        });
        await db_1.default.auditLog.create({
            data: {
                userId: req.user?.id,
                action: "LEAVE_SUBMITTED",
                details: `Leave requested from ${startDate} to ${endDate}`,
                ipAddress: req.ip,
            },
        });
        return res.status(201).json(leave);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error creating leave request." });
    }
});
/**
 * @route   POST /api/leaves/:id/approve
 * @desc    Approve or reject a leave request (Faculty & Admin)
 */
router.post("/:id/approve", auth_1.authenticateToken, (0, auth_1.requireRoles)(["SUPERADMIN", "ADMIN", "FACULTY"]), [(0, express_validator_1.body)("status").isIn(["APPROVED", "REJECTED"]).withMessage("Invalid status")], validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const leave = await db_1.default.leaveRequest.findUnique({ where: { id } });
        if (!leave) {
            return res.status(404).json({ error: "Leave request not found." });
        }
        let facultyProfileId = null;
        if (req.user?.role === "FACULTY") {
            const faculty = await db_1.default.facultyProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!faculty)
                return res.status(403).json({ error: "Faculty profile required" });
            facultyProfileId = faculty.id;
        }
        const updated = await db_1.default.leaveRequest.update({
            where: { id },
            data: {
                status,
                approvedById: facultyProfileId, // If admin approves, approvedById can be null or we can keep it as is
            },
        });
        // Write audit log
        await db_1.default.auditLog.create({
            data: {
                userId: req.user?.id,
                action: `LEAVE_${status}`,
                details: `Leave request ID ${id} was ${status.toLowerCase()}`,
                ipAddress: req.ip,
            },
        });
        return res.json({
            success: true,
            message: `Leave request has been ${status.toLowerCase()}`,
            leave: updated,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error approving leave." });
    }
});
exports.default = router;
