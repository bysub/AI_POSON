import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 캐시 TTL (5분)
const CACHE_TTL = 300;

// 공통 include 패턴
const productInclude = {
  categories: { select: { id: true, name: true } },
  purchaseProduct: {
    select: { id: true, barcode: true, name: true, stock: true, safeStock: true },
  },
  options: {
    include: {
      purchaseProduct: { select: { id: true, barcode: true, name: true, stock: true } },
    },
  },
};

// Get all products (검색어 없을 때만 캐싱)
// admin=true 파라미터가 있으면 모든 상품 조회 (관리자용)
router.get("/", async (req, res) => {
  const { categoryId, search, admin } = req.query;
  const isAdminMode = admin === "true";

  const categoryFilter = categoryId
    ? { categories: { some: { id: parseInt(categoryId as string) } } }
    : {};

  // 검색어가 있으면 캐싱하지 않음
  if (search) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        // 키오스크용: 판매중 상품만, 관리자용: 모든 상품
        ...(!isAdminMode && { status: "SELLING" }),
        ...categoryFilter,
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { barcode: { contains: search as string } },
        ],
      },
      include: productInclude,
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
        ...categoryFilter,
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: products,
    });
  }

  // 카테고리별 캐싱 (키오스크용 - HIDDEN 제외, 품절/판매대기는 포함)
  const cacheKey = categoryId
    ? CACHE_KEYS.PRODUCTS_BY_CATEGORY(parseInt(categoryId as string))
    : CACHE_KEYS.PRODUCTS;

  const products = await cacheService.getOrSet(
    cacheKey,
    async () => {
      return prisma.product.findMany({
        where: {
          isActive: true,
          status: { in: ["SELLING", "SOLD_OUT", "PENDING"] },
          ...categoryFilter,
        },
        include: productInclude,
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
      return prisma.product.findFirst({
        where: { barcode, isActive: true, status: "SELLING" },
        include: productInclude,
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
        include: productInclude,
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
      purchaseProductId,
      name,
      nameEn,
      nameJa,
      nameZh,
      description,
      sellPrice,
      isDiscount,
      discountPrice,
      status,
      categoryIds,
      imageUrl,
      kitchenCall,
      isPopular,
      options,
    } = req.body;

    // 필수 필드 검증
    if (!name || sellPrice === undefined || !categoryIds?.length) {
      return next(
        new AppError(
          400,
          "필수 필드가 누락되었습니다 (name, sellPrice, categoryIds)",
          "MISSING_FIELDS",
        ),
      );
    }

    // purchaseProductId 검증 및 바코드 자동 설정
    let resolvedBarcode = barcode ?? "";
    if (purchaseProductId) {
      const pp = await prisma.purchaseProduct.findUnique({ where: { id: purchaseProductId } });
      if (!pp) {
        return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
      }
      if (!resolvedBarcode) {
        resolvedBarcode = pp.barcode;
      }
    }

    // 카테고리 존재 확인
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds as number[] } },
      select: { id: true },
    });
    if (existingCategories.length !== (categoryIds as number[]).length) {
      return next(new AppError(404, "일부 카테고리를 찾을 수 없습니다", "CATEGORY_NOT_FOUND"));
    }

    const product = await prisma.product.create({
      data: {
        barcode: resolvedBarcode,
        purchaseProductId: purchaseProductId ?? null,
        name,
        nameEn,
        nameJa,
        nameZh,
        description,
        sellPrice,
        isDiscount: isDiscount ?? false,
        discountPrice: isDiscount ? (discountPrice ?? null) : null,
        taxType: req.body.taxType ?? "TAXABLE",
        status: status ?? "SELLING",
        categories: { connect: (categoryIds as number[]).map((id: number) => ({ id })) },
        imageUrl,
        kitchenCall: kitchenCall ?? false,
        isPopular: isPopular ?? false,
        isActive: true,
        options: options?.length
          ? {
              create: options.map(
                (opt: {
                  name: string;
                  price: number;
                  isRequired?: boolean;
                  purchaseProductId?: number;
                }) => ({
                  name: opt.name,
                  price: opt.price,
                  isRequired: opt.isRequired ?? false,
                  purchaseProductId: opt.purchaseProductId ?? null,
                }),
              ),
            }
          : undefined,
      },
      include: productInclude,
    });

    // 캐시 무효화
    await invalidateProductCache(categoryIds as number[]);

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
      purchaseProductId,
      name,
      nameEn,
      nameJa,
      nameZh,
      description,
      sellPrice,
      isDiscount,
      discountPrice,
      status,
      categoryIds,
      imageUrl,
      kitchenCall,
      isPopular,
      isActive,
    } = req.body;

    // purchaseProductId 변경 시 검증
    if (purchaseProductId !== undefined && purchaseProductId !== null) {
      const pp = await prisma.purchaseProduct.findUnique({ where: { id: purchaseProductId } });
      if (!pp) {
        return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
      }
    }

    // 카테고리 변경 시 존재 확인
    if (categoryIds !== undefined) {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return next(new AppError(400, "카테고리를 1개 이상 선택해야 합니다", "MISSING_CATEGORIES"));
      }
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds as number[] } },
        select: { id: true },
      });
      if (existingCategories.length !== (categoryIds as number[]).length) {
        return next(new AppError(404, "일부 카테고리를 찾을 수 없습니다", "CATEGORY_NOT_FOUND"));
      }
    }

    // 기존 카테고리 조회 (캐시 무효화용)
    const existingWithCategories = await prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    const oldCategoryIds = existingWithCategories?.categories.map((c) => c.id) ?? [];

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(barcode !== undefined && { barcode }),
        ...(purchaseProductId !== undefined && { purchaseProductId: purchaseProductId }),
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(nameJa !== undefined && { nameJa }),
        ...(nameZh !== undefined && { nameZh }),
        ...(description !== undefined && { description }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(isDiscount !== undefined && { isDiscount }),
        ...(discountPrice !== undefined && { discountPrice: isDiscount ? discountPrice : null }),
        ...(req.body.taxType !== undefined && { taxType: req.body.taxType }),
        ...(status !== undefined && { status }),
        ...(categoryIds !== undefined && {
          categories: { set: (categoryIds as number[]).map((cid: number) => ({ id: cid })) },
        }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(kitchenCall !== undefined && { kitchenCall }),
        ...(isPopular !== undefined && { isPopular }),
        ...(isActive !== undefined && { isActive }),
      },
      include: productInclude,
    });

    // 캐시 무효화 (기존 + 새 카테고리 모두)
    const allCategoryIds = [...new Set([...oldCategoryIds, ...((categoryIds as number[]) ?? [])])];
    await invalidateProductCache(allCategoryIds);

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

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { categories: { select: { id: true } } },
  });
  if (!existing) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }

  // Soft delete
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  // 캐시 무효화
  await invalidateProductCache(existing.categories.map((c) => c.id));

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

    const { name, price, isRequired, purchaseProductId } = req.body;

    if (!name || price === undefined) {
      return next(new AppError(400, "필수 필드가 누락되었습니다 (name, price)", "MISSING_FIELDS"));
    }

    const option = await prisma.productOption.create({
      data: {
        productId,
        name,
        price,
        isRequired: isRequired ?? false,
        purchaseProductId: purchaseProductId ?? null,
      },
    });

    // 캐시 무효화
    const productWithCats = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { select: { id: true } } },
    });
    await invalidateProductCache(productWithCats?.categories.map((c) => c.id) ?? []);

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

    const { name, price, isRequired, purchaseProductId } = req.body;

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(isRequired !== undefined && { isRequired }),
        ...(purchaseProductId !== undefined && { purchaseProductId }),
      },
    });

    // 캐시 무효화
    const optionProductWithCats = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { select: { id: true } } },
    });
    await invalidateProductCache(optionProductWithCats?.categories.map((c) => c.id) ?? []);

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
    const optionProductWithCats = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { select: { id: true } } },
    });
    await invalidateProductCache(optionProductWithCats?.categories.map((c) => c.id) ?? []);

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

    const product = await prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    if (!product) {
      return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });

    // 캐시 무효화
    await invalidateProductCache(product.categories.map((c) => c.id));

    res.json({
      success: true,
      data: updated,
    });
  },
);

// ========== 캐시 관리 ==========

// 캐시 무효화 헬퍼
async function invalidateProductCache(categoryIds?: number[] | null): Promise<void> {
  await cacheService.del(CACHE_KEYS.PRODUCTS);
  if (categoryIds) {
    for (const id of categoryIds) {
      await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(id));
    }
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
