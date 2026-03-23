import dotenv from "dotenv";
import path from "path";

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });

import express from "express";
import cors from "cors";
import { errorHandler } from "../server/src/middleware/auth";

import authRoutes from "../server/src/routes/auth";
import userRoutes from "../server/src/routes/users";
import cvRoutes from "../server/src/routes/cv";
import formsRoutes from "../server/src/routes/forms";
import matchingRoutes from "../server/src/routes/matching";
import adminRoutes from "../server/src/routes/admin";

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

export default app;
