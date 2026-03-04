import { Router } from "express";
import { prisma } from "../utils/db.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// ─── 기기 목록 조회 ───
router.get("/", authenticate, asyncHandler(async (_req, res) => {
  const devices = await prisma.device.findMany({
    orderBy: [{ type: "asc" }, { id: "asc" }],
  });
  res.json({ success: true, data: devices });
}));

// ─── 기기 단건 조회 (인증 불필요 - 키오스크 자기 기기 조회) ───
router.get("/:id", asyncHandler(async (req, res) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
  });
  if (!device) {
    res.status(404).json({ success: false, message: "기기를 찾을 수 없습니다" });
    return;
  }
  res.json({ success: true, data: device });
}));

// ─── 기기 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const { id, name, type } = req.body as {
    id: string;
    name: string;
    type: string;
  };

  if (!id || !name || !type) {
    res.status(400).json({ success: false, message: "id, name, type은 필수입니다" });
    return;
  }

  if (!["POS", "KIOSK", "KITCHEN"].includes(type)) {
    res
      .status(400)
      .json({ success: false, message: "type은 POS, KIOSK, KITCHEN 중 하나여야 합니다" });
    return;
  }

  const existing = await prisma.device.findUnique({ where: { id } });
  if (existing) {
    res.status(409).json({ success: false, message: "이미 존재하는 기기 ID입니다" });
    return;
  }

  const device = await prisma.device.create({
    data: { id, name, type },
  });

  res.status(201).json({ success: true, data: device });
}));

// ─── 기기 삭제 (설정도 cascade) ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.device.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: "기기를 찾을 수 없습니다" });
    return;
  }

  await prisma.device.delete({ where: { id } });
  res.json({ success: true, message: "삭제되었습니다" });
}));

// ─── 기기별 전체 설정 조회 (인증 불필요 - 키오스크 자기 설정 조회) ───
router.get("/:id/settings", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const settings = await prisma.deviceSetting.findMany({
    where: { deviceId: id },
  });

  const data: Record<string, string> = {};
  for (const s of settings) {
    data[s.key] = s.value;
  }

  res.json({ success: true, data });
}));

// ─── 기기별 카테고리 설정 조회 (인증 불필요 - 읽기 전용) ───
router.get("/:id/settings/:category", asyncHandler(async (req, res) => {
  const { id, category } = req.params;

  const settings = await prisma.deviceSetting.findMany({
    where: {
      deviceId: id,
      category: category.toUpperCase(),
    },
  });

  const data: Record<string, string> = {};
  for (const s of settings) {
    data[s.key] = s.value;
  }

  res.json({ success: true, data });
}));

// ─── 기기별 카테고리 설정 일괄 저장 ───
router.put(
  "/:id/settings/:category",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const deviceId = req.params.id;
    const category = req.params.category.toUpperCase();
    const entries = req.body as Record<string, string>;

    // 기기 존재 확인
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ success: false, message: "기기를 찾을 수 없습니다" });
      return;
    }

    const upserts = Object.entries(entries).map(([key, value]) =>
      prisma.deviceSetting.upsert({
        where: { deviceId_key: { deviceId, key } },
        update: { value: String(value ?? ""), category },
        create: { deviceId, key, value: String(value ?? ""), category },
      }),
    );

    await prisma.$transaction(upserts);

    // 저장 후 다시 조회
    const settings = await prisma.deviceSetting.findMany({
      where: { deviceId, category },
    });

    const data: Record<string, string> = {};
    for (const s of settings) {
      data[s.key] = s.value;
    }

    res.json({ success: true, data });
  }),
);

export { router as devicesRouter };
