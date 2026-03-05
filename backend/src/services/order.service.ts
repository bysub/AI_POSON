import { v4 as uuidv4 } from "uuid";
import { Prisma, OrderStatus, PaymentType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { logger } from "../utils/logger.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { createStockMovement } from "../routes/stock-movements.js";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// 재고 차감이 필요한 상태 (PAID 이후 상태)
const STOCK_DEDUCTED_STATUSES: OrderStatus[] = ["PAID", "PREPARING", "COMPLETED"];
const VALID_STATUSES: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "COMPLETED", "CANCELLED"];

export interface CreateOrderInput {
  items: Array<{
    productId: number;
    quantity: number;
    options?: Prisma.InputJsonValue;
  }>;
  kioskId?: string;
  orderType?: string;
  tableNo?: number;
  memberId?: number;
}

export interface UpdateStatusInput {
  status: OrderStatus;
  paymentType?: string;
  receivedAmount?: number;
}

export interface OrderListQuery {
  page: number;
  limit: number;
  status?: OrderStatus;
  kioskId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export class OrderService {
  /**
   * 주문 결제완료(PAID) 시 연결된 매입상품 재고 차감
   */
  async deductStockForOrder(
    tx: TransactionClient,
    orderId: string,
    orderNumber: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { product: { select: { purchaseProductId: true } } },
    });

    for (const item of items) {
      const ppId = item.product.purchaseProductId;
      if (!ppId) continue;

      await createStockMovement(tx, {
        purchaseProductId: ppId,
        type: "SALE_OUT",
        quantity: -item.quantity,
        orderId,
        reason: "order_paid",
        memo: `주문번호: ${orderNumber}`,
      });

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
  async restoreStockForOrder(
    tx: TransactionClient,
    orderId: string,
    orderNumber: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { product: { select: { purchaseProductId: true } } },
    });

    for (const item of items) {
      const ppId = item.product.purchaseProductId;
      if (!ppId) continue;

      await createStockMovement(tx, {
        purchaseProductId: ppId,
        type: "SALE_CANCEL",
        quantity: item.quantity,
        orderId,
        reason: "order_cancelled",
        memo: `주문번호: ${orderNumber} 취소`,
      });

      await tx.purchaseProduct.update({
        where: { id: ppId },
        data: { stock: { increment: item.quantity } },
      });
    }

    logger.info({ orderId, orderNumber }, "Stock restored for cancelled order");
  }

  /**
   * 재고 변경 관련 캐시 무효화
   */
  async invalidateStockCache(): Promise<void> {
    await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
    await cacheService.del(CACHE_KEYS.STOCK_MOVEMENTS);
  }

  /**
   * 주문 생성 (키오스크)
   */
  async createOrder(input: CreateOrderInput) {
    const { items, kioskId, orderType, tableNo, memberId } = input;

    // 상품 존재 및 판매 상태 확인 + 서버 가격 조회 (S-7)
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, status: true, sellPrice: true, isDiscount: true, discountPrice: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 상품 유효성 검증
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new OrderError(404, `상품을 찾을 수 없습니다: ID ${item.productId}`, "PRODUCT_NOT_FOUND");
      }
      if (product.status === "SOLD_OUT") {
        throw new OrderError(400, `품절된 상품입니다: ${product.name}`, "PRODUCT_SOLD_OUT");
      }
      if (product.status !== "SELLING") {
        throw new OrderError(400, `판매 중이 아닌 상품입니다: ${product.name}`, "PRODUCT_NOT_AVAILABLE");
      }
    }

    // 서버에서 DB 가격 기준으로 합계 재계산
    const totalAmount = items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.isDiscount && product.discountPrice != null
        ? Number(product.discountPrice)
        : Number(product.sellPrice);
      return sum + unitPrice * item.quantity;
    }, 0);

    // 트랜잭션으로 주문번호 생성 + 주문 생성
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);

      return tx.order.create({
        data: {
          id: uuidv4(),
          orderNumber,
          kioskId: kioskId ?? null,
          orderType: orderType ?? null,
          tableNo: tableNo != null ? tableNo : null,
          memberId: memberId != null ? memberId : null,
          totalAmount,
          status: "PENDING",
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              const serverPrice = product.isDiscount && product.discountPrice != null
                ? Number(product.discountPrice)
                : Number(product.sellPrice);
              return {
                product: { connect: { id: item.productId } },
                name: product.name,
                price: serverPrice,
                quantity: item.quantity,
                options: item.options ?? Prisma.JsonNull,
              };
            }),
          },
        },
        include: { items: true },
      });
    });

    await cacheService.del(CACHE_KEYS.PRODUCTS);
    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, "Order created");

    return order;
  }

  /**
   * 주문번호 생성 (YYMMDD-NNNN)
   * R-1: 트랜잭션 내에서 호출하여 Race Condition 방지
   */
  async generateOrderNumber(tx: TransactionClient): Promise<string> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const datePrefix = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const lastOrder = await tx.order.findFirst({
      where: { createdAt: { gte: startOfDay } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    let seq = 1;
    if (lastOrder?.orderNumber) {
      const parts = lastOrder.orderNumber.split("-");
      if (parts.length === 2) {
        seq = parseInt(parts[1], 10) + 1;
      }
    }

    return `${datePrefix}-${String(seq).padStart(4, "0")}`;
  }

  /**
   * 주문 상태 변경 (재고 차감/복구 포함)
   */
  async updateStatus(orderId: string, input: UpdateStatusInput) {
    const { status: newStatus, paymentType, receivedAmount } = input;

    if (!VALID_STATUSES.includes(newStatus)) {
      throw new OrderError(400, "Invalid status", "INVALID_STATUS");
    }

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new OrderError(404, "Order not found", "ORDER_NOT_FOUND");
    }

    const prevStatus = existing.status as OrderStatus;

    // 동일 상태면 재고 처리 없이 반환
    if (prevStatus === newStatus) {
      return existing;
    }

    const order = await prisma.$transaction(async (tx) => {
      // PAID로 전환: 재고 차감
      if (newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await this.deductStockForOrder(tx, orderId, existing.orderNumber);
      }

      // CANCELLED로 전환: 재고 복구
      if (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await this.restoreStockForOrder(tx, orderId, existing.orderNumber);
      }

      // PAID 전환 시 Payment 레코드 생성
      if (newStatus === "PAID" && paymentType) {
        await tx.payment.create({
          data: {
            orderId,
            paymentType: paymentType as PaymentType,
            amount: existing.totalAmount,
            receivedAmount: paymentType === "CASH" && receivedAmount ? receivedAmount : null,
            status: "APPROVED",
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
          ...(newStatus === "CANCELLED" && { cancelledAt: new Date() }),
        },
      });
    });

    // 재고 변경 시 캐시 무효화
    const stockChanged =
      (newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) ||
      (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus));
    if (stockChanged) {
      await this.invalidateStockCache();
    }

    logger.info({ orderId, prevStatus, newStatus }, "Order status updated");
    return order;
  }

  /**
   * 주문 조회
   */
  async getById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
  }

  /**
   * 주문 목록 (페이지네이션)
   */
  async list(query: OrderListQuery) {
    const { page, limit, status, kioskId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(kioskId && { kioskId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
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
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 주문 수정 (관리자)
   */
  async updateOrder(
    orderId: string,
    data: { kioskId?: string; status?: OrderStatus; memo?: string },
  ) {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new OrderError(404, "Order not found", "ORDER_NOT_FOUND");
    }

    if (["COMPLETED", "CANCELLED"].includes(existing.status)) {
      throw new OrderError(400, "완료되거나 취소된 주문은 수정할 수 없습니다", "ORDER_NOT_MODIFIABLE");
    }

    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new OrderError(400, "Invalid status", "INVALID_STATUS");
    }

    const prevStatus = existing.status as OrderStatus;
    const newStatus = (data.status ?? existing.status) as OrderStatus;

    const order = await prisma.$transaction(async (tx) => {
      if (data.status && newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await this.deductStockForOrder(tx, orderId, existing.orderNumber);
      }
      if (data.status && newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await this.restoreStockForOrder(tx, orderId, existing.orderNumber);
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          ...(data.kioskId !== undefined && { kioskId: data.kioskId }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.memo !== undefined && { memo: data.memo }),
          ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
          ...(newStatus === "CANCELLED" && { cancelledAt: new Date() }),
        },
        include: { items: true, payments: true },
      });
    });

    if (
      data.status &&
      ((newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) ||
        (newStatus === "CANCELLED" && STOCK_DEDUCTED_STATUSES.includes(prevStatus)))
    ) {
      await this.invalidateStockCache();
    }

    logger.info({ orderId, updates: data }, "Order updated");
    return order;
  }

  /**
   * 주문 취소 (관리자, 재고 복구 포함)
   */
  async cancelOrder(orderId: string) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!existing) {
      throw new OrderError(404, "Order not found", "ORDER_NOT_FOUND");
    }
    if (existing.status === "CANCELLED") {
      throw new OrderError(400, "이미 취소된 주문입니다", "ORDER_ALREADY_CANCELLED");
    }
    if (existing.status === "COMPLETED") {
      throw new OrderError(400, "완료된 주문은 취소할 수 없습니다", "ORDER_NOT_CANCELLABLE");
    }

    const hasPaidPayment = existing.payments.some((p) => p.status === "APPROVED");
    if (hasPaidPayment) {
      logger.warn({ orderId }, "Cancelling order with approved payment - refund may be required");
    }

    const prevStatus = existing.status as OrderStatus;

    await prisma.$transaction(async (tx) => {
      if (STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
        await this.restoreStockForOrder(tx, orderId, existing.orderNumber);
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    });

    if (STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
      await this.invalidateStockCache();
    }

    logger.info({ orderId, prevStatus }, "Order cancelled");
  }

  /**
   * 주문 통계 요약
   */
  async getStatsSummary(dateRange: DateRange) {
    const dateFilter = {
      ...((dateRange.startDate || dateRange.endDate) && {
        createdAt: {
          ...(dateRange.startDate && { gte: new Date(dateRange.startDate) }),
          ...(dateRange.endDate && { lte: new Date(dateRange.endDate) }),
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

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders: totalOrders - completedOrders - cancelledOrders,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      statusBreakdown: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * 일별 매출 리포트
   */
  async getDailyStats(days: number) {
    const daysNum = Math.min(days, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ["PAID", "PREPARING", "COMPLETED"] },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const dailyMap = new Map<string, { count: number; revenue: number }>();
    for (let i = 0; i < daysNum; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyMap.set(date.toISOString().split("T")[0], { count: 0, revenue: 0 });
    }

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      const current = dailyMap.get(dateKey);
      if (current) {
        current.count++;
        current.revenue += Number(order.totalAmount);
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Payment 레코드 백필
   */
  async backfillPayments() {
    const ordersWithoutPayment = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PREPARING", "COMPLETED"] },
        payments: { none: {} },
      },
      select: { id: true, totalAmount: true, orderNumber: true },
    });

    if (ordersWithoutPayment.length === 0) {
      return { count: 0 };
    }

    const created = await prisma.payment.createMany({
      data: ordersWithoutPayment.map((order) => ({
        orderId: order.id,
        paymentType: "CASH" as const,
        amount: order.totalAmount,
        status: "APPROVED" as const,
      })),
    });

    logger.info({ count: created.count }, "Payment records backfilled");
    return { count: created.count };
  }
}

/**
 * 주문 관련 에러 (Route에서 AppError로 변환)
 */
export class OrderError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export const orderService = new OrderService();
