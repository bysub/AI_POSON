import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

const CACHE_TTL = 300;

// ========== 대분류 ==========

// 대분류 목록
router.get("/large", authenticate, async (_req, res) => {
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
});

// 대분류 저장 (upsert)
router.post(
  "/large",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
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
  },
);

// 대분류 삭제
router.delete(
  "/large/:lCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
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
  },
);

// ========== 중분류 ==========

// 중분류 목록
router.get("/medium", authenticate, async (req, res, next) => {
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
});

// 중분류 저장 (upsert)
router.post(
  "/medium",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
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
  },
);

// 중분류 삭제
router.delete(
  "/medium/:lCode/:mCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
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
  },
);

// ========== 소분류 ==========

// 소분류 목록
router.get("/small", authenticate, async (req, res, next) => {
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
});

// 소분류 저장 (upsert)
router.post(
  "/small",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
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
  },
);

// 소분류 삭제
router.delete(
  "/small/:lCode/:mCode/:sCode",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
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
  },
);

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
