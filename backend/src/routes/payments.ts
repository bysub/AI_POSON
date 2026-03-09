import { Router } from "express";
import { z } from "zod";
import { createPaymentService } from "../services/payment/index.js";
import { logger } from "../utils/logger.js";
import { prisma } from "../utils/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const paymentService = createPaymentService();

// 결제 요청 스키마
const paymentRequestSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  paymentType: z.enum(["CARD", "CASH", "SIMPLE_PAY", "POINT", "MIXED"]),
  paymentMethod: z.string().max(30).optional(),
  vanCode: z
    .enum([
      "NICE",
      "KSNET",
      "KOCES",
      "KICC",
      "KOVAN",
      "JTNET",
      "KIS",
      "KCP",
      "SMARTRO",
      "SPC",
      "FDIK",
    ])
    .optional(),
  installmentMonths: z.number().int().min(0).max(36).optional(),
  idempotencyKey: z.string().min(1),
  receivedAmount: z.number().positive().optional(), // 현금 결제용
  metadata: z.record(z.unknown()).optional(),
});

// 환불 요청 스키마
const refundRequestSchema = z.object({
  originalTransactionId: z.string().min(1),
  refundAmount: z.number().positive(),
  reason: z.enum(["CUSTOMER_REQUEST", "DEFECT", "ORDER_CANCEL", "OTHER"]),
  vanCode: z.enum([
    "NICE",
    "KSNET",
    "KOCES",
    "KICC",
    "KOVAN",
    "JTNET",
    "KIS",
    "KCP",
    "SMARTRO",
    "SPC",
    "FDIK",
  ]),
  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number(),
        amount: z.number(),
      }),
    )
    .optional(),
});

/**
 * POST /api/v1/payments
 * 결제 처리
 */
router.post("/", authenticate, asyncHandler(async (req, res) => {
  try {
    const validationResult = paymentRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "유효하지 않은 요청입니다",
          details: validationResult.error.errors,
        },
      });
    }

    const request = validationResult.data;

    // 현금 결제 검증
    if (request.paymentType === "CASH" && !request.receivedAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "현금 결제 시 receivedAmount가 필요합니다",
        },
      });
    }

    // 카드 결제 시 VAN 코드 기본값
    if (request.paymentType === "CARD" && !request.vanCode) {
      request.vanCode = "NICE"; // 기본 VAN
    }

    logger.info(
      { orderId: request.orderId, paymentType: request.paymentType },
      "Payment: Processing request",
    );

    const result = await paymentService.processPayment(
      request as Parameters<typeof paymentService.processPayment>[0],
    );

    if (result.success) {
      // Payment 레코드를 DB에 저장
      const payment = await prisma.payment.create({
        data: {
          orderId: request.orderId,
          paymentType: request.paymentType,
          amount: request.amount,
          status: "APPROVED",
          vanCode: request.vanCode ?? null,
          approvalNumber: result.approvalNumber ?? null,
          transactionId: result.transactionId ?? null,
        },
      });

      logger.info(
        { paymentId: payment.id, orderId: request.orderId, paymentType: request.paymentType },
        "Payment: DB record created",
      );

      return res.status(200).json({
        success: true,
        data: { ...result, paymentId: payment.id },
      });
    }

    // 실패한 결제도 기록 (선택적)
    await prisma.payment.create({
      data: {
        orderId: request.orderId,
        paymentType: request.paymentType,
        amount: request.amount,
        status: "FAILED",
        vanCode: request.vanCode ?? null,
        errorCode: result.errorCode ?? null,
        errorMessage: result.errorMessage ?? null,
        transactionId: result.transactionId ?? null,
      },
    });

    return res.status(400).json({
      success: false,
      error: {
        code: result.errorCode,
        message: result.errorMessage,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Unexpected error",
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "결제 처리 중 오류가 발생했습니다",
      },
    });
  }
}));

/**
 * POST /api/v1/payments/:transactionId/cancel
 * 결제 취소
 */
router.post("/:transactionId/cancel", authenticate, asyncHandler(async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { vanCode } = req.body;

    if (!vanCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "vanCode가 필요합니다",
        },
      });
    }

    logger.info({ transactionId, vanCode }, "Payment: Cancel request");

    const result = await paymentService.cancelPayment(transactionId, vanCode);

    if (result.success) {
      // DB에서 해당 transactionId의 Payment 상태를 CANCELLED로 업데이트
      await prisma.payment.updateMany({
        where: { transactionId },
        data: { status: "CANCELLED" },
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: result.errorCode,
        message: result.errorMessage,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Cancel error",
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "결제 취소 중 오류가 발생했습니다",
      },
    });
  }
}));

/**
 * POST /api/v1/payments/refund
 * 환불 처리
 */
router.post("/refund", authenticate, asyncHandler(async (req, res) => {
  try {
    const validationResult = refundRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "유효하지 않은 요청입니다",
          details: validationResult.error.errors,
        },
      });
    }

    const { vanCode, ...refundRequest } = validationResult.data;

    logger.info(
      { transactionId: refundRequest.originalTransactionId, vanCode },
      "Payment: Refund request",
    );

    const result = await paymentService.refundPayment(refundRequest, vanCode);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: result.errorCode,
        message: result.errorMessage,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Refund error",
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "환불 처리 중 오류가 발생했습니다",
      },
    });
  }
}));

/**
 * GET /api/v1/payments/:transactionId
 * 거래 상태 조회
 */
router.get("/:transactionId", authenticate, asyncHandler(async (req, res) => {
  try {
    const { transactionId } = req.params;
    const vanCode = req.query.vanCode as string;

    if (!vanCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "vanCode 쿼리 파라미터가 필요합니다",
        },
      });
    }

    const result = await paymentService.getTransactionStatus(
      transactionId,
      vanCode as Parameters<typeof paymentService.getTransactionStatus>[1],
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Status check error",
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "거래 조회 중 오류가 발생했습니다",
      },
    });
  }
}));

/**
 * GET /api/v1/payments/health/van
 * VAN 상태 확인
 */
router.get("/health/van", asyncHandler(async (_req, res) => {
  try {
    const health = await paymentService.checkVanHealth();
    const circuitStatus = paymentService.getCircuitBreakerStatus();

    return res.status(200).json({
      success: true,
      data: {
        van: health,
        circuitBreakers: circuitStatus,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Health check error",
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "상태 확인 중 오류가 발생했습니다",
      },
    });
  }
}));

/**
 * GET /api/v1/payments/stats/summary
 * 결제수단 통계 요약
 */
router.get("/stats/summary", authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "startDate, endDate는 필수입니다" });
  }

  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T23:59:59.999+09:00`);

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { amount: true, status: true, paymentType: true },
  });

  const approvedPayments = payments.filter((p) => p.status === "APPROVED");
  const totalCount = approvedPayments.length;
  const totalAmount = approvedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const failedCount = payments.filter((p) => p.status === "FAILED").length;
  const cancelledCount = payments.filter((p) => p.status === "CANCELLED").length;
  const allCount = payments.length;
  const successRate = allCount > 0 ? Math.round((totalCount / allCount) * 1000) / 10 : 0;

  res.json({
    success: true,
    data: { totalCount, totalAmount, approvedCount: totalCount, failedCount, cancelledCount, successRate },
  });
}));

/**
 * GET /api/v1/payments/stats/by-type
 * 결제수단별 통계
 */
router.get("/stats/by-type", authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "startDate, endDate는 필수입니다" });
  }

  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T23:59:59.999+09:00`);

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { amount: true, status: true, paymentType: true },
  });

  const typeMap = new Map<string, { count: number; amount: number; approved: number; failed: number }>();

  for (const p of payments) {
    const entry = typeMap.get(p.paymentType) ?? { count: 0, amount: 0, approved: 0, failed: 0 };
    entry.count++;
    if (p.status === "APPROVED") {
      entry.approved++;
      entry.amount += Number(p.amount);
    } else if (p.status === "FAILED") {
      entry.failed++;
    }
    typeMap.set(p.paymentType, entry);
  }

  const byType = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.approved,
      amount: data.amount,
      approved: data.approved,
      failed: data.failed,
      successRate: (data.approved + data.failed) > 0 ? Math.round((data.approved / (data.approved + data.failed)) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  res.json({ success: true, data: byType });
}));

/**
 * GET /api/v1/payments/stats/daily
 * 일별 결제 통계
 */
router.get("/stats/daily", authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "startDate, endDate는 필수입니다" });
  }

  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T23:59:59.999+09:00`);

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end }, status: "APPROVED" },
    select: { amount: true, createdAt: true },
  });

  // KST 기준 날짜 키 생성 (UTC → KST +9h)
  const toKstDateKey = (d: Date) => {
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split("T")[0];
  };

  const dailyMap = new Map<string, { count: number; amount: number }>();
  const cursorDate = new Date(`${startDate}T00:00:00+09:00`);
  const endDate_ = new Date(`${endDate}T00:00:00+09:00`);
  while (cursorDate <= endDate_) {
    dailyMap.set(toKstDateKey(cursorDate), { count: 0, amount: 0 });
    cursorDate.setDate(cursorDate.getDate() + 1);
  }

  for (const p of payments) {
    const key = toKstDateKey(p.createdAt);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.count++;
      entry.amount += Number(p.amount);
    }
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, count: d.count, amount: d.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ success: true, data: daily });
}));

/**
 * POST /api/v1/payments/record-failure
 * 결제 실패 기록 저장
 */
router.post("/record-failure", authenticate, asyncHandler(async (req, res) => {
  try {
    const { orderId, amount, paymentType, paymentMethod, errorCode, errorMessage } = req.body;

    if (!orderId || !amount || !paymentType) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "orderId, amount, paymentType는 필수입니다" },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: String(orderId),
        paymentType,
        amount: Number(amount),
        status: "FAILED",
        vanCode: null,
        paymentMethod: paymentMethod ?? null,
        errorCode: errorCode ? String(errorCode).substring(0, 20) : null,
        errorMessage: errorMessage ? String(errorMessage).substring(0, 500) : null,
        transactionId: `FAIL-${Date.now()}`,
      },
    });

    logger.info({ paymentId: payment.id, orderId, paymentType }, "Payment: Failure recorded");

    return res.json({ success: true, data: { paymentId: payment.id } });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Payment: Failed to record failure",
    );
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "결제 실패 기록 저장 중 오류가 발생했습니다" },
    });
  }
}));

/**
 * POST /api/v1/payments/qr-request
 * QR 결제 요청 (PG 간편결제 - 스켈레톤)
 */
router.post("/qr-request", authenticate, asyncHandler(async (req, res) => {
  const { orderId, amount, paymentMethod } = req.body;

  if (!orderId || !amount || !paymentMethod) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "orderId, amount, paymentMethod는 필수입니다" },
    });
  }

  logger.info({ orderId, amount, paymentMethod }, "QR Payment: Request (skeleton)");

  // TODO: 실제 PG API 연동 시 QR URL 생성
  const transactionId = `QR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return res.json({
    success: true,
    data: {
      transactionId,
      qrUrl: null, // PG 연동 시 실제 QR URL 반환
      expiresAt: new Date(Date.now() + 180000).toISOString(),
    },
  });
}));

/**
 * GET /api/v1/payments/qr-status/:transactionId
 * QR 결제 상태 조회 (폴링)
 */
router.get("/qr-status/:transactionId", authenticate, asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  logger.info({ transactionId }, "QR Payment: Status check (skeleton)");

  // TODO: 실제 PG에서 결제 상태 조회
  return res.json({
    success: true,
    data: {
      transactionId,
      status: "PENDING", // PENDING | APPROVED | FAILED
    },
  });
}));

export { router as paymentsRouter };
