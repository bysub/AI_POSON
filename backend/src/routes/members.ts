import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../utils/db.js";
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

// ─── 회원 통계 요약 ───
router.get("/stats/summary", authenticate, asyncHandler(async (req, res) => {
  const totalMembers = await prisma.member.count({ where: { isActive: true } });

  const gradeGroups = await prisma.member.groupBy({
    by: ["grade"],
    where: { isActive: true },
    _count: true,
  });

  const gradeDistribution: Record<string, number> = {};
  for (const g of gradeGroups) {
    gradeDistribution[g.grade] = g._count;
  }

  const newMembersThisMonth = await prisma.member.count({
    where: {
      isActive: true,
      createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
  });

  const totalPoints = await prisma.member.aggregate({
    where: { isActive: true },
    _sum: { points: true, totalEarned: true },
  });

  res.json({
    success: true,
    data: {
      totalMembers,
      gradeDistribution,
      newMembersThisMonth,
      totalActivePoints: totalPoints._sum.points ?? 0,
      totalEarnedPoints: totalPoints._sum.totalEarned ?? 0,
    },
  });
}));

// ─── 포인트 통계 (일별 적립/사용) ───
router.get("/stats/points", authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ success: false, message: "startDate, endDate는 필수입니다" });
    return;
  }

  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T23:59:59.999+09:00`);

  const histories = await prisma.pointHistory.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { type: true, amount: true, createdAt: true },
  });

  // KST 기준 날짜 키 생성 (UTC → KST +9h)
  const toKstDateKey = (d: Date) => {
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split("T")[0];
  };

  const dailyMap = new Map<string, { earned: number; used: number; adjusted: number }>();
  // startDate/endDate 문자열 기반으로 날짜 키 생성 (이미 KST 날짜)
  const cursorDate = new Date(`${startDate}T00:00:00+09:00`);
  const endDate_ = new Date(`${endDate}T00:00:00+09:00`);
  while (cursorDate <= endDate_) {
    dailyMap.set(toKstDateKey(cursorDate), { earned: 0, used: 0, adjusted: 0 });
    cursorDate.setDate(cursorDate.getDate() + 1);
  }

  let totalEarned = 0;
  let totalUsed = 0;
  let totalAdjusted = 0;

  for (const h of histories) {
    const key = toKstDateKey(h.createdAt);
    const entry = dailyMap.get(key);
    if (!entry) continue;

    if (h.type === "EARN") {
      entry.earned += h.amount;
      totalEarned += h.amount;
    } else if (h.type === "USE") {
      entry.used += h.amount;
      totalUsed += h.amount;
    } else if (h.type === "ADJUST") {
      entry.adjusted += h.amount;
      totalAdjusted += h.amount;
    }
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, earned: d.earned, used: d.used, adjusted: d.adjusted }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: {
      summary: { totalEarned, totalUsed, totalAdjusted, netPoints: totalEarned - totalUsed + totalAdjusted },
      daily,
    },
  });
}));

// ─── 고객 목록 (검색) ───
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const members = await MemberService.findAll(req.query.search as string | undefined);
  res.json({ success: true, data: members });
}));

// ─── 포인트 이력 조회 ───
router.get("/:id/point-histories", authenticate, asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const histories = await MemberService.getPointHistories(parseInt(req.params.id), limit);
  res.json({ success: true, data: histories });
}));

// ─── 포인트 수동 조정 (관리자) ───
router.post("/:id/points/adjust", authenticate, authorize("SUPER_ADMIN", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const { amount, description } = req.body as { amount?: number; description?: string };
  if (!amount || amount === 0) {
    res.status(400).json({ success: false, message: "amount는 0이 아닌 정수여야 합니다" });
    return;
  }
  const member = await MemberService.adjustPoints(parseInt(req.params.id), amount, description ?? "");
  res.json({ success: true, data: member });
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
