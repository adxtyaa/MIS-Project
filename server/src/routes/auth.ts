import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { validateBody } from "../middleware/validate";

const router = Router();

// STUB: In-memory set for invalidated refresh tokens
const invalidatedTokens = new Set<string>();

function generateAccessToken(user: { id: string; email: string; name: string; role: string; isAdmin: boolean; pgpId: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role, isAdmin: user.isAdmin, pgpId: user.pgpId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

function detectRole(pgpId: string): "PGP1" | "PGP2" {
  const currentBatch = process.env.CURRENT_PGP1_BATCH || "PGP42";
  const batchMatch = pgpId.match(/^(PGP\d+)/i);
  if (batchMatch && batchMatch[1].toUpperCase() === currentBatch.toUpperCase()) {
    return "PGP1";
  }
  return "PGP2";
}

// POST /api/auth/register
router.post(
  "/register",
  validateBody(["email", "password", "name", "pgpId"]),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, pgpId } = req.body;

      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || "iiml.ac.in";
      if (!email.endsWith(`@${allowedDomain}`)) {
        res.status(400).json({
          error: { code: "INVALID_EMAIL", message: `Email must end with @${allowedDomain}` },
        });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({
          error: { code: "USER_EXISTS", message: "A user with this email already exists" },
        });
        return;
      }

      const role = detectRole(pgpId);
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, pgpId, role },
      });

      const { password: _, ...userWithoutPassword } = user;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user.id);

      res.status(201).json({ user: userWithoutPassword, accessToken, refreshToken });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Registration failed" } });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  validateBody(["email", "password"]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        res.status(401).json({
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        });
        return;
      }

      const { password: _, ...userWithoutPassword } = user;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user.id);

      res.json({ user: userWithoutPassword, accessToken, refreshToken });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Login failed" } });
    }
  }
);

// POST /api/auth/refresh
router.post("/refresh", validateBody(["refreshToken"]), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (invalidatedTokens.has(refreshToken)) {
      res.status(401).json({
        error: { code: "TOKEN_INVALIDATED", message: "Refresh token has been invalidated" },
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      res.status(401).json({
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
      return;
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Invalid refresh token" },
    });
  }
});

// POST /api/auth/logout
// STUB: Uses in-memory Set — will not survive server restarts
router.post("/logout", validateBody(["refreshToken"]), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  invalidatedTokens.add(refreshToken);
  res.json({ message: "Logged out successfully" });
});

export default router;
