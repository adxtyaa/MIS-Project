import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        pgpId: true,
        role: true,
        isAdmin: true,
        phone: true,
        linkedin: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        cvUploads: {
          where: { isActive: true },
          take: 1,
        },
        matchesAsPgp1: {
          orderBy: { windowDate: "desc" },
          take: 5,
          include: { pgp2: { select: { id: true, name: true, email: true, pgpId: true } } },
        },
        matchesAsPgp2: {
          orderBy: { windowDate: "desc" },
          take: 5,
          include: { pgp1: { select: { id: true, name: true, email: true, pgpId: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }

    const recentMatches = user.role === "PGP1" ? user.matchesAsPgp1 : user.matchesAsPgp2;

    res.json({
      ...user,
      activeCv: user.cvUploads[0] || null,
      recentMatches,
      matchesAsPgp1: undefined,
      matchesAsPgp2: undefined,
      cvUploads: undefined,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch user" } });
  }
});

// PATCH /api/users/me
const ALLOWED_FIELDS = ["name", "phone", "linkedin", "bio"];

router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, string> = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: { code: "NO_UPDATES", message: "No valid fields to update" } });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        pgpId: true,
        role: true,
        isAdmin: true,
        phone: true,
        linkedin: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update user" } });
  }
});

// GET /api/users/me/matches
router.get("/me/matches", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const matches = await prisma.match.findMany({
      where: role === "PGP1" ? { pgp1Id: req.user!.id } : { pgp2Id: req.user!.id },
      orderBy: { windowDate: "desc" },
      include: {
        pgp1: { select: { id: true, name: true, email: true, pgpId: true } },
        pgp2: { select: { id: true, name: true, email: true, pgpId: true } },
      },
    });

    res.json(matches);
  } catch (err) {
    console.error("Get matches error:", err);
    res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch matches" } });
  }
});

export default router;
