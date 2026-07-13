"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const leaves_1 = __importDefault(require("./routes/leaves"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: "*" })); // Allow all for local integration ease
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// Request logging
app.use((0, morgan_1.default)("dev"));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);
// Endpoints
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/attendance", attendance_1.default);
app.use("/api/leaves", leaves_1.default);
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date(),
        environment: process.env.NODE_ENV || "development",
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});
app.listen(PORT, () => {
    console.log(`Express Backend running on port ${PORT}`);
});
