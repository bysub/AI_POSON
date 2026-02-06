import { Router } from "express";
import { prisma } from "../utils/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch {
    health.database = "disconnected";
    health.status = "degraded";
  }

  res.status(health.status === "ok" ? 200 : 503).json(health);
});

export { router as healthRouter };
