import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const CACHE_TTL = 300;

// ========== 대분류 ==========

// 대분류 목록
router.get("/large", authenticate, asyncHandler(async (_req, res) => {
  const data = await cacheService.getOrSet(
    CACHE_KEYS.BRANCHES_LARGE,
    async () => {
      return prisma.lBranch.findMany({
        include: { _count: { select: { mBranches: true } } },
        orderBy: { lCode: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({ success: true, data });
}));

// 대분류 저장 (upsert)
router.post(
  "/large",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { lCode, lName } = req.body;

    if (!lCode || !lName) {
      return next(new AppError(400, "코드와 이름은 필수입니다", "MISSING_FIELDS"));
    }

    const code = String(lCode).trim();
    if (code.length === 0 || code.length > 2) {
      return next(new AppError(400, "대분류 코드는 1~2자리여야 합니다", "INVALID_CODE"));
    }

    const data = await prisma.lBranch.upsert({
      where: { lCode: code },
      update: { lName },
      create: { lCode: code, lName },
      include: { _count: { select: { mBranches: true } } },
    });

    await invalidateBranchCache();

    res.json({ success: true, data });
  }),
);

// 대분류 삭제
router.delete(
  "/large/:lCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res, next) => {
    const { lCode } = req.params;

    const existing = await prisma.lBranch.findUnique({
      where: { lCode },
      include: { _count: { select: { mBranches: true } } },
    });

    if (!existing) {
      return next(new AppError(404, "대분류를 찾을 수 없습니다", "NOT_FOUND"));
    }

    if (existing._count.mBranches > 0) {
      return next(new AppError(400, "하위 중분류가 존재하여 삭제할 수 없습니다", "HAS_CHILDREN"));
    }

    await prisma.lBranch.delete({ where: { lCode } });
    await invalidateBranchCache();

    res.json({ success: true, message: "대분류가 삭제되었습니다" });
  }),
);

// ========== 중분류 ==========

// 중분류 목록
router.get("/medium", authenticate, asyncHandler(async (req, res, next) => {
  const lCode = req.query.lCode as string;

  if (!lCode) {
    return next(new AppError(400, "대분류 코드(lCode)는 필수입니다", "MISSING_PARAMS"));
  }

  const data = await cacheService.getOrSet(
    CACHE_KEYS.BRANCHES_MEDIUM(lCode),
    async () => {
      return prisma.mBranch.findMany({
        where: { lCode },
        include: { _count: { select: { sBranches: true } } },
        orderBy: { mCode: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({ success: true, data });
}));

// 중분류 저장 (upsert)
router.post(
  "/medium",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { lCode, mCode, mName } = req.body;

    if (!lCode || !mCode || !mName) {
      return next(
        new AppError(400, "대분류 코드, 중분류 코드, 이름은 필수입니다", "MISSING_FIELDS"),
      );
    }

    const code = String(mCode).trim();
    if (code.length === 0 || code.length > 2) {
      return next(new AppError(400, "중분류 코드는 1~2자리여야 합니다", "INVALID_CODE"));
    }

    // 상위 대분류 존재 확인
    const parent = await prisma.lBranch.findUnique({ where: { lCode } });
    if (!parent) {
      return next(new AppError(400, "대분류가 존재하지 않습니다", "PARENT_NOT_FOUND"));
    }

    const data = await prisma.mBranch.upsert({
      where: { lCode_mCode: { lCode, mCode: code } },
      update: { mName },
      create: { lCode, mCode: code, mName },
      include: { _count: { select: { sBranches: true } } },
    });

    await invalidateBranchCache(lCode);

    res.json({ success: true, data });
  }),
);

// 중분류 삭제
router.delete(
  "/medium/:lCode/:mCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res, next) => {
    const { lCode, mCode } = req.params;

    const existing = await prisma.mBranch.findUnique({
      where: { lCode_mCode: { lCode, mCode } },
      include: { _count: { select: { sBranches: true } } },
    });

    if (!existing) {
      return next(new AppError(404, "중분류를 찾을 수 없습니다", "NOT_FOUND"));
    }

    if (existing._count.sBranches > 0) {
      return next(new AppError(400, "하위 소분류가 존재하여 삭제할 수 없습니다", "HAS_CHILDREN"));
    }

    await prisma.mBranch.delete({ where: { lCode_mCode: { lCode, mCode } } });
    await invalidateBranchCache(lCode);

    res.json({ success: true, message: "중분류가 삭제되었습니다" });
  }),
);

// ========== 소분류 ==========

// 소분류 목록
router.get("/small", authenticate, asyncHandler(async (req, res, next) => {
  const lCode = req.query.lCode as string;
  const mCode = req.query.mCode as string;

  if (!lCode || !mCode) {
    return next(
      new AppError(400, "대분류 코드(lCode)와 중분류 코드(mCode)는 필수입니다", "MISSING_PARAMS"),
    );
  }

  const data = await cacheService.getOrSet(
    CACHE_KEYS.BRANCHES_SMALL(lCode, mCode),
    async () => {
      return prisma.sBranch.findMany({
        where: { lCode, mCode },
        orderBy: { sCode: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({ success: true, data });
}));

// 소분류 저장 (upsert)
router.post(
  "/small",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { lCode, mCode, sCode, sName, profitRate } = req.body;

    if (!lCode || !mCode || !sCode || !sName) {
      return next(
        new AppError(
          400,
          "대분류 코드, 중분류 코드, 소분류 코드, 이름은 필수입니다",
          "MISSING_FIELDS",
        ),
      );
    }

    const code = String(sCode).trim();
    if (code.length === 0 || code.length > 3) {
      return next(new AppError(400, "소분류 코드는 1~3자리여야 합니다", "INVALID_CODE"));
    }

    // 상위 중분류 존재 확인
    const parent = await prisma.mBranch.findUnique({
      where: { lCode_mCode: { lCode, mCode } },
    });
    if (!parent) {
      return next(new AppError(400, "중분류가 존재하지 않습니다", "PARENT_NOT_FOUND"));
    }

    const data = await prisma.sBranch.upsert({
      where: { lCode_mCode_sCode: { lCode, mCode, sCode: code } },
      update: { sName, profitRate: profitRate ?? 0 },
      create: { lCode, mCode, sCode: code, sName, profitRate: profitRate ?? 0 },
    });

    await invalidateBranchCache(lCode, mCode);

    res.json({ success: true, data });
  }),
);

// 소분류 삭제
router.delete(
  "/small/:lCode/:mCode/:sCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res, next) => {
    const { lCode, mCode, sCode } = req.params;

    const existing = await prisma.sBranch.findUnique({
      where: { lCode_mCode_sCode: { lCode, mCode, sCode } },
    });

    if (!existing) {
      return next(new AppError(404, "소분류를 찾을 수 없습니다", "NOT_FOUND"));
    }

    await prisma.sBranch.delete({
      where: { lCode_mCode_sCode: { lCode, mCode, sCode } },
    });
    await invalidateBranchCache(lCode, mCode);

    res.json({ success: true, message: "소분류가 삭제되었습니다" });
  }),
);

// ========== 분류코드 명칭 일괄 조회 ==========

// POST /resolve — [{lCode, mCode?, sCode?}] → 명칭 포함 응답
router.post("/resolve", authenticate, asyncHandler(async (req, res) => {
  const items: { lCode: string; mCode?: string; sCode?: string }[] = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ success: true, data: [] });
  }

  // 고유한 lCode 목록
  const lCodes = [...new Set(items.map((i) => i.lCode).filter(Boolean))];
  const lBranches = await prisma.lBranch.findMany({ where: { lCode: { in: lCodes } } });
  const lMap = new Map(lBranches.map((b) => [b.lCode, b.lName]));

  // 고유한 (lCode, mCode) 쌍
  const mPairs = [...new Set(items.filter((i) => i.mCode).map((i) => `${i.lCode}|${i.mCode}`))];
  const mBranches =
    mPairs.length > 0
      ? await prisma.mBranch.findMany({
          where: {
            OR: mPairs.map((p) => {
              const [lCode, mCode] = p.split("|");
              return { lCode, mCode };
            }),
          },
        })
      : [];
  const mMap = new Map(mBranches.map((b) => [`${b.lCode}|${b.mCode}`, b.mName]));

  // 고유한 (lCode, mCode, sCode) 쌍
  const sPairs = [
    ...new Set(items.filter((i) => i.sCode).map((i) => `${i.lCode}|${i.mCode}|${i.sCode}`)),
  ];
  const sBranches =
    sPairs.length > 0
      ? await prisma.sBranch.findMany({
          where: {
            OR: sPairs.map((p) => {
              const [lCode, mCode, sCode] = p.split("|");
              return { lCode, mCode, sCode };
            }),
          },
        })
      : [];
  const sMap = new Map(sBranches.map((b) => [`${b.lCode}|${b.mCode}|${b.sCode}`, b.sName]));

  const result = items.map((item) => ({
    lCode: item.lCode,
    mCode: item.mCode || null,
    sCode: item.sCode || null,
    lName: lMap.get(item.lCode) || null,
    mName: item.mCode ? mMap.get(`${item.lCode}|${item.mCode}`) || null : null,
    sName: item.sCode ? sMap.get(`${item.lCode}|${item.mCode}|${item.sCode}`) || null : null,
  }));

  res.json({ success: true, data: result });
}));

// ========== 캐시 관리 ==========

async function invalidateBranchCache(lCode?: string, mCode?: string): Promise<void> {
  await cacheService.del(CACHE_KEYS.BRANCHES_LARGE);
  if (lCode) {
    await cacheService.del(CACHE_KEYS.BRANCHES_MEDIUM(lCode));
  }
  if (lCode && mCode) {
    await cacheService.del(CACHE_KEYS.BRANCHES_SMALL(lCode, mCode));
  }
}

export { router as branchesRouter };
