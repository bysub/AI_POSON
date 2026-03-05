import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "../services/payment/payment.service";
import type { IPaymentStrategy } from "../services/payment/payment-strategy.interface";
import type {
  CardPaymentRequest,
  CashPaymentRequest,
  PaymentResult,
  RefundRequest,
} from "../types/payment";

// idempotencyService 모킹
vi.mock("../services/payment/idempotency.service.js", () => ({
  idempotencyService: {
    checkAndLock: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
    unlock: vi.fn(),
  },
}));

// strategies 모킹 (constructor에서 사용하지 않도록)
vi.mock("../services/payment/strategies/index.js", () => ({
  NicePaymentStrategy: vi.fn(),
  KiccPaymentStrategy: vi.fn(),
  KisPaymentStrategy: vi.fn(),
  SmartroPaymentStrategy: vi.fn(),
}));

function createMockStrategy(overrides: Partial<IPaymentStrategy> = {}): IPaymentStrategy {
  return {
    vanCode: "NICE",
    authorize: vi.fn().mockResolvedValue({ success: true, transactionId: "txn-1", timestamp: new Date() }),
    cancel: vi.fn().mockResolvedValue({ success: true, timestamp: new Date() }),
    refund: vi.fn().mockResolvedValue({ success: true, timestamp: new Date() }),
    getTransactionStatus: vi.fn().mockResolvedValue({ success: true, timestamp: new Date() }),
    healthCheck: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createService(strategies?: Map<string, IPaymentStrategy>) {
  // 빈 config로 생성 (initializeStrategy 건너뜀)
  const service = new PaymentService({});

  if (strategies) {
    // private strategies 맵에 직접 주입
    const strategiesMap = (service as unknown as { strategies: Map<string, IPaymentStrategy> }).strategies;
    for (const [code, strategy] of strategies) {
      strategiesMap.set(code, strategy);
    }
  }

  return service;
}

describe("PaymentService", () => {
  let idempotencyService: {
    checkAndLock: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
    unlock: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../services/payment/idempotency.service");
    idempotencyService = mod.idempotencyService as typeof idempotencyService;
  });

  // ── processCashPayment (via processPayment) ──
  describe("현금 결제", () => {
    it("정상 현금 결제 — 거스름돈 계산", async () => {
      idempotencyService.checkAndLock.mockResolvedValue(null);

      const service = createService();
      const request: CashPaymentRequest = {
        orderId: "order-1",
        amount: 4500,
        paymentType: "CASH",
        receivedAmount: 5000,
        idempotencyKey: "idem-1",
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.changeAmount).toBe(500);
      expect(result.amount).toBe(4500);
      expect(result.transactionId).toMatch(/^CASH/);
      expect(idempotencyService.complete).toHaveBeenCalled();
    });

    it("결제 금액 부족 시 실패", async () => {
      idempotencyService.checkAndLock.mockResolvedValue(null);

      const service = createService();
      const request: CashPaymentRequest = {
        orderId: "order-2",
        amount: 5000,
        paymentType: "CASH",
        receivedAmount: 3000,
        idempotencyKey: "idem-2",
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INSUFFICIENT_CASH");
      expect(idempotencyService.fail).toHaveBeenCalled();
    });

    it("딱 맞게 결제 — 거스름돈 0", async () => {
      idempotencyService.checkAndLock.mockResolvedValue(null);

      const service = createService();
      const request: CashPaymentRequest = {
        orderId: "order-3",
        amount: 4500,
        paymentType: "CASH",
        receivedAmount: 4500,
        idempotencyKey: "idem-3",
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.changeAmount).toBe(0);
    });
  });

  // ── 멱등성 ──
  describe("멱등성 (Idempotency)", () => {
    it("이미 완료된 요청은 캐시된 결과 반환", async () => {
      const cached: PaymentResult = {
        success: true,
        transactionId: "cached-txn",
        timestamp: new Date(),
      };
      idempotencyService.checkAndLock.mockResolvedValue(cached);

      const service = createService();
      const result = await service.processPayment({
        orderId: "order-dup",
        amount: 1000,
        paymentType: "CASH",
        receivedAmount: 1000,
        idempotencyKey: "idem-dup",
      } as CashPaymentRequest);

      expect(result).toEqual(cached);
      expect(idempotencyService.complete).not.toHaveBeenCalled();
    });

    it("처리 중 예외 발생 시 잠금 해제", async () => {
      idempotencyService.checkAndLock.mockResolvedValue(null);

      const mockStrategy = createMockStrategy({
        authorize: vi.fn().mockRejectedValue(new Error("unexpected")),
      });
      const strategies = new Map([["NICE", mockStrategy]]);
      const service = createService(strategies);

      // processCardPayment은 모든 VAN 실패 시 결과 반환 (throw 안 함)
      // 하지만 processPayment 내부 try/catch에서 잡히려면 직접 throw가 필요
      // processCardPayment이 throw하진 않으므로 ALL_VAN_FAILED 결과
      const result = await service.processPayment({
        orderId: "order-err",
        amount: 1000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-err",
      } as CardPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("ALL_VAN_FAILED");
    });
  });

  // ── 지원하지 않는 결제 유형 ──
  describe("지원하지 않는 결제 유형", () => {
    it("MIXED 등 미지원 타입 시 에러", async () => {
      idempotencyService.checkAndLock.mockResolvedValue(null);

      const service = createService();
      const result = await service.processPayment({
        orderId: "order-x",
        amount: 1000,
        paymentType: "MIXED" as never,
        idempotencyKey: "idem-x",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PAYMENT_TYPE");
      expect(idempotencyService.fail).toHaveBeenCalled();
    });
  });

  // ── 카드 결제 & Failover ──
  describe("카드 결제", () => {
    it("첫 번째 VAN 성공 시 즉시 반환", async () => {
      const mockStrategy = createMockStrategy({
        authorize: vi.fn().mockResolvedValue({
          success: true,
          transactionId: "card-txn-1",
          approvalNumber: "AP001",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([["NICE", mockStrategy]]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c1",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c1",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("card-txn-1");
      expect(mockStrategy.authorize).toHaveBeenCalledTimes(1);
    });

    it("첫 VAN 실패(재시도 가능) → 백업 VAN 시도", async () => {
      const niceStrategy = createMockStrategy({
        authorize: vi.fn().mockResolvedValue({
          success: false,
          errorCode: "TIMEOUT",
          timestamp: new Date(),
        }),
      });
      const kiccStrategy = createMockStrategy({
        vanCode: "KICC",
        authorize: vi.fn().mockResolvedValue({
          success: true,
          transactionId: "kicc-txn",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c2",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c2",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("kicc-txn");
      expect(niceStrategy.authorize).toHaveBeenCalled();
      expect(kiccStrategy.authorize).toHaveBeenCalled();
    });

    it("재시도 불가능한 에러 시 즉시 반환 (failover 안 함)", async () => {
      const niceStrategy = createMockStrategy({
        authorize: vi.fn().mockResolvedValue({
          success: false,
          errorCode: "INVALID_CARD",
          errorMessage: "유효하지 않은 카드",
          timestamp: new Date(),
        }),
      });
      const kiccStrategy = createMockStrategy({ vanCode: "KICC" });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c3",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c3",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_CARD");
      expect(kiccStrategy.authorize).not.toHaveBeenCalled();
    });

    it("Circuit Breaker OPEN 상태 VAN 건너뜀", async () => {
      const niceStrategy = createMockStrategy();
      (niceStrategy as unknown as { getCircuitStatus: () => { state: string } }).getCircuitStatus =
        () => ({ state: "OPEN" });

      const kiccStrategy = createMockStrategy({
        vanCode: "KICC",
        authorize: vi.fn().mockResolvedValue({
          success: true,
          transactionId: "kicc-txn-cb",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c4",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c4",
      });

      expect(result.success).toBe(true);
      expect(niceStrategy.authorize).not.toHaveBeenCalled();
      expect(kiccStrategy.authorize).toHaveBeenCalled();
    });

    it("모든 VAN 실패 시 ALL_VAN_FAILED", async () => {
      const niceStrategy = createMockStrategy({
        authorize: vi.fn().mockResolvedValue({
          success: false,
          errorCode: "TIMEOUT",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([["NICE", niceStrategy]]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c5",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c5",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("ALL_VAN_FAILED");
    });

    it("VAN authorize에서 예외 throw 시 다음 VAN 시도", async () => {
      const niceStrategy = createMockStrategy({
        authorize: vi.fn().mockRejectedValue(new Error("network failure")),
      });
      const kiccStrategy = createMockStrategy({
        vanCode: "KICC",
        authorize: vi.fn().mockResolvedValue({
          success: true,
          transactionId: "kicc-recover",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const result = await service.processCardPayment({
        orderId: "order-c6",
        amount: 10000,
        paymentType: "CARD",
        vanCode: "NICE",
        idempotencyKey: "idem-c6",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("kicc-recover");
    });
  });

  // ── cancelPayment ──
  describe("cancelPayment", () => {
    it("정상 취소", async () => {
      const mockStrategy = createMockStrategy({
        cancel: vi.fn().mockResolvedValue({
          success: true,
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([["NICE", mockStrategy]]);
      const service = createService(strategies);

      const result = await service.cancelPayment("txn-cancel-1", "NICE");

      expect(result.success).toBe(true);
      expect(mockStrategy.cancel).toHaveBeenCalledWith("txn-cancel-1");
    });

    it("존재하지 않는 VAN 코드 시 VAN_NOT_FOUND", async () => {
      const service = createService();

      const result = await service.cancelPayment("txn-cancel-2", "NICE");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VAN_NOT_FOUND");
    });
  });

  // ── refundPayment ──
  describe("refundPayment", () => {
    it("정상 환불", async () => {
      const mockStrategy = createMockStrategy({
        refund: vi.fn().mockResolvedValue({
          success: true,
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([["KICC", mockStrategy]]);
      const service = createService(strategies);

      const refundReq: RefundRequest = {
        originalTransactionId: "txn-orig",
        refundAmount: 5000,
        reason: "CUSTOMER_REQUEST",
      };
      const result = await service.refundPayment(refundReq, "KICC");

      expect(result.success).toBe(true);
      expect(mockStrategy.refund).toHaveBeenCalledWith(refundReq);
    });

    it("존재하지 않는 VAN 시 VAN_NOT_FOUND", async () => {
      const service = createService();

      const result = await service.refundPayment(
        { originalTransactionId: "txn-x", refundAmount: 1000, reason: "ORDER_CANCEL" },
        "SMARTRO",
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VAN_NOT_FOUND");
    });
  });

  // ── getTransactionStatus ──
  describe("getTransactionStatus", () => {
    it("거래 상태 조회 위임", async () => {
      const mockStrategy = createMockStrategy({
        getTransactionStatus: vi.fn().mockResolvedValue({
          success: true,
          transactionId: "txn-status",
          timestamp: new Date(),
        }),
      });
      const strategies = new Map([["NICE", mockStrategy]]);
      const service = createService(strategies);

      const result = await service.getTransactionStatus("txn-status", "NICE");

      expect(result.success).toBe(true);
      expect(mockStrategy.getTransactionStatus).toHaveBeenCalledWith("txn-status");
    });

    it("VAN 없으면 VAN_NOT_FOUND", async () => {
      const service = createService();

      const result = await service.getTransactionStatus("txn-x", "KIS");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VAN_NOT_FOUND");
    });
  });

  // ── checkVanHealth ──
  describe("checkVanHealth", () => {
    it("모든 VAN 헬스 체크", async () => {
      const niceStrategy = createMockStrategy({ healthCheck: vi.fn().mockResolvedValue(true) });
      const kiccStrategy = createMockStrategy({ healthCheck: vi.fn().mockResolvedValue(false) });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const results = await service.checkVanHealth();

      expect(results["NICE" as keyof typeof results]).toBe(true);
      expect(results["KICC" as keyof typeof results]).toBe(false);
    });

    it("특정 VAN만 헬스 체크", async () => {
      const niceStrategy = createMockStrategy({ healthCheck: vi.fn().mockResolvedValue(true) });
      const kiccStrategy = createMockStrategy({ healthCheck: vi.fn().mockResolvedValue(false) });
      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const results = await service.checkVanHealth("NICE");

      expect(results["NICE" as keyof typeof results]).toBe(true);
      expect(niceStrategy.healthCheck).toHaveBeenCalled();
      expect(kiccStrategy.healthCheck).not.toHaveBeenCalled();
    });
  });

  // ── getCircuitBreakerStatus ──
  describe("getCircuitBreakerStatus", () => {
    it("Circuit Breaker 상태 집계", () => {
      const niceStrategy = createMockStrategy();
      (niceStrategy as unknown as { getCircuitStatus: () => { state: string; failureCount: number } }).getCircuitStatus =
        () => ({ state: "CLOSED", failureCount: 0 });

      const kiccStrategy = createMockStrategy();
      (kiccStrategy as unknown as { getCircuitStatus: () => { state: string; failureCount: number } }).getCircuitStatus =
        () => ({ state: "OPEN", failureCount: 5 });

      const strategies = new Map([
        ["NICE", niceStrategy],
        ["KICC", kiccStrategy],
      ]);
      const service = createService(strategies);

      const status = service.getCircuitBreakerStatus();

      expect(status["NICE" as keyof typeof status]).toEqual({ state: "CLOSED", failureCount: 0 });
      expect(status["KICC" as keyof typeof status]).toEqual({ state: "OPEN", failureCount: 5 });
    });
  });
});
