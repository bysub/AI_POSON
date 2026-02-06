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
 * KIS VAN 응답 코드
 */
const KIS_RESPONSE_CODES: Record<string, string> = {
  "0000": "정상 처리",
  "1001": "카드번호 체크 오류",
  "1002": "유효기간 체크 오류",
  "1003": "거래한도 초과",
  "1004": "분실/도난 신고 카드",
  "1005": "잔액 부족",
  "1006": "기 취소된 거래",
  "9000": "시스템 점검",
  "9001": "통신 장애",
  "9999": "기타 오류",
};

/**
 * KIS VAN 결제 전략
 */
export class KisPaymentStrategy extends BasePaymentStrategy {
  readonly vanCode: VanCode = "KIS";

  constructor(config: Partial<VanConfig> = {}) {
    super({ ...config, vanCode: "KIS" });
  }

  /**
   * 결제 승인 구현
   */
  protected async doAuthorize(request: CardPaymentRequest): Promise<PaymentResult> {
    logger.debug(
      { orderId: request.orderId, amount: request.amount },
      "KIS: Sending authorize request",
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
    logger.debug({ transactionId }, "KIS: Sending cancel request");

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
      "KIS: Sending refund request",
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
    logger.debug({ transactionId }, "KIS: Checking transaction status");

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

      return response.resultCode === "0000";
    } catch {
      return false;
    }
  }

  /**
   * VAN 응답 파싱
   */
  private parseResponse(response: SimulatedKisResponse, amount?: number): PaymentResult {
    const isSuccess = response.resultCode === "0000";

    return {
      success: isSuccess,
      transactionId: response.transactionId,
      approvalNumber: response.approvalNumber,
      vanCode: this.vanCode,
      amount,
      errorCode: isSuccess ? undefined : response.resultCode,
      errorMessage: isSuccess
        ? undefined
        : (KIS_RESPONSE_CODES[response.resultCode] ?? response.resultMessage),
      timestamp: new Date(),
    };
  }

  /**
   * VAN 요청 시뮬레이션 (개발용)
   */
  private async simulateVanRequest(
    type: string,
    _params: Record<string, unknown>,
  ): Promise<SimulatedKisResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    if (Math.random() < 0.05) {
      throw new Error("NETWORK_ERROR: Connection failed");
    }

    const transactionId = `KIS${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const approvalNumber = Math.random().toString().substring(2, 10);

    return {
      resultCode: "0000",
      resultMessage: "정상 처리",
      transactionId: type !== "health" ? transactionId : undefined,
      approvalNumber: type === "authorize" ? approvalNumber : undefined,
    };
  }
}

interface SimulatedKisResponse {
  resultCode: string;
  resultMessage: string;
  transactionId?: string;
  approvalNumber?: string;
}
