"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super-secret-refresh-jwt-key-change-this-in-production";
// Validator middleware helper
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Usually Admins create users, but we allow signup for demo/superadmin initialization)
 */
router.post("/register", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Enter a valid email"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("role").isIn(["SUPERADMIN", "ADMIN", "FACULTY", "STUDENT"]).withMessage("Invalid role"),
], validate, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        // Check if user already exists
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email" });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Create user
        const user = await db_1.default.user.create({
            data: {
                email,
                passwordHash,
                name,
                role,
            },
        });
        // Write audit log
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: "USER_REGISTRATION",
                details: `User registered with role ${role}`,
                ipAddress: req.ip,
            },
        });
        return res.status(201).json({
            message: "User registered successfully",
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during registration" });
    }
});
/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 */
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Enter a valid email"),
    (0, express_validator_1.body)("password").exists().withMessage("Password is required"),
], validate, async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = await db_1.default.user.findUnique({
            where: { email },
            include: {
                studentProfile: true,
                facultyProfile: true,
            },
        });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        // Generate JWT
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "1d" });
        const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        // Write audit log
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: "USER_LOGIN",
                details: "User successfully logged in via email/password",
                ipAddress: req.ip,
            },
        });
        // Get profile details
        let profileId = null;
        if (user.role === "STUDENT" && user.studentProfile) {
            profileId = user.studentProfile.id;
        }
        else if (user.role === "FACULTY" && user.facultyProfile) {
            profileId = user.facultyProfile.id;
        }
        return res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatarUrl: user.avatarUrl,
                profileId,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during login" });
    }
});
/**
 * @route   POST /api/auth/google
 * @desc    Sign-in or register using Google credentials (mocked)
 */
router.post("/google", [(0, express_validator_1.body)("idToken").notEmpty().withMessage("idToken is required")], validate, async (req, res) => {
    try {
        const { idToken, email, name, role } = req.body;
        // Simulate Google token decoding
        // In production, we'd verify the token using google-auth-library
        let userEmail = email || "googleuser@institution.edu";
        let userName = name || "Google User";
        let userRole = role || "STUDENT"; // default to student
        let user = await db_1.default.user.findUnique({
            where: { email: userEmail },
            include: {
                studentProfile: true,
                facultyProfile: true,
            },
        });
        if (!user) {
            // Create user with a dummy password
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(Math.random().toString(36), salt);
            user = await db_1.default.user.create({
                data: {
                    email: userEmail,
                    name: userName,
                    passwordHash,
                    role: userRole,
                },
                include: {
                    studentProfile: true,
                    facultyProfile: true,
                },
            });
        }
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "1d" });
        const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: "USER_LOGIN_GOOGLE",
                details: "User successfully logged in via Google Authentication",
                ipAddress: req.ip,
            },
        });
        let profileId = null;
        if (user.role === "STUDENT" && user.studentProfile) {
            profileId = user.studentProfile.id;
        }
        else if (user.role === "FACULTY" && user.facultyProfile) {
            profileId = user.facultyProfile.id;
        }
        return res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                profileId,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during Google sign-in" });
    }
});
/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 */
router.post("/refresh", [(0, express_validator_1.body)("refreshToken").notEmpty().withMessage("Refresh token is required")], validate, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: "Invalid or expired refresh token" });
            }
            const payload = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                name: decoded.name,
            };
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "1d" });
            return res.json({ token });
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during token refresh" });
    }
});
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Forgot Password - request password reset link (simulated)
 */
router.post("/forgot-password", [(0, express_validator_1.body)("email").isEmail().withMessage("Enter a valid email")], validate, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            // Return 200 to prevent user enumeration
            return res.json({ message: "If the email is registered, a password reset link has been sent." });
        }
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: "PASSWORD_RESET_REQUESTED",
                details: `Password reset requested for email ${email}`,
                ipAddress: req.ip,
            },
        });
        return res.json({
            message: "If the email is registered, a password reset link has been sent.",
            // We output a mock token in development so developers/users can test the workflow
            resetToken: jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" }),
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during forgot password" });
    }
});
/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password (simulated verification of token)
 */
router.post("/reset-password", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("Reset token is required"),
    (0, express_validator_1.body)("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
], validate, async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }
        const userId = decoded.id;
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        await db_1.default.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: "PASSWORD_RESET_SUCCESS",
                details: "Password was reset successfully",
                ipAddress: req.ip,
            },
        });
        return res.json({ message: "Password has been reset successfully." });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error during password reset" });
    }
});
/**
 * @route   POST /api/auth/verify-email
 * @desc    Email verification (simulated)
 */
router.post("/verify-email", async (req, res) => {
    return res.json({ message: "Email verified successfully." });
});
exports.default = router;
