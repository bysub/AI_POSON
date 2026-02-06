import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 캐시 TTL (5분)
const CACHE_TTL = 300;

// 매입상품 조회 (거래처별, 매입가/판매가 포함)
router.get("/purchase", authenticate, async (req, res) => {
  const { supplierId, search, taxType } = req.query;

  const where: Record<string, unknown> = { isActive: true };

  if (supplierId) {
    where.supplierId = parseInt(supplierId as string, 10);
  }

  if (taxType) {
    where.taxType = taxType as string;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { barcode: { contains: search as string } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, code: true, name: true, type: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json({
    success: true,
    data: products,
  });
});

// Get all products (검색어 없을 때만 캐싱)
// admin=true 파라미터가 있으면 모든 상품 조회 (관리자용)
router.get("/", async (req, res) => {
  const { categoryId, search, admin } = req.query;
  const isAdminMode = admin === "true";

  // 검색어가 있으면 캐싱하지 않음
  if (search) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        // 키오스크용: 판매중 상품만, 관리자용: 모든 상품
        ...(!isAdminMode && { status: "SELLING" }),
        ...(categoryId && { categoryId: parseInt(categoryId as string) }),
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { barcode: { contains: search as string } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        options: true,
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: products,
    });
  }

  // 관리자 모드면 캐싱하지 않음 (모든 상태 상품 조회)
  if (isAdminMode) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId: parseInt(categoryId as string) }),
      },
      include: {
        category: { select: { id: true, name: true } },
        options: true,
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: products,
    });
  }

  // 카테고리별 캐싱 (키오스크용 - 판매중 상품만)
  const cacheKey = categoryId
    ? CACHE_KEYS.PRODUCTS_BY_CATEGORY(parseInt(categoryId as string))
    : CACHE_KEYS.PRODUCTS;

  const products = await cacheService.getOrSet(
    cacheKey,
    async () => {
      return prisma.product.findMany({
        where: {
          isActive: true,
          status: "SELLING", // 키오스크용: 판매중 상품만
          ...(categoryId && { categoryId: parseInt(categoryId as string) }),
        },
        include: {
          category: { select: { id: true, name: true } },
          options: true,
        },
        orderBy: { name: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({
    success: true,
    data: products,
  });
});

// Get product by barcode (캐싱 적용)
router.get("/barcode/:barcode", async (req, res, next) => {
  const { barcode } = req.params;

  const product = await cacheService.getOrSet(
    CACHE_KEYS.PRODUCT_BY_BARCODE(barcode),
    async () => {
      return prisma.product.findUnique({
        where: { barcode },
        include: {
          category: { select: { id: true, name: true } },
          options: true,
        },
      });
    },
    CACHE_TTL,
  );

  if (!product) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: product,
  });
});

// Get product by ID (캐싱 적용)
router.get("/:id", async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
  }

  const product = await cacheService.getOrSet(
    CACHE_KEYS.PRODUCT(id),
    async () => {
      return prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          options: true,
        },
      });
    },
    CACHE_TTL,
  );

  if (!product) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: product,
  });
});

// ========== 관리자 전용 API ==========

// Create product (관리자)
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const {
      barcode,
      name,
      nameEn,
      nameJa,
      nameZh,
      description,
      sellPrice,
      costPrice,
      status,
      categoryId,
      imageUrl,
      options,
    } = req.body;

    // 필수 필드 검증
    if (!barcode || !name || sellPrice === undefined || !categoryId) {
      return next(
        new AppError(
          400,
          "필수 필드가 누락되었습니다 (barcode, name, sellPrice, categoryId)",
          "MISSING_FIELDS",
        ),
      );
    }

    // 바코드 중복 확인
    const existing = await prisma.product.findUnique({ where: { barcode } });
    if (existing) {
      return next(new AppError(409, "이미 존재하는 바코드입니다", "PRODUCT_BARCODE_DUPLICATE"));
    }

    // 카테고리 존재 확인
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return next(new AppError(404, "카테고리를 찾을 수 없습니다", "CATEGORY_NOT_FOUND"));
    }

    const product = await prisma.product.create({
      data: {
        barcode,
        name,
        nameEn,
        nameJa,
        nameZh,
        description,
        sellPrice,
        costPrice: costPrice ?? 0,
        taxType: req.body.taxType ?? "TAXABLE",
        status: status ?? "SELLING",
        categoryId,
        supplierId: req.body.supplierId ?? null,
        imageUrl,
        isActive: true,
        options: options?.length
          ? {
              create: options.map((opt: { name: string; price: number; isRequired?: boolean }) => ({
                name: opt.name,
                price: opt.price,
                isRequired: opt.isRequired ?? false,
              })),
            }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        options: true,
      },
    });

    // 캐시 무효화
    await invalidateProductCache(categoryId);

    res.status(201).json({
      success: true,
      data: product,
    });
  },
);

// Update product (관리자)
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
    }

    const {
      barcode,
      name,
      nameEn,
      nameJa,
      nameZh,
      description,
      sellPrice,
      costPrice,
      status,
      categoryId,
      imageUrl,
      isActive,
    } = req.body;

    // 바코드 변경 시 중복 확인
    if (barcode && barcode !== existing.barcode) {
      const barcodeExists = await prisma.product.findUnique({ where: { barcode } });
      if (barcodeExists) {
        return next(new AppError(409, "이미 존재하는 바코드입니다", "PRODUCT_BARCODE_DUPLICATE"));
      }
    }

    // 카테고리 변경 시 존재 확인
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return next(new AppError(404, "카테고리를 찾을 수 없습니다", "CATEGORY_NOT_FOUND"));
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(barcode !== undefined && { barcode }),
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(nameJa !== undefined && { nameJa }),
        ...(nameZh !== undefined && { nameZh }),
        ...(description !== undefined && { description }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(costPrice !== undefined && { costPrice }),
        ...(req.body.taxType !== undefined && { taxType: req.body.taxType }),
        ...(req.body.supplierId !== undefined && { supplierId: req.body.supplierId || null }),
        ...(status !== undefined && { status }),
        ...(categoryId !== undefined && { categoryId }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: { select: { id: true, name: true } },
        options: true,
      },
    });

    // 캐시 무효화
    await invalidateProductCache(existing.categoryId);
    if (categoryId && categoryId !== existing.categoryId) {
      await invalidateProductCache(categoryId);
    }

    res.json({
      success: true,
      data: product,
    });
  },
);

// Delete product (soft delete, 관리자)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }

  // Soft delete
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  // 캐시 무효화
  await invalidateProductCache(existing.categoryId);

  res.json({
    success: true,
    message: "상품이 삭제되었습니다",
  });
});

// ========== 상품 옵션 API ==========

// Add option to product
router.post(
  "/:id/options",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
    }

    const { name, price, isRequired } = req.body;

    if (!name || price === undefined) {
      return next(new AppError(400, "필수 필드가 누락되었습니다 (name, price)", "MISSING_FIELDS"));
    }

    const option = await prisma.productOption.create({
      data: {
        productId,
        name,
        price,
        isRequired: isRequired ?? false,
      },
    });

    // 캐시 무효화
    await invalidateProductCache(product.categoryId);

    res.status(201).json({
      success: true,
      data: option,
    });
  },
);

// Update option
router.patch(
  "/:id/options/:optionId",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);

    if (isNaN(productId) || isNaN(optionId)) {
      return next(new AppError(400, "Invalid ID", "INVALID_ID"));
    }

    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId },
      include: { product: true },
    });

    if (!option) {
      return next(new AppError(404, "Option not found", "OPTION_NOT_FOUND"));
    }

    const { name, price, isRequired } = req.body;

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(isRequired !== undefined && { isRequired }),
      },
    });

    // 캐시 무효화
    await invalidateProductCache(option.product.categoryId);

    res.json({
      success: true,
      data: updated,
    });
  },
);

// Delete option
router.delete(
  "/:id/options/:optionId",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);

    if (isNaN(productId) || isNaN(optionId)) {
      return next(new AppError(400, "Invalid ID", "INVALID_ID"));
    }

    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId },
      include: { product: true },
    });

    if (!option) {
      return next(new AppError(404, "Option not found", "OPTION_NOT_FOUND"));
    }

    await prisma.productOption.delete({ where: { id: optionId } });

    // 캐시 무효화
    await invalidateProductCache(option.product.categoryId);

    res.json({
      success: true,
      message: "옵션이 삭제되었습니다",
    });
  },
);

// ========== 상품 상태 변경 API ==========

// Update product status (빠른 상태 변경)
router.patch(
  "/:id/status",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    const { status } = req.body;

    const validStatuses = ["SELLING", "SOLD_OUT", "PENDING", "HIDDEN"];
    if (!status || !validStatuses.includes(status)) {
      return next(
        new AppError(
          400,
          "유효하지 않은 상태입니다 (SELLING, SOLD_OUT, PENDING, HIDDEN)",
          "INVALID_STATUS",
        ),
      );
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });

    // 캐시 무효화
    await invalidateProductCache(product.categoryId);

    res.json({
      success: true,
      data: updated,
    });
  },
);

// ========== 캐시 관리 ==========

// 캐시 무효화 헬퍼
async function invalidateProductCache(categoryId?: number | null): Promise<void> {
  await cacheService.del(CACHE_KEYS.PRODUCTS);
  if (categoryId) {
    await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(categoryId));
  }
}

// 캐시 전체 무효화 (관리자)
router.delete("/cache", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (_req, res) => {
  await cacheService.del(CACHE_KEYS.PRODUCTS);
  // 모든 카테고리 캐시 삭제는 패턴 매칭이 필요하므로 개별 삭제
  const categories = await prisma.category.findMany({ select: { id: true } });
  for (const cat of categories) {
    await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(cat.id));
  }

  res.json({
    success: true,
    message: "상품 캐시가 초기화되었습니다",
  });
});

export { router as productsRouter };
