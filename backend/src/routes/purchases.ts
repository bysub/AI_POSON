import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

const CACHE_TTL = 300;

// 매입 코드 자동생성 (P20260206-001 형식)
async function generatePurchaseCode(): Promise<string> {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  const prefix = `P${dateStr}`;

  const latest = await prisma.purchase.findFirst({
    where: { purchaseCode: { startsWith: prefix } },
    orderBy: { purchaseCode: "desc" },
    select: { purchaseCode: true },
  });

  if (!latest) return `${prefix}-001`;

  const seq = parseInt(latest.purchaseCode.split("-")[1], 10);
  return `${prefix}-${String(seq + 1).padStart(3, "0")}`;
}

// Get all purchases (필터/페이지네이션)
router.get("/", authenticate, async (req, res) => {
  const { page = "1", limit = "20", supplierId, status, startDate, endDate, search } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  if (supplierId) {
    where.supplierId = parseInt(supplierId as string, 10);
  }

  if (status) {
    where.status = status as string;
  }

  if (startDate || endDate) {
    where.purchaseDate = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { purchaseCode: { contains: search as string, mode: "insensitive" } },
      { supplier: { name: { contains: search as string, mode: "insensitive" } } },
      { memo: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true, type: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { purchaseDate: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.purchase.count({ where }),
  ]);

  res.json({
    success: true,
    data: purchases,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// 통계 API (/:id 보다 먼저 선언)
router.get("/stats/summary", authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;

  const where: Record<string, unknown> = {
    status: { not: "CANCELLED" },
  };

  if (startDate || endDate) {
    where.purchaseDate = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const [totalResult, count] = await Promise.all([
    prisma.purchase.aggregate({
      where,
      _sum: { totalAmount: true, taxAmount: true },
    }),
    prisma.purchase.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      totalAmount: totalResult._sum.totalAmount ?? 0,
      taxAmount: totalResult._sum.taxAmount ?? 0,
      count,
    },
  });
});

// Get purchase by ID (상세 조회)
router.get("/:id", authenticate, async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: {
        select: { id: true, code: true, name: true, type: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, barcode: true, name: true, sellPrice: true, costPrice: true },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!purchase) {
    return next(new AppError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: purchase,
  });
});

// Create purchase (매입 등록)
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const { supplierId, purchaseDate, items, memo, taxIncluded = true } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError(400, "거래처와 매입 상품은 필수입니다", "MISSING_FIELDS"));
    }

    // 거래처 존재 확인
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(supplierId, 10) },
    });
    if (!supplier) {
      return next(new AppError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND"));
    }

    // 상품 존재 확인
    const productIds = items.map((item: { productId: number }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const existingIds = new Set(products.map((p) => p.id));
    const missingIds = productIds.filter((id: number) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return next(
        new AppError(
          404,
          `존재하지 않는 상품이 포함되어 있습니다 (ID: ${missingIds.join(", ")})`,
          "PRODUCT_NOT_FOUND",
        ),
      );
    }

    const purchaseCode = await generatePurchaseCode();

    // 합계 계산
    let totalAmount = 0;
    const purchaseItems = items.map(
      (item: { productId: number; quantity: number; unitPrice: number; sellPrice: number }) => {
        const amount = item.quantity * item.unitPrice;
        totalAmount += amount;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellPrice: item.sellPrice ?? 0,
          amount,
        };
      },
    );

    // 부가세 계산: 포함이면 totalAmount/11, 별도면 totalAmount*0.1
    const taxAmount = taxIncluded ? Math.round(totalAmount / 11) : Math.round(totalAmount * 0.1);

    const purchase = await prisma.purchase.create({
      data: {
        purchaseCode,
        supplierId: parseInt(supplierId, 10),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        totalAmount,
        taxAmount,
        taxIncluded: !!taxIncluded,
        status: "CONFIRMED",
        memo: memo || null,
        createdBy: (req as unknown as { user: { username: string } }).user?.username ?? null,
        items: {
          create: purchaseItems,
        },
      },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, type: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, barcode: true, name: true, sellPrice: true, costPrice: true },
            },
          },
        },
      },
    });

    await invalidatePurchaseCache();

    res.status(201).json({
      success: true,
      data: purchase,
    });
  },
);

// Update purchase (매입 수정 - DRAFT 상태만)
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
    }

    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND"));
    }

    if (existing.status === "CANCELLED") {
      return next(new AppError(400, "취소된 매입은 수정할 수 없습니다", "PURCHASE_CANCELLED"));
    }

    const { supplierId, purchaseDate, items, memo, status, taxIncluded } = req.body;

    const updateData: Record<string, unknown> = {};
    if (supplierId !== undefined) updateData.supplierId = parseInt(supplierId, 10);
    if (purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseDate);
    if (memo !== undefined) updateData.memo = memo || null;
    if (status !== undefined) updateData.status = status;
    if (taxIncluded !== undefined) updateData.taxIncluded = !!taxIncluded;

    // 상품 항목 업데이트
    if (items && Array.isArray(items)) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });

      let totalAmount = 0;
      const purchaseItems = items.map(
        (item: { productId: number; quantity: number; unitPrice: number; sellPrice: number }) => {
          const amount = item.quantity * item.unitPrice;
          totalAmount += amount;
          return {
            purchaseId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sellPrice: item.sellPrice ?? 0,
            amount,
          };
        },
      );

      await prisma.purchaseItem.createMany({ data: purchaseItems });
      updateData.totalAmount = totalAmount;
      const isTaxIncluded = taxIncluded !== undefined ? !!taxIncluded : existing.taxIncluded;
      updateData.taxAmount = isTaxIncluded
        ? Math.round(totalAmount / 11)
        : Math.round(totalAmount * 0.1);
    }

    const purchase = await prisma.purchase.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: { id: true, code: true, name: true, type: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, barcode: true, name: true, sellPrice: true, costPrice: true },
            },
          },
        },
      },
    });

    await invalidatePurchaseCache(id);

    res.json({
      success: true,
      data: purchase,
    });
  },
);

// Cancel purchase (매입 취소)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
  }

  const existing = await prisma.purchase.findUnique({ where: { id } });
  if (!existing) {
    return next(new AppError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND"));
  }

  if (existing.status === "CANCELLED") {
    return next(new AppError(400, "이미 취소된 매입입니다", "PURCHASE_ALREADY_CANCELLED"));
  }

  await prisma.purchase.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await invalidatePurchaseCache(id);

  res.json({
    success: true,
    message: "매입이 취소되었습니다",
  });
});

// ========== 캐시 관리 ==========

async function invalidatePurchaseCache(id?: number): Promise<void> {
  await cacheService.del(CACHE_KEYS.PURCHASES);
  if (id) {
    await cacheService.del(CACHE_KEYS.PURCHASE(id));
  }
}

export { router as purchasesRouter };
