import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { scoreCV } from "./scorer";
import { ErrorResponse } from "./types";

const app = express();
const PORT = parseInt(process.env.PORT || "5001", 10);
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "5", 10);

// Create uploads directory on startup
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Startup warnings
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[WARNING] ANTHROPIC_API_KEY is not set — Claude API calls will fail");
}
if (!SERVICE_API_KEY) {
  console.warn("[WARNING] SERVICE_API_KEY is not set — running in dev mode (no auth required)");
}

// API key auth middleware
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!SERVICE_API_KEY) {
    // Dev mode: allow without key
    next();
    return;
  }

  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey || apiKey !== SERVICE_API_KEY) {
    const err: ErrorResponse = {
      error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" },
    };
    res.status(401).json(err);
    return;
  }

  next();
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

// GET /health — no auth
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "cv-scoring",
    model: process.env.SCORING_MODEL || "claude-sonnet-4-20250514",
    timestamp: new Date().toISOString(),
  });
});

// POST /score-cv — requireApiKey
app.post(
  "/score-cv",
  requireApiKey,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("cv")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            error: {
              code: "FILE_TOO_LARGE",
              message: `File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB`,
            },
          } as ErrorResponse);
          return;
        }
        if (err.message === "INVALID_FILE_TYPE") {
          res.status(400).json({
            error: {
              code: "INVALID_FILE_TYPE",
              message: "Only PDF files are accepted",
            },
          } as ErrorResponse);
          return;
        }
        next(err);
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        error: { code: "NO_FILE", message: "No file uploaded. Use form field 'cv'" },
      } as ErrorResponse);
      return;
    }

    try {
      const result = await scoreCV({
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[score-cv] Unexpected error:", err);
      res.status(500).json({
        error: { code: "SCORING_FAILED", message: "Failed to score CV" },
      } as ErrorResponse);
    }
  }
);

app.listen(PORT, () => {
  console.log(`CV Scoring service running on http://localhost:${PORT}`);
});

export default app;
