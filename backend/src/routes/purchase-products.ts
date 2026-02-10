import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

const CACHE_TTL = 300;

// 매입상품 목록 (거래처별 필터, 검색)
router.get("/", authenticate, async (req, res) => {
  const { supplierId, search, taxType, lCode, mCode, sCode } = req.query;

  const where: Record<string, unknown> = { isActive: true };

  if (supplierId) {
    where.supplierId = parseInt(supplierId as string, 10);
  }

  if (taxType) {
    where.taxType = taxType as string;
  }

  if (lCode) {
    where.lCode = lCode as string;
  }
  if (mCode) {
    where.mCode = mCode as string;
  }
  if (sCode) {
    where.sCode = sCode as string;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { barcode: { contains: search as string } },
    ];
  }

  const products = await prisma.purchaseProduct.findMany({
    where,
    include: {
      supplier: { select: { id: true, code: true, name: true, type: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json({
    success: true,
    data: products,
  });
});

// 매입상품 상세 조회
router.get("/:id", authenticate, async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
  }

  const product = await prisma.purchaseProduct.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, code: true, name: true, type: true } },
    },
  });

  if (!product) {
    return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: product,
  });
});

// 매입상품 등록
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const {
      barcode,
      name,
      sellPrice,
      costPrice,
      taxType,
      supplierId,
      lCode,
      mCode,
      sCode,
      spec,
      productType,
      purchaseCost,
      vatAmount,
      isActive,
      usePurchase,
      useOrder,
      useSales,
      useInventory,
    } = req.body;

    if (!barcode || !name || sellPrice === undefined) {
      return next(new AppError(400, "바코드, 상품명, 판매가는 필수입니다", "MISSING_FIELDS"));
    }

    // 바코드 중복 확인
    const existing = await prisma.purchaseProduct.findUnique({ where: { barcode } });
    if (existing) {
      return next(new AppError(409, "이미 존재하는 바코드입니다", "BARCODE_DUPLICATE"));
    }

    const product = await prisma.purchaseProduct.create({
      data: {
        barcode,
        name,
        sellPrice,
        costPrice: costPrice ?? 0,
        spec: spec || null,
        productType: productType || null,
        purchaseCost: purchaseCost ?? 0,
        vatAmount: vatAmount ?? 0,
        taxType: taxType ?? "TAXABLE",
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        lCode: lCode || null,
        mCode: mCode || null,
        sCode: sCode || null,
        isActive: isActive ?? true,
        usePurchase: usePurchase ?? true,
        useOrder: useOrder ?? true,
        useSales: useSales ?? true,
        useInventory: useInventory ?? true,
      },
      include: {
        supplier: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    await invalidatePurchaseProductCache();

    res.status(201).json({
      success: true,
      data: product,
    });
  },
);

// 매입상품 수정
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
    }

    const existing = await prisma.purchaseProduct.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
    }

    const {
      barcode,
      name,
      sellPrice,
      costPrice,
      taxType,
      supplierId,
      isActive,
      lCode,
      mCode,
      sCode,
      spec,
      productType,
      purchaseCost,
      vatAmount,
      usePurchase,
      useOrder,
      useSales,
      useInventory,
    } = req.body;

    // 바코드 변경 시 중복 확인
    if (barcode && barcode !== existing.barcode) {
      const barcodeExists = await prisma.purchaseProduct.findUnique({ where: { barcode } });
      if (barcodeExists) {
        return next(new AppError(409, "이미 존재하는 바코드입니다", "BARCODE_DUPLICATE"));
      }
    }

    const product = await prisma.purchaseProduct.update({
      where: { id },
      data: {
        ...(barcode !== undefined && { barcode }),
        ...(name !== undefined && { name }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(costPrice !== undefined && { costPrice }),
        ...(spec !== undefined && { spec: spec || null }),
        ...(productType !== undefined && { productType: productType || null }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(vatAmount !== undefined && { vatAmount }),
        ...(taxType !== undefined && { taxType }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(usePurchase !== undefined && { usePurchase }),
        ...(useOrder !== undefined && { useOrder }),
        ...(useSales !== undefined && { useSales }),
        ...(useInventory !== undefined && { useInventory }),
        ...(lCode !== undefined && { lCode: lCode || null }),
        ...(mCode !== undefined && { mCode: mCode || null }),
        ...(sCode !== undefined && { sCode: sCode || null }),
      },
      include: {
        supplier: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    await invalidatePurchaseProductCache();

    res.json({
      success: true,
      data: product,
    });
  },
);

// 매입상품 삭제 (soft delete)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
  }

  const existing = await prisma.purchaseProduct.findUnique({ where: { id } });
  if (!existing) {
    return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
  }

  await prisma.purchaseProduct.update({
    where: { id },
    data: { isActive: false },
  });

  await invalidatePurchaseProductCache();

  res.json({
    success: true,
    message: "매입상품이 삭제되었습니다",
  });
});

// ========== 캐시 관리 ==========

async function invalidatePurchaseProductCache(): Promise<void> {
  await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
}

export { router as purchaseProductsRouter };
