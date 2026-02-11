import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 캐시 TTL (5분)
const CACHE_TTL = 300;

// Get all categories (캐싱 적용)
router.get("/", async (_req, res) => {
  const categories = await cacheService.getOrSet(
    CACHE_KEYS.CATEGORIES,
    async () => {
      return prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({
    success: true,
    data: categories,
  });
});

// Get category by ID with products (캐싱 적용)
router.get("/:id", async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
  }

  const category = await cacheService.getOrSet(
    CACHE_KEYS.CATEGORY(id),
    async () => {
      return prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      });
    },
    CACHE_TTL,
  );

  if (!category) {
    return next(new AppError(404, "Category not found", "CATEGORY_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: category,
  });
});

// ========== 관리자 전용 API ==========

// Create category (관리자)
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const { name, nameEn, nameJa, nameZh, imageUrl, isDiscount, isPopular, sortOrder } = req.body;

    if (!name) {
      return next(new AppError(400, "카테고리명은 필수입니다", "MISSING_NAME"));
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameEn,
        nameJa,
        nameZh,
        imageUrl,
        isDiscount: isDiscount ?? false,
        isPopular: isPopular ?? false,
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    });

    // 캐시 무효화
    await cacheService.del(CACHE_KEYS.CATEGORIES);

    res.status(201).json({
      success: true,
      data: category,
    });
  },
);

// Update category (관리자)
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "Category not found", "CATEGORY_NOT_FOUND"));
    }

    const { name, nameEn, nameJa, nameZh, imageUrl, isDiscount, isPopular, sortOrder, isActive } =
      req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(nameJa !== undefined && { nameJa }),
        ...(nameZh !== undefined && { nameZh }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isDiscount !== undefined && { isDiscount }),
        ...(isPopular !== undefined && { isPopular }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // 캐시 무효화
    await cacheService.del(CACHE_KEYS.CATEGORIES);
    await cacheService.del(CACHE_KEYS.CATEGORY(id));

    res.json({
      success: true,
      data: category,
    });
  },
);

// Delete category (관리자)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
  }

  const existing = await prisma.category.findUnique({
    where: { id },
    include: { products: { where: { isActive: true }, take: 1 } },
  });

  if (!existing) {
    return next(new AppError(404, "Category not found", "CATEGORY_NOT_FOUND"));
  }

  // 연결된 상품이 있으면 삭제 불가
  if (existing.products.length > 0) {
    return next(
      new AppError(
        400,
        "카테고리에 연결된 상품이 있어 삭제할 수 없습니다",
        "CATEGORY_HAS_PRODUCTS",
      ),
    );
  }

  // Soft delete
  await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });

  // 캐시 무효화
  await cacheService.del(CACHE_KEYS.CATEGORIES);
  await cacheService.del(CACHE_KEYS.CATEGORY(id));

  res.json({
    success: true,
    message: "카테고리가 삭제되었습니다",
  });
});

// 캐시 무효화 (관리자용)
router.delete("/cache", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (_req, res) => {
  await cacheService.deletePattern("categor*");
  await cacheService.deletePattern("product*");

  res.json({
    success: true,
    message: "캐시가 초기화되었습니다",
  });
});

export { router as categoriesRouter };
