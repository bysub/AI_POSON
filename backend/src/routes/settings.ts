import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SettingService } from "../services/setting.service.js";

const router = Router();

// 전체 설정 조회 (인증 불필요 - 키오스크 공용 화면에서 사용)
router.get("/", asyncHandler(async (_req, res) => {
  const data = await SettingService.findAll();
  res.json({ success: true, data });
}));

// 카테고리별 설정 조회 (인증 불필요 - 읽기 전용)
router.get("/:category", asyncHandler(async (req, res) => {
  const data = await SettingService.findByCategory(req.params.category);
  res.json({ success: true, data });
}));

// 카테고리별 설정 일괄 저장 (upsert)
router.put(
  "/:category",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = await SettingService.saveByCategory(req.params.category, req.body);
    res.json({ success: true, data });
  }),
);

export { router as settingsRouter };
