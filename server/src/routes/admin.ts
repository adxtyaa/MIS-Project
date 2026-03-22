import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/admin/dashboard — requireAdmin
router.get("/dashboard", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const pgp1Count = await prisma.user.count({ where: { role: "PGP1" } });
    const pgp2Count = await prisma.user.count({ where: { role: "PGP2" } });
    const totalMatches = await prisma.match.count();
    const pendingMatches = await prisma.match.count({ where: { status: "PENDING" } });
    const completedMatches = await prisma.match.count({ where: { status: "COMPLETED" } });
    const totalCvUploads = await prisma.cvUpload.count({ where: { isActive: true } });
    const totalFeedback = await prisma.feedbackSubmission.count();

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todaysSupply = await prisma.supplyForm.count({
      where: { windowDate: todayDate, isRetracted: false },
    });
    const todaysDemand = await prisma.demandForm.count({
      where: { windowDate: todayDate },
    });

    res.json({
      users: { total: totalUsers, pgp1: pgp1Count, pgp2: pgp2Count },
      matches: { total: totalMatches, pending: pendingMatches, completed: completedMatches },
      today: {
        supply: todaysSupply,
        demand: todaysDemand,
        date: todayDate.toISOString().split("T")[0],
      },
      cvUploads: totalCvUploads,
      feedbackCount: totalFeedback,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch dashboard" } });
  }
});

// PATCH /api/admin/matches/:id — requireAdmin
router.patch("/matches/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid status. Must be PENDING, CONFIRMED, COMPLETED, or CANCELLED" },
      });
      return;
    }

    const match = await prisma.match.update({
      where: { id },
      data: { status },
      include: {
        pgp1: { select: { id: true, name: true, email: true, pgpId: true } },
        pgp2: { select: { id: true, name: true, email: true, pgpId: true } },
      },
    });

    res.json(match);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Match not found" } });
      return;
    }
    console.error("Update match error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update match" } });
  }
});

// GET /api/admin/users — requireAdmin — paginated
router.get("/users", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          pgpId: true,
          role: true,
          isAdmin: true,
          phone: true,
          linkedin: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch users" } });
  }
});

export default router;
