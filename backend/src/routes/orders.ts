import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { Prisma, OrderStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { createStockMovement } from "./stock-movements.js";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const router = Router();

// 재고 차감이 필요한 상태 (PAID 이후 상태)
const STOCK_DEDUCTED_STATUSES: OrderStatus[] = ["PAID", "PREPARING", "COMPLETED"];

/**
 * 주문 결제완료(PAID) 시 연결된 매입상품 재고 차감
 */
async function deductStockForOrder(
  tx: TransactionClient,
  orderId: string,
  orderNumber: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: {
      product: {
        select: { purchaseProductId: true },
      },
    },
  });

  for (const item of items) {
    const ppId = item.product.purchaseProductId;
    if (!ppId) continue;

    // 재고이동 기록 (stockBefore/After 자동 계산)
    await createStockMovement(tx, {
      purchaseProductId: ppId,
      type: "SALE_OUT",
      quantity: -item.quantity,
      orderId,
      reason: "order_paid",
      memo: `주문번호: ${orderNumber}`,
    });

    // 실제 재고 차감
    await tx.purchaseProduct.update({
      where: { id: ppId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  logger.info({ orderId, orderNumber }, "Stock deducted for order");
}

/**
 * 주문 취소 시 차감된 재고 복구
 */
async function restoreStockForOrder(
  tx: TransactionClient,
  orderId: string,
  orderNumber: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: {
      product: {
        select: { purchaseProductId: true },
      },
    },
  });

  for (const item of items) {
    const ppId = item.product.purchaseProductId;
    if (!ppId) continue;

    // 재고이동 기록 (복구)
    await createStockMovement(tx, {
      purchaseProductId: ppId,
      type: "SALE_CANCEL",
      quantity: item.quantity,
      orderId,
      reason: "order_cancelled",
      memo: `주문번호: ${orderNumber} 취소`,
    });

    // 실제 재고 복구
    await tx.purchaseProduct.update({
      where: { id: ppId },
      data: { stock: { increment: item.quantity } },
    });
  }

  logger.info({ orderId, orderNumber }, "Stock restored for cancelled order");
}

// ========== 키오스크용 API ==========

// Create order (키오스크에서 주문 생성)
router.post("/", async (req, res, next) => {
  const { items, kioskId, orderType, tableNo, memberId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError(400, "Order items are required", "INVALID_ORDER_ITEMS"));
  }

  try {
    // 상품 존재 및 판매 상태 확인
    const productIds = items.map((item: { productId: number }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, status: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items as { productId: number; quantity: number; name: string }[]) {
      const product = productMap.get(item.productId);
      if (!product) {
        return next(
          new AppError(404, `상품을 찾을 수 없습니다: ${item.name}`, "PRODUCT_NOT_FOUND"),
        );
      }
      if (product.status === "SOLD_OUT") {
        return next(new AppError(400, `품절된 상품입니다: ${product.name}`, "PRODUCT_SOLD_OUT"));
      }
      if (product.status !== "SELLING") {
        return next(
          new AppError(400, `판매 중이 아닌 상품입니다: ${product.name}`, "PRODUCT_NOT_AVAILABLE"),
        );
      }
    }

    // Generate order number (format: YYMMDD-NNNN)
    const today = new Date();
    const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, "");
    const orderCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });
    const orderNumber = `${datePrefix}-${String(orderCount + 1).padStart(4, "0")}`;

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0,
    );

    // 주문 생성
    const order = await prisma.order.create({
      data: {
        id: uuidv4(),
        orderNumber,
        kioskId,
        orderType: orderType ?? null,
        tableNo: tableNo ? parseInt(tableNo, 10) : null,
        memberId: memberId ? parseInt(memberId, 10) : null,
        totalAmount,
        status: "PENDING",
        items: {
          create: items.map(
            (item: {
              productId: number;
              name: string;
              price: number;
              quantity: number;
              options?: Prisma.InputJsonValue;
            }) => ({
              product: { connect: { id: item.productId } },
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              options: item.options ?? Prisma.JsonNull,
            }),
          ),
        },
      },
      include: {
        items: true,
      },
    });

    // 캐시 무효화
    await cacheService.del(CACHE_KEYS.PRODUCTS);

    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, "Order created");

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error({ error }, "Failed to create order");
    return next(new AppError(500, "Failed to create order", "ORDER_CREATE_FAILED"));
  }
});

// Get order statistics (관리자 대시보드용) - /:id 보다 먼저 정의해야 함
router.get(
  "/stats/summary",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    const dateFilter = {
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        },
      }),
    };

    const [totalOrders, completedOrders, cancelledOrders, totalRevenue, statusCounts] =
      await Promise.all([
        prisma.order.count({ where: dateFilter }),
        prisma.order.count({ where: { ...dateFilter, status: "COMPLETED" } }),
        prisma.order.count({ where: { ...dateFilter, status: "CANCELLED" } }),
        prisma.order.aggregate({
          where: { ...dateFilter, status: { in: ["PAID", "PREPARING", "COMPLETED"] } },
          _sum: { totalAmount: true },
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: dateFilter,
          _count: true,
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders: totalOrders - completedOrders - cancelledOrders,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        statusBreakdown: statusCounts.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count }),
          {},
        ),
      },
    });
  },
);

// Get daily sales report (관리자) - /:id 보다 먼저 정의해야 함
router.get(
  "/stats/daily",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res) => {
    const { days = "7" } = req.query;
    const daysNum = Math.min(parseInt(days as string), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ["PAID", "PREPARING", "COMPLETED"] },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // 일별 집계
    const dailyMap = new Map<string, { count: number; revenue: number }>();

    for (let i = 0; i < daysNum; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyMap.set(dateKey, { count: 0, revenue: 0 });
    }

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      const current = dailyMap.get(dateKey);
      if (current) {
        current.count++;
        current.revenue += Number(order.totalAmount);
      }
    }

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: dailyStats,
    });
  },
);

// Get order by ID
router.get("/:id", async (req, res, next) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    return next(new AppError(404, "Order not found", "ORDER_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: order,
  });
});

// Update order status
router.patch("/:id/status", async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["PENDING", "PAID", "PREPARING", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return next(new AppError(400, "Invalid status", "INVALID_STATUS"));
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "Order not found", "ORDER_NOT_FOUND"));
    }

    const prevStatus = existing.status as OrderStatus;
    const newStatus = status as OrderStatus;

    // 동일 상태면 재고 처리 없이 그대로 반환
    if (prevStatus === newStatus) {
      return res.json({ success: true, data: existing });
    }

    const order = await prisma.$transaction(async (tx) => {
      // PAID로 전환: 재고 차감
      if (newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await deductStockForOrder(tx, id, existing.orderNumber);
      }

      // CANCELLED로 전환 (이전에 재고 차감된 상태였다면): 재고 복구
      if (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await restoreStockForOrder(tx, id, existing.orderNumber);
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
          ...(newStatus === "CANCELLED" && { cancelledAt: new Date() }),
        },
      });
    });

    // 재고 변경 시 캐시 무효화
    if (
      (newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) ||
      (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus))
    ) {
      await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
      await cacheService.del(CACHE_KEYS.STOCK_MOVEMENTS);
    }

    logger.info({ orderId: id, prevStatus, newStatus }, "Order status updated");

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error({ error, orderId: id }, "Failed to update order status");
    return next(new AppError(500, "주문 상태 변경에 실패했습니다", "STATUS_UPDATE_FAILED"));
  }
});

// ========== 관리자용 API ==========

// Get all orders (페이지네이션, 관리자)
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"),
  async (req, res) => {
    const { page = "1", limit = "20", status, kioskId, startDate, endDate } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status: status as OrderStatus }),
      ...(kioskId && { kioskId: kioskId as string }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        },
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { id: true, name: true, barcode: true } } },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },
);

// Update order (관리자)
router.put(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const { id } = req.params;
    const { kioskId, status, memo } = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "Order not found", "ORDER_NOT_FOUND"));
    }

    // 완료/취소된 주문은 수정 불가
    if (["COMPLETED", "CANCELLED"].includes(existing.status)) {
      return next(
        new AppError(400, "완료되거나 취소된 주문은 수정할 수 없습니다", "ORDER_NOT_MODIFIABLE"),
      );
    }

    const validStatuses = ["PENDING", "PAID", "PREPARING", "COMPLETED", "CANCELLED"];
    if (status && !validStatuses.includes(status)) {
      return next(new AppError(400, "Invalid status", "INVALID_STATUS"));
    }

    try {
      const prevStatus = existing.status as OrderStatus;
      const newStatus = (status ?? existing.status) as OrderStatus;

      const order = await prisma.$transaction(async (tx) => {
        // PAID로 전환: 재고 차감
        if (status && newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
          await deductStockForOrder(tx, id, existing.orderNumber);
        }

        // CANCELLED로 전환 (이전에 재고 차감된 상태였다면): 재고 복구
        if (status && newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
          await restoreStockForOrder(tx, id, existing.orderNumber);
        }

        return tx.order.update({
          where: { id },
          data: {
            ...(kioskId !== undefined && { kioskId }),
            ...(status !== undefined && { status }),
            ...(memo !== undefined && { memo }),
            ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
            ...(newStatus === "CANCELLED" && { cancelledAt: new Date() }),
          },
          include: {
            items: true,
            payments: true,
          },
        });
      });

      // 재고 변경 시 캐시 무효화
      if (
        status &&
        ((newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) ||
          (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)))
      ) {
        await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
        await cacheService.del(CACHE_KEYS.STOCK_MOVEMENTS);
      }

      logger.info({ orderId: id, updates: { kioskId, status, memo } }, "Order updated");

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error({ error, orderId: id }, "Failed to update order");
      return next(new AppError(500, "주문 수정에 실패했습니다", "ORDER_UPDATE_FAILED"));
    }
  },
);

// Cancel order (관리자) - 재고 복구 포함
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!existing) {
      return next(new AppError(404, "Order not found", "ORDER_NOT_FOUND"));
    }

    // 이미 취소된 주문
    if (existing.status === "CANCELLED") {
      return next(new AppError(400, "이미 취소된 주문입니다", "ORDER_ALREADY_CANCELLED"));
    }

    // 완료된 주문은 취소 불가
    if (existing.status === "COMPLETED") {
      return next(new AppError(400, "완료된 주문은 취소할 수 없습니다", "ORDER_NOT_CANCELLABLE"));
    }

    // 결제 완료된 주문은 환불 처리 필요 (경고만)
    const hasPaidPayment = existing.payments.some((p) => p.status === "APPROVED");
    if (hasPaidPayment) {
      logger.warn(
        { orderId: id },
        "Cancelling order with approved payment - refund may be required",
      );
    }

    try {
      const prevStatus = existing.status as OrderStatus;

      await prisma.$transaction(async (tx) => {
        // 재고 차감된 상태(PAID, PREPARING)에서 취소 시 재고 복구
        if (STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
          await restoreStockForOrder(tx, id, existing.orderNumber);
        }

        // 주문 취소 처리
        await tx.order.update({
          where: { id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      });

      // 재고 복구 시 캐시 무효화
      if (STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
        await cacheService.del(CACHE_KEYS.STOCK_MOVEMENTS);
      }

      logger.info({ orderId: id, prevStatus }, "Order cancelled");

      res.json({
        success: true,
        message: "주문이 취소되었습니다",
      });
    } catch (error) {
      logger.error({ error, orderId: id }, "Failed to cancel order");
      return next(new AppError(500, "주문 취소에 실패했습니다", "ORDER_CANCEL_FAILED"));
    }
  },
);

export { router as ordersRouter };
