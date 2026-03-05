import { Router } from "express";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { orderService, OrderError } from "../services/order.service.js";

const router = Router();

// ─── Zod Schemas ───
const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        options: z.array(z.object({
          optionId: z.number().int().positive(),
          quantity: z.number().int().positive().optional(),
        })).optional(),
      }),
    )
    .min(1, "주문 항목이 필요합니다"),
  kioskId: z.string().optional(),
  orderType: z.enum(["DINE_IN", "TAKEOUT"]).optional(),
  tableNo: z.number().int().positive().optional(),
  memberId: z.number().int().positive().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  paymentType: z.string().optional(),
  receivedAmount: z.number().positive().optional(),
});

/** OrderError → AppError 변환 헬퍼 */
function handleOrderError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof OrderError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "ORDER_ERROR"));
  }
}

// ========== 키오스크용 API ==========

// Create order
router.post("/", asyncHandler(async (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, parsed.error.errors[0]?.message ?? "잘못된 요청입니다", "VALIDATION_ERROR"));
  }

  try {
    const { items, kioskId, orderType, tableNo, memberId } = parsed.data;
    const order = await orderService.createOrder({
      items,
      kioskId,
      orderType,
      tableNo,
      memberId,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    handleOrderError(err, next);
  }
}));

// Get order statistics - /:id 보다 먼저 정의
router.get(
  "/stats/summary",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await orderService.getStatsSummary({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ success: true, data });
  }),
);

// Get daily sales report - /:id 보다 먼저 정의
router.get(
  "/stats/daily",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { days = "7" } = req.query;
    const data = await orderService.getDailyStats(parseInt(days as string));
    res.json({ success: true, data });
  }),
);

// Get order by ID
router.get("/:id", asyncHandler(async (req, res, next) => {
  const order = await orderService.getById(req.params.id);
  if (!order) {
    return next(new AppError(404, "Order not found", "ORDER_NOT_FOUND"));
  }
  res.json({ success: true, data: order });
}));

// Update order status (S-8: 인증 필수)
router.patch("/:id/status", authenticate, asyncHandler(async (req, res, next) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, parsed.error.errors[0]?.message ?? "잘못된 상태값입니다", "VALIDATION_ERROR"));
  }

  try {
    const order = await orderService.updateStatus(req.params.id, parsed.data);
    res.json({ success: true, data: order });
  } catch (err) {
    handleOrderError(err, next);
  }
}));

// ========== 관리자용 API ==========

// Get all orders (페이지네이션)
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "20", status, kioskId, startDate, endDate } = req.query;
    const result = await orderService.list({
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 100),
      status: status as OrderStatus | undefined,
      kioskId: kioskId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ success: true, data: result.orders, pagination: result.pagination });
  }),
);

// Update order (관리자)
router.put(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { kioskId, status, memo } = req.body;
    try {
      const order = await orderService.updateOrder(req.params.id, { kioskId, status, memo });
      res.json({ success: true, data: order });
    } catch (err) {
      handleOrderError(err, next);
    }
  }),
);

// Cancel order (관리자)
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    try {
      await orderService.cancelOrder(req.params.id);
      res.json({ success: true, message: "주문이 취소되었습니다" });
    } catch (err) {
      handleOrderError(err, next);
    }
  }),
);

// Payment 레코드 백필
router.post(
  "/backfill-payments",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (_req, res) => {
    const result = await orderService.backfillPayments();
    res.json({
      success: true,
      message: result.count === 0 ? "백필 대상 없음" : `${result.count}건 백필 완료`,
      count: result.count,
    });
  }),
);

export { router as ordersRouter };
