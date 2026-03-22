import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { errorHandler } from "./middleware/auth";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import cvRoutes from "./routes/cv";
import formsRoutes from "./routes/forms";
import matchingRoutes from "./routes/matching";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads as static files
app.use("/uploads", express.static(uploadsDir));

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

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
