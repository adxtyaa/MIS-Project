import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";
import { runMatchingAlgorithm } from "../services/matching";

const router = Router();

// POST /api/matching/run — requireAdmin
router.post("/run", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const windowDate = req.body.windowDate
      ? new Date(req.body.windowDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const result = await runMatchingAlgorithm(windowDate);
    res.json(result);
  } catch (err) {
    console.error("Matching run error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to run matching" } });
  }
});

// GET /api/matching/results — requireAuth (admin: all, users: own only)
router.get("/results", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const where = req.user!.isAdmin
      ? {}
      : req.user!.role === "PGP1"
        ? { pgp1Id: req.user!.id }
        : { pgp2Id: req.user!.id };

    const matches = await prisma.match.findMany({
      where,
      orderBy: { windowDate: "desc" },
      include: {
        pgp1: { select: { id: true, name: true, email: true, pgpId: true } },
        pgp2: { select: { id: true, name: true, email: true, pgpId: true } },
      },
    });

    res.json(matches);
  } catch (err) {
    console.error("Matching results error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch results" } });
  }
});

export default router;
