import type {
  CardPaymentRequest,
  CashPaymentRequest,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  VanCode,
} from "../../types/payment.js";
import type { IPaymentStrategy, VanConfig } from "./payment-strategy.interface.js";
import {
  NicePaymentStrategy,
  KiccPaymentStrategy,
  KisPaymentStrategy,
  SmartroPaymentStrategy,
} from "./strategies/index.js";
import { idempotencyService } from "./idempotency.service.js";
import { logger } from "../../utils/logger.js";

/**
 * VAN Failover 설정
 */
interface VanFailoverConfig {
  primary: VanCode;
  backups: VanCode[];
}

/**
 * 결제 서비스
 * VAN 전략 관리 및 Failover 처리
 */
export class PaymentService {
  private readonly strategies: Map<VanCode, IPaymentStrategy>;
  private readonly failoverConfig: VanFailoverConfig;

  constructor(
    vanConfigs: Partial<Record<VanCode, Partial<VanConfig>>>,
    failoverConfig?: VanFailoverConfig,
  ) {
    this.strategies = new Map();

    // VAN 전략 초기화
    this.initializeStrategy("NICE", vanConfigs.NICE, NicePaymentStrategy);
    this.initializeStrategy("KICC", vanConfigs.KICC, KiccPaymentStrategy);
    this.initializeStrategy("KIS", vanConfigs.KIS, KisPaymentStrategy);
    this.initializeStrategy("SMARTRO", vanConfigs.SMARTRO, SmartroPaymentStrategy);

    // Failover 설정
    this.failoverConfig = failoverConfig ?? {
      primary: "NICE",
      backups: ["KICC", "KIS"],
    };

    logger.info(
      {
        strategies: Array.from(this.strategies.keys()),
        failover: this.failoverConfig,
      },
      "PaymentService: Initialized",
    );
  }

  /**
   * VAN 전략 초기화
   */
  private initializeStrategy<T extends IPaymentStrategy>(
    vanCode: VanCode,
    config: Partial<VanConfig> | undefined,
    StrategyClass: new (config?: Partial<VanConfig>) => T,
  ): void {
    if (config !== undefined) {
      this.strategies.set(vanCode, new StrategyClass(config));
    }
  }

  /**
   * 결제 처리 (카드/현금 통합)
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    // 멱등성 체크
    const existingResult = await idempotencyService.checkAndLock(request.idempotencyKey);

    if (existingResult) {
      return existingResult;
    }

    try {
      let result: PaymentResult;

      if (request.paymentType === "CARD") {
        result = await this.processCardPayment(request as CardPaymentRequest);
      } else if (request.paymentType === "CASH") {
        result = this.processCashPayment(request as CashPaymentRequest);
      } else {
        result = {
          success: false,
          errorCode: "INVALID_PAYMENT_TYPE",
          errorMessage: "지원하지 않는 결제 유형입니다",
          timestamp: new Date(),
        };
      }

      // 결과 저장
      if (result.success) {
        await idempotencyService.complete(request.idempotencyKey, result);
      } else {
        await idempotencyService.fail(request.idempotencyKey, result);
      }

      return result;
    } catch (error) {
      await idempotencyService.unlock(request.idempotencyKey);
      throw error;
    }
  }

  /**
   * 카드 결제 처리 (Failover 지원)
   */
  async processCardPayment(request: CardPaymentRequest): Promise<PaymentResult> {
    const vanCodes = this.getVanOrder(request.vanCode);

    for (const vanCode of vanCodes) {
      const strategy = this.strategies.get(vanCode);

      if (!strategy) {
        logger.warn({ vanCode }, "PaymentService: Strategy not found");
        continue;
      }

      // Circuit Breaker 상태 확인
      const status = (
        strategy as { getCircuitStatus?: () => { state: string } }
      ).getCircuitStatus?.();
      if (status?.state === "OPEN") {
        logger.warn({ vanCode }, "PaymentService: Circuit breaker is open, skipping");
        continue;
      }

      try {
        const result = await strategy.authorize({
          ...request,
          vanCode,
        });

        if (result.success) {
          return result;
        }

        // 재시도 불가능한 에러인 경우 즉시 반환
        if (!this.isRetryableError(result.errorCode)) {
          return result;
        }

        logger.warn(
          { vanCode, errorCode: result.errorCode },
          "PaymentService: Retryable error, trying next VAN",
        );
      } catch (error) {
        logger.error(
          { vanCode, error: error instanceof Error ? error.message : String(error) },
          "PaymentService: VAN request failed",
        );
      }
    }

    return {
      success: false,
      errorCode: "ALL_VAN_FAILED",
      errorMessage: "모든 VAN 결제가 실패했습니다",
      timestamp: new Date(),
    };
  }

  /**
   * 현금 결제 처리
   */
  private processCashPayment(request: CashPaymentRequest): PaymentResult {
    const changeAmount = request.receivedAmount - request.amount;

    if (changeAmount < 0) {
      return {
        success: false,
        errorCode: "INSUFFICIENT_CASH",
        errorMessage: "결제 금액이 부족합니다",
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      transactionId: `CASH${Date.now()}`,
      amount: request.amount,
      changeAmount,
      timestamp: new Date(),
    };
  }

  /**
   * 결제 취소
   */
  async cancelPayment(transactionId: string, vanCode: VanCode): Promise<PaymentResult> {
    const strategy = this.strategies.get(vanCode);

    if (!strategy) {
      return {
        success: false,
        errorCode: "VAN_NOT_FOUND",
        errorMessage: `VAN '${vanCode}'를 찾을 수 없습니다`,
        timestamp: new Date(),
      };
    }

    return strategy.cancel(transactionId);
  }

  /**
   * 환불 처리
   */
  async refundPayment(request: RefundRequest, vanCode: VanCode): Promise<PaymentResult> {
    const strategy = this.strategies.get(vanCode);

    if (!strategy) {
      return {
        success: false,
        errorCode: "VAN_NOT_FOUND",
        errorMessage: `VAN '${vanCode}'를 찾을 수 없습니다`,
        timestamp: new Date(),
      };
    }

    return strategy.refund(request);
  }

  /**
   * 거래 상태 조회
   */
  async getTransactionStatus(transactionId: string, vanCode: VanCode): Promise<PaymentResult> {
    const strategy = this.strategies.get(vanCode);

    if (!strategy) {
      return {
        success: false,
        errorCode: "VAN_NOT_FOUND",
        errorMessage: `VAN '${vanCode}'를 찾을 수 없습니다`,
        timestamp: new Date(),
      };
    }

    return strategy.getTransactionStatus(transactionId);
  }

  /**
   * VAN 상태 확인
   */
  async checkVanHealth(vanCode?: VanCode): Promise<Record<VanCode, boolean>> {
    const results: Record<string, boolean> = {};

    const vanCodes = vanCode ? [vanCode] : Array.from(this.strategies.keys());

    await Promise.all(
      vanCodes.map(async (code) => {
        const strategy = this.strategies.get(code);
        if (strategy) {
          results[code] = await strategy.healthCheck();
        }
      }),
    );

    return results as Record<VanCode, boolean>;
  }

  /**
   * 모든 VAN Circuit Breaker 상태 조회
   */
  getCircuitBreakerStatus(): Record<VanCode, { state: string; failureCount: number }> {
    const results: Record<string, { state: string; failureCount: number }> = {};

    for (const [vanCode, strategy] of this.strategies.entries()) {
      const status = (
        strategy as { getCircuitStatus?: () => { state: string; failureCount: number } }
      ).getCircuitStatus?.();
      if (status) {
        results[vanCode] = {
          state: status.state,
          failureCount: status.failureCount,
        };
      }
    }

    return results as Record<VanCode, { state: string; failureCount: number }>;
  }

  /**
   * VAN 처리 순서 결정
   */
  private getVanOrder(requestedVan?: VanCode): VanCode[] {
    if (requestedVan) {
      // 요청된 VAN 우선, 나머지는 백업 순서
      return [requestedVan, ...this.failoverConfig.backups.filter((v) => v !== requestedVan)];
    }

    // Primary -> Backups 순서
    return [this.failoverConfig.primary, ...this.failoverConfig.backups];
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private isRetryableError(errorCode?: string): boolean {
    const retryableErrors = ["TIMEOUT", "NETWORK_ERROR", "SERVICE_UNAVAILABLE", "SYSTEM_ERROR"];

    return errorCode ? retryableErrors.includes(errorCode) : false;
  }
}

// 기본 인스턴스 (환경 변수에서 설정)
export function createPaymentService(): PaymentService {
  const vanConfigs: Partial<Record<VanCode, Partial<VanConfig>>> = {
    NICE: {
      vanCode: "NICE",
      apiUrl: process.env.NICE_API_URL ?? "",
      merchantId: process.env.NICE_MERCHANT_ID ?? "",
      terminalId: process.env.NICE_TERMINAL_ID ?? "",
    },
    KICC: {
      vanCode: "KICC",
      apiUrl: process.env.KICC_API_URL ?? "",
      merchantId: process.env.KICC_MERCHANT_ID ?? "",
      terminalId: process.env.KICC_TERMINAL_ID ?? "",
    },
    KIS: {
      vanCode: "KIS",
      apiUrl: process.env.KIS_API_URL ?? "",
      merchantId: process.env.KIS_MERCHANT_ID ?? "",
      terminalId: process.env.KIS_TERMINAL_ID ?? "",
    },
    SMARTRO: {
      vanCode: "SMARTRO",
      apiUrl: process.env.SMARTRO_API_URL ?? "",
      merchantId: process.env.SMARTRO_MERCHANT_ID ?? "",
      terminalId: process.env.SMARTRO_TERMINAL_ID ?? "",
    },
  };

  return new PaymentService(vanConfigs);
}
