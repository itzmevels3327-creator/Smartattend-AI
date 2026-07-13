import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, requireRoles, AuthRequest } from "../middleware/auth";
import { body, validationResult } from "express-validator";

const router = Router();

const validate = (req: any, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   GET /api/leaves
 * @desc    Fetch leave requests (filtered by user context)
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let leaves;

    if (req.user?.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!student) return res.status(404).json({ error: "Student profile not found" });

      leaves = await prisma.leaveRequest.findMany({
        where: { studentId: student.id },
        include: {
          approvedBy: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (req.user?.role === "FACULTY") {
      const faculty = await prisma.facultyProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!faculty) return res.status(404).json({ error: "Faculty profile not found" });

      // Faculty sees leaves from students in their department
      leaves = await prisma.leaveRequest.findMany({
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
    } else {
      // Admin sees everything
      leaves = await prisma.leaveRequest.findMany({
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
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Server error fetching leaves." });
  }
});

/**
 * @route   POST /api/leaves
 * @desc    Submit a leave request (Student only)
 */
router.post(
  "/",
  authenticateToken,
  requireRoles(["STUDENT"]),
  [
    body("startDate").isDate().withMessage("Start date is required"),
    body("endDate").isDate().withMessage("End date is required"),
    body("reason").notEmpty().withMessage("Reason is required"),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, reason } = req.body;

      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user?.id },
      });

      if (!student) return res.status(404).json({ error: "Student profile not found" });

      const leave = await prisma.leaveRequest.create({
        data: {
          studentId: student.id,
          startDate,
          endDate,
          reason,
          status: "PENDING",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "LEAVE_SUBMITTED",
          details: `Leave requested from ${startDate} to ${endDate}`,
          ipAddress: req.ip,
        },
      });

      return res.status(201).json(leave);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Server error creating leave request." });
    }
  }
);

/**
 * @route   POST /api/leaves/:id/approve
 * @desc    Approve or reject a leave request (Faculty & Admin)
 */
router.post(
  "/:id/approve",
  authenticateToken,
  requireRoles(["SUPERADMIN", "ADMIN", "FACULTY"]),
  [body("status").isIn(["APPROVED", "REJECTED"]).withMessage("Invalid status")],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found." });
      }

      let facultyProfileId = null;
      if (req.user?.role === "FACULTY") {
        const faculty = await prisma.facultyProfile.findUnique({
          where: { userId: req.user.id },
        });
        if (!faculty) return res.status(403).json({ error: "Faculty profile required" });
        facultyProfileId = faculty.id;
      }

      const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedById: facultyProfileId, // If admin approves, approvedById can be null or we can keep it as is
        },
      });

      // Write audit log
      await prisma.auditLog.create({
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
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Server error approving leave." });
    }
  }
);

export default router;
