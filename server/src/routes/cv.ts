import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { triggerCvScoring } from "../services/cvScoring";

const uploadDir = process.env.UPLOAD_DIR || "uploads";

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userDir = path.join(uploadDir, req.user!.id);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

// POST /api/cv/upload
router.post(
  "/upload",
  requireAuth,
  (req: AuthRequest, res: Response, next) => {
    if (req.user!.role !== "PGP1") {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Only PGP1 students can upload CVs" },
      });
      return;
    }
    next();
  },
  upload.single("cv"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: { code: "NO_FILE", message: "No file uploaded" },
        });
        return;
      }

      // Deactivate all previous CvUploads for this user
      await prisma.cvUpload.updateMany({
        where: { userId: req.user!.id, isActive: true },
        data: { isActive: false },
      });

      // Create new CvUpload record
      const cvUpload = await prisma.cvUpload.create({
        data: {
          userId: req.user!.id,
          filePath: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          cvScore: null,
          isActive: true,
        },
      });

      // Trigger CV scoring (non-blocking, never crash upload if it fails)
      triggerCvScoring(cvUpload.id, req.file.path).catch((err) => {
        console.error("CV scoring trigger failed (non-blocking):", err);
      });

      res.status(201).json(cvUpload);
    } catch (err) {
      console.error("CV upload error:", err);
      res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to upload CV" } });
    }
  }
);

// GET /api/cv/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cvUpload = await prisma.cvUpload.findFirst({
      where: { userId: req.user!.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!cvUpload) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "No active CV found" },
      });
      return;
    }

    res.json(cvUpload);
  } catch (err) {
    console.error("Get CV error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch CV" } });
  }
});

export default router;
