import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { recalculateSlotQualityScore } from "../jobs/recalculateScores";

const router = Router();

function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getYesterdayDate(): Date {
  const today = getTodayDate();
  return new Date(today.getTime() - 24 * 60 * 60 * 1000);
}

function isWindowOpen(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const openHour = parseInt(process.env.BOOKING_WINDOW_OPEN_HOUR || "9", 10);
  const closeHour = parseInt(process.env.BOOKING_WINDOW_CLOSE_HOUR || "17", 10);
  return hour >= openHour && hour < closeHour;
}

function windowClosedResponse(res: Response): void {
  res.status(403).json({
    error: { code: "WINDOW_CLOSED", message: "Booking window is currently closed" },
  });
}

// POST /api/forms/supply — PGP2 only
router.post("/supply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "PGP2") {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Only PGP2 students can submit supply forms" } });
      return;
    }

    if (!isWindowOpen()) {
      windowClosedResponse(res);
      return;
    }

    const today = getTodayDate();

    const existing = await prisma.supplyForm.findUnique({
      where: { userId_windowDate: { userId: req.user!.id, windowDate: today } },
    });

    if (existing && !existing.isRetracted) {
      res.status(409).json({ error: { code: "DUPLICATE_SUBMISSION", message: "You have already submitted a supply form today" } });
      return;
    }

    let form;
    if (existing && existing.isRetracted) {
      form = await prisma.supplyForm.update({
        where: { id: existing.id },
        data: { isRetracted: false },
      });
    } else {
      form = await prisma.supplyForm.create({
        data: { userId: req.user!.id, windowDate: today },
      });
    }

    res.status(201).json(form);
  } catch (err) {
    console.error("Supply form error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to submit supply form" } });
  }
});

// DELETE /api/forms/supply/retract — PGP2 only
router.delete("/supply/retract", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "PGP2") {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Only PGP2 students can retract supply forms" } });
      return;
    }

    if (!isWindowOpen()) {
      windowClosedResponse(res);
      return;
    }

    const today = getTodayDate();

    const form = await prisma.supplyForm.findUnique({
      where: { userId_windowDate: { userId: req.user!.id, windowDate: today } },
    });

    if (!form || form.isRetracted) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "No active supply form found for today" } });
      return;
    }

    const updated = await prisma.supplyForm.update({
      where: { id: form.id },
      data: { isRetracted: true },
    });

    res.json(updated);
  } catch (err) {
    console.error("Retract supply error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retract supply form" } });
  }
});

// POST /api/forms/demand — PGP1 only
router.post("/demand", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "PGP1") {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Only PGP1 students can submit demand forms" } });
      return;
    }

    if (!isWindowOpen()) {
      windowClosedResponse(res);
      return;
    }

    // Validate active CV exists
    const activeCv = await prisma.cvUpload.findFirst({
      where: { userId: req.user!.id, isActive: true },
    });

    if (!activeCv) {
      res.status(400).json({ error: { code: "NO_ACTIVE_CV", message: "You must upload a CV before submitting a demand form" } });
      return;
    }

    const today = getTodayDate();

    const existing = await prisma.demandForm.findUnique({
      where: { userId_windowDate: { userId: req.user!.id, windowDate: today } },
    });

    if (existing) {
      res.status(409).json({ error: { code: "DUPLICATE_SUBMISSION", message: "You have already submitted a demand form today" } });
      return;
    }

    const form = await prisma.demandForm.create({
      data: { userId: req.user!.id, windowDate: today },
    });

    res.status(201).json(form);
  } catch (err) {
    console.error("Demand form error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to submit demand form" } });
  }
});

// POST /api/forms/feedback — PGP1 only
router.post("/feedback", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "PGP1") {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Only PGP1 students can submit feedback" } });
      return;
    }

    const { feedbacks } = req.body;
    if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "feedbacks must be a non-empty array" } });
      return;
    }

    const yesterday = getYesterdayDate();
    const results = [];

    for (const fb of feedbacks) {
      const { matchId, rating, comment } = fb;

      if (!matchId || !rating || rating < 1 || rating > 5) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Each feedback must have matchId and rating (1-5)" } });
        return;
      }

      // Validate matchId belongs to this PGP1
      const match = await prisma.match.findFirst({
        where: { id: matchId, pgp1Id: req.user!.id },
      });

      if (!match) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: `Match ${matchId} does not belong to you` } });
        return;
      }

      // Validate match.windowDate === yesterday
      const matchDate = new Date(match.windowDate);
      const matchDateOnly = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
      if (matchDateOnly.getTime() !== yesterday.getTime()) {
        res.status(400).json({
          error: { code: "INVALID_DATE", message: `Feedback can only be submitted for yesterday's matches` },
        });
        return;
      }

      const submission = await prisma.feedbackSubmission.upsert({
        where: { userId_matchId: { userId: req.user!.id, matchId } },
        update: { rating, comment },
        create: { userId: req.user!.id, matchId, rating, comment },
      });

      results.push(submission);

      // Recalculate slot quality score for the PGP2 (non-blocking)
      recalculateSlotQualityScore(match.pgp2Id).catch((err) => {
        console.error("Score recalculation failed (non-blocking):", err);
      });
    }

    res.status(201).json(results);
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to submit feedback" } });
  }
});

// GET /api/forms/status — requireAuth
router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    const supplyForm = await prisma.supplyForm.findUnique({
      where: { userId_windowDate: { userId: req.user!.id, windowDate: today } },
    });

    const demandForm = await prisma.demandForm.findUnique({
      where: { userId_windowDate: { userId: req.user!.id, windowDate: today } },
    });

    const todaysMatches = await prisma.match.findMany({
      where: {
        windowDate: today,
        OR: [{ pgp1Id: req.user!.id }, { pgp2Id: req.user!.id }],
      },
      include: {
        pgp1: { select: { id: true, name: true, email: true, pgpId: true } },
        pgp2: { select: { id: true, name: true, email: true, pgpId: true } },
      },
    });

    const yesterdaysMatches = await prisma.match.findMany({
      where: {
        windowDate: yesterday,
        OR: [{ pgp1Id: req.user!.id }, { pgp2Id: req.user!.id }],
      },
    });

    const pendingFeedback = [];
    if (req.user!.role === "PGP1") {
      for (const match of yesterdaysMatches) {
        const feedback = await prisma.feedbackSubmission.findUnique({
          where: { userId_matchId: { userId: req.user!.id, matchId: match.id } },
        });
        if (!feedback) {
          pendingFeedback.push(match);
        }
      }
    }

    const activeCv = await prisma.cvUpload.findFirst({
      where: { userId: req.user!.id, isActive: true },
    });

    res.json({
      windowOpen: isWindowOpen(),
      today: today.toISOString().split("T")[0],
      supplyForm: supplyForm ? { submitted: !supplyForm.isRetracted, retracted: supplyForm.isRetracted } : null,
      demandForm: demandForm ? { submitted: true } : null,
      todaysMatches,
      pendingFeedback,
      activeCv: activeCv || null,
    });
  } catch (err) {
    console.error("Form status error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch form status" } });
  }
});

export default router;
