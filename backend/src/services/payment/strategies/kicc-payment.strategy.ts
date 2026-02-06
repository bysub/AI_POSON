import type {
  CardPaymentRequest,
  PaymentResult,
  RefundRequest,
  VanCode,
} from "../../../types/payment.js";
import type { VanConfig } from "../payment-strategy.interface.js";
import { BasePaymentStrategy } from "./base-payment.strategy.js";
import { logger } from "../../../utils/logger.js";

/**
 * KICC VAN 응답 코드
 */
const KICC_RESPONSE_CODES: Record<string, string> = {
  "00": "정상",
  "01": "카드번호 오류",
  "02": "유효기간 오류",
  "03": "거래한도 초과",
  "04": "분실/도난 카드",
  "05": "잔액 부족",
  "91": "시스템 점검 중",
  "96": "시스템 오류",
  "99": "기타 오류",
};

/**
 * KICC VAN 결제 전략
 */
export class KiccPaymentStrategy extends BasePaymentStrategy {
  readonly vanCode: VanCode = "KICC";

  constructor(config: Partial<VanConfig> = {}) {
    super({ ...config, vanCode: "KICC" });
  }

  /**
   * 결제 승인 구현
   */
  protected async doAuthorize(request: CardPaymentRequest): Promise<PaymentResult> {
    logger.debug(
      { orderId: request.orderId, amount: request.amount },
      "KICC: Sending authorize request",
    );

    const response = await this.simulateVanRequest("authorize", {
      merchantId: this.config.merchantId,
      terminalId: this.config.terminalId,
      orderId: request.orderId,
      amount: request.amount,
      installmentMonths: request.installmentMonths ?? 0,
    });

    return this.parseResponse(response, request.amount);
  }

  /**
   * 결제 취소 구현
   */
  protected async doCancel(transactionId: string): Promise<PaymentResult> {
    logger.debug({ transactionId }, "KICC: Sending cancel request");

    const response = await this.simulateVanRequest("cancel", {
      merchantId: this.config.merchantId,
      terminalId: this.config.terminalId,
      transactionId,
    });

    return this.parseResponse(response);
  }

  /**
   * 환불 처리 구현
   */
  protected async doRefund(request: RefundRequest): Promise<PaymentResult> {
    logger.debug(
      { transactionId: request.originalTransactionId, amount: request.refundAmount },
      "KICC: Sending refund request",
    );

    const response = await this.simulateVanRequest("refund", {
      merchantId: this.config.merchantId,
      terminalId: this.config.terminalId,
      originalTransactionId: request.originalTransactionId,
      refundAmount: request.refundAmount,
      reason: request.reason,
    });

    return this.parseResponse(response, request.refundAmount);
  }

  /**
   * 거래 상태 조회 구현
   */
  protected async doGetTransactionStatus(transactionId: string): Promise<PaymentResult> {
    logger.debug({ transactionId }, "KICC: Checking transaction status");

    const response = await this.simulateVanRequest("status", {
      merchantId: this.config.merchantId,
      transactionId,
    });

    return this.parseResponse(response);
  }

  /**
   * 헬스 체크 구현
   */
  protected async doHealthCheck(): Promise<boolean> {
    try {
      const response = await this.simulateVanRequest("health", {
        merchantId: this.config.merchantId,
      });

      return response.resultCode === "00";
    } catch {
      return false;
    }
  }

  /**
   * VAN 응답 파싱
   */
  private parseResponse(response: SimulatedKiccResponse, amount?: number): PaymentResult {
    const isSuccess = response.resultCode === "00";

    return {
      success: isSuccess,
      transactionId: response.transactionId,
      approvalNumber: response.approvalNumber,
      vanCode: this.vanCode,
      amount,
      errorCode: isSuccess ? undefined : response.resultCode,
      errorMessage: isSuccess
        ? undefined
        : (KICC_RESPONSE_CODES[response.resultCode] ?? response.resultMessage),
      timestamp: new Date(),
    };
  }

  /**
   * VAN 요청 시뮬레이션 (개발용)
   */
  private async simulateVanRequest(
    type: string,
    _params: Record<string, unknown>,
  ): Promise<SimulatedKiccResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));

    if (Math.random() < 0.05) {
      throw new Error("NETWORK_ERROR: Connection failed");
    }

    const transactionId = `KICC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const approvalNumber = Math.random().toString().substring(2, 10);

    return {
      resultCode: "00",
      resultMessage: "정상",
      transactionId: type !== "health" ? transactionId : undefined,
      approvalNumber: type === "authorize" ? approvalNumber : undefined,
    };
  }
}

interface SimulatedKiccResponse {
  resultCode: string;
  resultMessage: string;
  transactionId?: string;
  approvalNumber?: string;
}
