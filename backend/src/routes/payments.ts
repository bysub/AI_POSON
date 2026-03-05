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
  paymentType: z.enum(["CARD", "CASH"]),
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

export { router as paymentsRouter };
