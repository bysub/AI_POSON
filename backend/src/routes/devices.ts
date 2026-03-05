import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DeviceService } from "../services/device.service.js";

const router = Router();

// ─── 기기 목록 조회 ───
router.get("/", authenticate, asyncHandler(async (_req, res) => {
  const devices = await DeviceService.findAll();
  res.json({ success: true, data: devices });
}));

// ─── 기기 단건 조회 (인증 불필요 - 키오스크 자기 기기 조회) ───
router.get("/:id", asyncHandler(async (req, res) => {
  const device = await DeviceService.findById(req.params.id);
  res.json({ success: true, data: device });
}));

// ─── 기기 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const device = await DeviceService.create(req.body);
  res.status(201).json({ success: true, data: device });
}));

// ─── 기기 삭제 (설정도 cascade) ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  await DeviceService.delete(req.params.id);
  res.json({ success: true, message: "삭제되었습니다" });
}));

// ─── 기기별 전체 설정 조회 (인증 불필요 - 키오스크 자기 설정 조회) ───
router.get("/:id/settings", asyncHandler(async (req, res) => {
  const data = await DeviceService.getSettings(req.params.id);
  res.json({ success: true, data });
}));

// ─── 기기별 카테고리 설정 조회 (인증 불필요 - 읽기 전용) ───
router.get("/:id/settings/:category", asyncHandler(async (req, res) => {
  const data = await DeviceService.getSettingsByCategory(req.params.id, req.params.category);
  res.json({ success: true, data });
}));

// ─── 기기별 카테고리 설정 일괄 저장 ───
router.put(
  "/:id/settings/:category",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = await DeviceService.saveSettings(req.params.id, req.params.category, req.body);
    res.json({ success: true, data });
  }),
);

export { router as devicesRouter };
