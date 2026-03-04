import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../utils/db.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// ─── 관리자 목록 ───
router.get("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (_req, res) => {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  res.json({ success: true, data: admins });
}));

// ─── 관리자 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const { username, password, name, role } = req.body as {
    username: string;
    password: string;
    name: string;
    role: string;
  };

  if (!username || !password || !name) {
    res.status(400).json({ success: false, message: "username, password, name은 필수입니다" });
    return;
  }

  const validRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({ success: false, message: "유효하지 않은 권한입니다" });
    return;
  }

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ success: false, message: "이미 존재하는 사용자명입니다" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { username, passwordHash, name, role: (role as never) ?? "STAFF" },
    select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json({ success: true, data: admin });
}));

// ─── 관리자 수정 ───
router.patch("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, isActive, password } = req.body as {
    name?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  };

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
    return;
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
  });

  res.json({ success: true, data: admin });
}));

// ─── 관리자 삭제 ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
    return;
  }

  await prisma.admin.delete({ where: { id } });
  res.json({ success: true, message: "삭제되었습니다" });
}));

export { router as adminsRouter };
