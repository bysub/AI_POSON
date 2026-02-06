import type {
  CardPaymentRequest,
  PaymentResult,
  RefundRequest,
  VanCode,
} from "../../../types/payment.js";
import type { IPaymentStrategy, VanConfig } from "../payment-strategy.interface.js";
import { getVanTimeout } from "../payment-strategy.interface.js";
import { CircuitBreaker } from "../circuit-breaker.js";
import { RetryHandler, getVanRetryConfig } from "../retry-handler.js";
import { logger } from "../../../utils/logger.js";

/**
 * 결제 전략 기본 클래스
 * 공통 기능 제공: Circuit Breaker, Retry, 로깅
 */
export abstract class BasePaymentStrategy implements IPaymentStrategy {
  abstract readonly vanCode: VanCode;

  protected readonly config: VanConfig;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly retryHandler: RetryHandler;

  constructor(config: Partial<VanConfig> & { vanCode: VanCode }) {
    this.config = {
      vanCode: config.vanCode,
      apiUrl: config.apiUrl ?? "",
      merchantId: config.merchantId ?? "",
      terminalId: config.terminalId ?? "",
      timeout: config.timeout ?? getVanTimeout(config.vanCode),
      retryCount: config.retryCount ?? 3,
    };

    this.circuitBreaker = new CircuitBreaker(`VAN_${config.vanCode}`, {
      failureThreshold: 5,
      timeout: 60000, // 1분
    });

    this.retryHandler = new RetryHandler(
      `VAN_${config.vanCode}`,
      getVanRetryConfig(config.vanCode),
    );
  }

  /**
   * 결제 승인 요청
   */
  async authorize(request: CardPaymentRequest): Promise<PaymentResult> {
    const context = {
      vanCode: this.vanCode,
      orderId: request.orderId,
      amount: request.amount,
    };

    logger.info(context, "Payment: Authorize request");

    try {
      const result = await this.circuitBreaker.execute(() =>
        this.retryHandler.execute(() => this.doAuthorize(request), context),
      );

      logger.info(
        { ...context, transactionId: result.transactionId },
        "Payment: Authorize success",
      );

      return result;
    } catch (error) {
      logger.error(
        { ...context, error: error instanceof Error ? error.message : String(error) },
        "Payment: Authorize failed",
      );

      return this.createErrorResult(error);
    }
  }

  /**
   * 결제 취소
   */
  async cancel(transactionId: string): Promise<PaymentResult> {
    const context = { vanCode: this.vanCode, transactionId };

    logger.info(context, "Payment: Cancel request");

    try {
      const result = await this.circuitBreaker.execute(() =>
        this.retryHandler.execute(() => this.doCancel(transactionId), context),
      );

      logger.info(context, "Payment: Cancel success");
      return result;
    } catch (error) {
      logger.error(
        { ...context, error: error instanceof Error ? error.message : String(error) },
        "Payment: Cancel failed",
      );

      return this.createErrorResult(error);
    }
  }

  /**
   * 환불 처리
   */
  async refund(request: RefundRequest): Promise<PaymentResult> {
    const context = {
      vanCode: this.vanCode,
      transactionId: request.originalTransactionId,
      amount: request.refundAmount,
    };

    logger.info(context, "Payment: Refund request");

    try {
      const result = await this.circuitBreaker.execute(() =>
        this.retryHandler.execute(() => this.doRefund(request), context),
      );

      logger.info(context, "Payment: Refund success");
      return result;
    } catch (error) {
      logger.error(
        { ...context, error: error instanceof Error ? error.message : String(error) },
        "Payment: Refund failed",
      );

      return this.createErrorResult(error);
    }
  }

  /**
   * 거래 상태 조회
   */
  async getTransactionStatus(transactionId: string): Promise<PaymentResult> {
    const context = { vanCode: this.vanCode, transactionId };

    try {
      return await this.doGetTransactionStatus(transactionId);
    } catch (error) {
      logger.error(
        { ...context, error: error instanceof Error ? error.message : String(error) },
        "Payment: Status check failed",
      );

      return this.createErrorResult(error);
    }
  }

  /**
   * VAN 서버 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.doHealthCheck();
    } catch (error) {
      logger.warn(
        { vanCode: this.vanCode, error: error instanceof Error ? error.message : String(error) },
        "Payment: Health check failed",
      );
      return false;
    }
  }

  /**
   * Circuit Breaker 상태 조회
   */
  getCircuitStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * 에러 결과 생성
   */
  protected createErrorResult(error: unknown): PaymentResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    let errorCode = "UNKNOWN_ERROR";
    if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      errorCode = "TIMEOUT";
    } else if (errorMessage.includes("Circuit breaker")) {
      errorCode = "SERVICE_UNAVAILABLE";
    } else if (errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED")) {
      errorCode = "NETWORK_ERROR";
    }

    return {
      success: false,
      vanCode: this.vanCode,
      errorCode,
      errorMessage,
      timestamp: new Date(),
    };
  }

  // 추상 메서드 - 하위 클래스에서 구현
  protected abstract doAuthorize(request: CardPaymentRequest): Promise<PaymentResult>;
  protected abstract doCancel(transactionId: string): Promise<PaymentResult>;
  protected abstract doRefund(request: RefundRequest): Promise<PaymentResult>;
  protected abstract doGetTransactionStatus(transactionId: string): Promise<PaymentResult>;
  protected abstract doHealthCheck(): Promise<boolean>;
}
