import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Route imports
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import attendanceRouter from "./routes/attendance";
import leavesRouter from "./routes/leaves";

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: "*" })); // Allow all for local integration ease
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Endpoints
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leavesRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Express Backend running on port ${PORT}`);
});
