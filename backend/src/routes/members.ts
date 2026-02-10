import { Router } from "express";
import { prisma } from "../utils/db.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// ─── 고객 목록 (검색) ───
router.get("/", authenticate, async (req, res) => {
  const { search } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { phone: { contains: search as string } },
      { code: { contains: search as string } },
    ];
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { name: "asc" },
  });
  res.json({ success: true, data: members });
});

// ─── 고객 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const { code, name, phone, grade } = req.body as {
    code: string;
    name: string;
    phone: string;
    grade?: string;
  };

  if (!code || !name || !phone) {
    res.status(400).json({ success: false, message: "code, name, phone은 필수입니다" });
    return;
  }

  const existing = await prisma.member.findUnique({ where: { code } });
  if (existing) {
    res.status(409).json({ success: false, message: "이미 존재하는 회원코드입니다" });
    return;
  }

  const validGrades = ["NORMAL", "SILVER", "GOLD", "VIP"];
  const member = await prisma.member.create({
    data: {
      code,
      name,
      phone,
      grade: (validGrades.includes(grade ?? "") ? grade : "NORMAL") as never,
    },
  });

  res.status(201).json({ success: true, data: member });
});

// ─── 고객 수정 ───
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "유효하지 않은 ID입니다" });
      return;
    }

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "고객을 찾을 수 없습니다" });
      return;
    }

    const { name, phone, grade, points, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (grade !== undefined) data.grade = grade;
    if (points !== undefined) data.points = points;
    if (isActive !== undefined) data.isActive = isActive;

    const member = await prisma.member.update({ where: { id }, data });
    res.json({ success: true, data: member });
  },
);

// ─── 고객 삭제 (비활성) ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: "유효하지 않은 ID입니다" });
    return;
  }

  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: "고객을 찾을 수 없습니다" });
    return;
  }

  await prisma.member.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: "삭제되었습니다" });
});

export { router as membersRouter };
