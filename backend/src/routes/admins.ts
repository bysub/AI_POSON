import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AdminService } from "../services/admin.service.js";

const router = Router();

// ─── 관리자 목록 ───
router.get("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (_req, res) => {
  const admins = await AdminService.findAll();
  res.json({ success: true, data: admins });
}));

// ─── 관리자 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const admin = await AdminService.create(req.body);
  res.status(201).json({ success: true, data: admin });
}));

// ─── 관리자 수정 ───
router.patch("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const admin = await AdminService.update(req.params.id, req.body);
  res.json({ success: true, data: admin });
}));

// ─── 관리자 삭제 ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await AdminService.delete(req.params.id);
  res.json({ success: true, message: "삭제되었습니다" });
}));

export { router as adminsRouter };
