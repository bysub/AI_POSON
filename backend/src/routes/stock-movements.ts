import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import type { PrismaClient } from "@prisma/client";

const router = Router();

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * 트랜잭션 내에서 재고이동 기록 생성 헬퍼
 */
export async function createStockMovement(
  tx: TransactionClient,
  params: {
    purchaseProductId: number;
    type: string;
    quantity: number;
    purchaseId?: number;
    orderId?: string;
    reason?: string;
    memo?: string;
    createdBy?: string;
  },
) {
  const product = await tx.purchaseProduct.findUniqueOrThrow({
    where: { id: params.purchaseProductId },
    select: { stock: true },
  });

  const stockBefore = product.stock;
  const stockAfter = stockBefore + params.quantity;

  return tx.stockMovement.create({
    data: {
      purchaseProductId: params.purchaseProductId,
      type: params.type,
      quantity: params.quantity,
      stockBefore,
      stockAfter,
      purchaseId: params.purchaseId ?? null,
      orderId: params.orderId ?? null,
      reason: params.reason ?? null,
      memo: params.memo ?? null,
      createdBy: params.createdBy ?? null,
    },
  });
}

// 재고 일괄 조정 (트랜잭션)
router.post(
  "/adjust",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const { items, reason, memo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError(400, "조정할 상품 목록이 필요합니다", "MISSING_ITEMS"));
    }
    if (!reason) {
      return next(new AppError(400, "조정 사유는 필수입니다", "MISSING_REASON"));
    }

    const username = (req as unknown as { user: { username: string } }).user?.username ?? null;

    try {
      const results = await prisma.$transaction(async (tx) => {
        const movements = [];
        for (const item of items as { productId: number; adjustQty: number }[]) {
          if (item.adjustQty === 0) continue;

          // 현재 stock 조회
          const product = await tx.purchaseProduct.findUniqueOrThrow({
            where: { id: item.productId },
            select: { stock: true },
          });

          const stockBefore = product.stock;
          const stockAfter = stockBefore + item.adjustQty;

          // 재고 업데이트
          await tx.purchaseProduct.update({
            where: { id: item.productId },
            data: { stock: { increment: item.adjustQty } },
          });

          // 이동 기록 생성
          const movement = await tx.stockMovement.create({
            data: {
              purchaseProductId: item.productId,
              type: "ADJUSTMENT",
              quantity: item.adjustQty,
              stockBefore,
              stockAfter,
              reason: reason as string,
              memo: (memo as string) || null,
              createdBy: username,
            },
          });
          movements.push(movement);
        }
        return movements;
      });

      await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
      await cacheService.del(CACHE_KEYS.STOCK_MOVEMENTS);

      res.json({
        success: true,
        data: results,
        message: `${results.length}개 상품의 재고가 조정되었습니다`,
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2025") {
        return next(
          new AppError(404, "존재하지 않는 상품이 포함되어 있습니다", "PRODUCT_NOT_FOUND"),
        );
      }
      throw err;
    }
  },
);

// 이력 목록 (필터: productId, type, startDate, endDate + 페이지네이션)
router.get("/", authenticate, async (req, res) => {
  const { productId, type, startDate, endDate, page = "1", limit = "50" } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  if (productId) {
    where.purchaseProductId = parseInt(productId as string, 10);
  }
  if (type) {
    where.type = type as string;
  }
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date((endDate as string) + "T23:59:59.999Z") } : {}),
    };
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        purchaseProduct: {
          select: { id: true, barcode: true, name: true },
        },
        purchase: {
          select: { purchaseCode: true },
        },
        order: {
          select: { orderNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.json({
    success: true,
    data: movements,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// 특정 상품 이력
router.get("/product/:productId", authenticate, async (req, res, next) => {
  const productId = parseInt(req.params.productId, 10);

  if (isNaN(productId)) {
    return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
  }

  const movements = await prisma.stockMovement.findMany({
    where: { purchaseProductId: productId },
    include: {
      purchase: {
        select: { purchaseCode: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.json({
    success: true,
    data: movements,
  });
});

export { router as stockMovementsRouter };
