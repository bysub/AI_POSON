import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { MemberService } from "../services/member.service.js";

const router = Router();

// ─── 키오스크용: 전화번호로 회원 조회 (인증 불필요) ───
router.get("/lookup", asyncHandler(async (req, res) => {
  const member = await MemberService.lookupByPhone(req.query.phone as string);
  if (!member) {
    res.json({ success: true, data: null, message: "회원을 찾을 수 없습니다" });
    return;
  }
  res.json({ success: true, data: member });
}));

// ─── 키오스크용: 간편 회원 등록 (인증 불필요) ───
router.post("/register", asyncHandler(async (req, res) => {
  const { phone, name } = req.body as { phone?: string; name?: string };
  const result = await MemberService.register(phone ?? "", name);
  if (result.isExisting) {
    res.json({ success: true, data: result.member, message: "이미 등록된 회원입니다" });
  } else {
    res.status(201).json({ success: true, data: result.member });
  }
}));

// ─── 고객 목록 (검색) ───
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const members = await MemberService.findAll(req.query.search as string | undefined);
  res.json({ success: true, data: members });
}));

// ─── 고객 등록 ───
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const member = await MemberService.create(req.body);
  res.status(201).json({ success: true, data: member });
}));

// ─── 고객 수정 ───
router.patch("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const member = await MemberService.update(parseInt(req.params.id), req.body);
  res.json({ success: true, data: member });
}));

// ─── 고객 삭제 (비활성) ───
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  await MemberService.delete(parseInt(req.params.id));
  res.json({ success: true, message: "삭제되었습니다" });
}));

export { router as membersRouter };
