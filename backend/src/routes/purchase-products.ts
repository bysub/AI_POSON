import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// 다음 바코드 번호 자동 생성 (설정 > 바코드/중량 탭 기준)
// ?productType=WEIGHT 이면 중량상품 설정(scaleStartChar + scaleLen) 사용
// 그 외에는 일반상품 설정(barCodeLen) 사용
router.get("/next-barcode", authenticate, asyncHandler(async (req, res) => {
  const productType = (req.query.productType as string) || "";
  const isWeight = productType === "WEIGHT";

  // SystemSetting에서 바코드 설정 조회
  const settingKeys = isWeight
    ? ["barcode.scaleStartChar", "barcode.scaleLen"]
    : ["barcode.barCodeLen"];

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: settingKeys } },
  });
  const settingMap: Record<string, string> = {};
  for (const s of settings) settingMap[s.key] = s.value;

  let prefix: string;
  let totalLen: number;

  if (isWeight) {
    // 중량상품: scaleStartChar(시작문자) + scaleLen(상품코드 자릿수)
    prefix = settingMap["barcode.scaleStartChar"] || "28";
    const codeLen = parseInt(settingMap["barcode.scaleLen"] || "4", 10);
    totalLen = prefix.length + codeLen;
  } else {
    // 일반상품: barCodeLen(프리픽스) + 나머지 = 총 12자리
    prefix = settingMap["barcode.barCodeLen"] || "95";
    totalLen = 12;
  }

  // 해당 프리픽스로 시작하는 바코드 중 가장 큰 값 조회
  const lastProduct = await prisma.purchaseProduct.findFirst({
    where: { barcode: { startsWith: prefix } },
    orderBy: { barcode: "desc" },
    select: { barcode: true },
  });

  let nextBarcode: string;
  if (lastProduct) {
    // 프리픽스 뒤의 숫자 부분만 추출하여 +1
    const codePartLen = totalLen - prefix.length;
    const codePart = lastProduct.barcode.substring(prefix.length, prefix.length + codePartLen);
    const nextNum = parseInt(codePart, 10) + 1;
    nextBarcode = prefix + String(nextNum).padStart(codePartLen, "0");
  } else {
    const padLen = totalLen - prefix.length;
    nextBarcode = prefix + "0".repeat(padLen - 1) + "1";
  }

  res.json({
    success: true,
    data: { barcode: nextBarcode, prefix, productType: isWeight ? "WEIGHT" : "GENERAL" },
  });
}));

// 매입상품 목록 (거래처별 필터, 검색)
router.get("/", authenticate, asyncHandler(async (req, res) => {
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
}));

// 매입상품 상세 조회
router.get("/:id", authenticate, asyncHandler(async (req, res, next) => {
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
}));

// 매입상품 등록
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
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
      safeStock,
    } = req.body;

    if (!barcode || !name || sellPrice === undefined) {
      return next(new AppError(400, "바코드, 상품명, 판매가는 필수입니다", "MISSING_FIELDS"));
    }
    if (!productType) {
      return next(new AppError(400, "상품구분은 필수입니다", "MISSING_FIELDS"));
    }
    if (!lCode) {
      return next(new AppError(400, "분류코드는 필수입니다", "MISSING_FIELDS"));
    }
    if (!taxType) {
      return next(new AppError(400, "과세유형은 필수입니다", "MISSING_FIELDS"));
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
        safeStock: safeStock ?? 0,
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
  }),
);

// 매입상품 수정
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
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
      safeStock,
    } = req.body;

    // 바코드, 상품구분은 수정 불가 (바코드 생성 규칙에 영향)
    if (barcode !== undefined && barcode !== existing.barcode) {
      return next(new AppError(400, "바코드는 수정할 수 없습니다", "BARCODE_IMMUTABLE"));
    }
    if (productType !== undefined && productType !== existing.productType) {
      return next(new AppError(400, "상품구분은 수정할 수 없습니다", "PRODUCT_TYPE_IMMUTABLE"));
    }

    const product = await prisma.purchaseProduct.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(costPrice !== undefined && { costPrice }),
        ...(spec !== undefined && { spec: spec || null }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(vatAmount !== undefined && { vatAmount }),
        ...(taxType !== undefined && { taxType }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(usePurchase !== undefined && { usePurchase }),
        ...(useOrder !== undefined && { useOrder }),
        ...(useSales !== undefined && { useSales }),
        ...(useInventory !== undefined && { useInventory }),
        ...(safeStock !== undefined && { safeStock }),
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
  }),
);

// 매입상품 삭제 (soft delete)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res, next) => {
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
}));

// 재고 동기화 (확정된 매입 데이터 기반으로 stock 재계산)
router.post("/sync-stock", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  // 동기화 전 모든 상품의 현재 stock 저장
  const allProducts = await prisma.purchaseProduct.findMany({
    select: { id: true, stock: true },
  });
  // 취소되지 않은 매입의 항목별 합계 계산
  const stockSums = await prisma.purchaseItem.groupBy({
    by: ["purchaseProductId"],
    where: {
      purchase: { status: { not: "CANCELLED" } },
    },
    _sum: { quantity: true },
  });

  const newStockMap = new Map(
    stockSums.map((item) => [item.purchaseProductId, item._sum.quantity ?? 0]),
  );

  const username = (req as unknown as { user: { username: string } }).user?.username ?? null;

  // 모든 매입상품의 stock을 0으로 초기화 후 합계 반영 + 이동 기록
  await prisma.$transaction(async (tx) => {
    await tx.purchaseProduct.updateMany({
      data: { stock: 0 },
    });

    for (const item of stockSums) {
      if (item._sum.quantity) {
        await tx.purchaseProduct.update({
          where: { id: item.purchaseProductId },
          data: { stock: item._sum.quantity },
        });
      }
    }

    // stock이 변한 상품에 대해 SYNC 이동 기록
    for (const product of allProducts) {
      const newStock = newStockMap.get(product.id) ?? 0;
      if (product.stock !== newStock) {
        await tx.stockMovement.create({
          data: {
            purchaseProductId: product.id,
            type: "SYNC",
            quantity: newStock - product.stock,
            stockBefore: product.stock,
            stockAfter: newStock,
            reason: "sync",
            createdBy: username,
          },
        });
      }
    }
  });

  await invalidatePurchaseProductCache();

  res.json({
    success: true,
    message: `${stockSums.length}개 상품의 재고가 동기화되었습니다`,
  });
}));

// ========== 캐시 관리 ==========

async function invalidatePurchaseProductCache(): Promise<void> {
  await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
}

export { router as purchaseProductsRouter };
