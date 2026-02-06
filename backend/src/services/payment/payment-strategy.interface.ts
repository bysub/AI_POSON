import type {
  CardPaymentRequest,
  PaymentResult,
  RefundRequest,
  VanCode,
} from "../../types/payment.js";

/**
 * 결제 전략 인터페이스 (Strategy Pattern)
 * 각 VAN사별로 이 인터페이스를 구현합니다.
 */
export interface IPaymentStrategy {
  readonly vanCode: VanCode;

  /**
   * 결제 승인 요청
   */
  authorize(request: CardPaymentRequest): Promise<PaymentResult>;

  /**
   * 결제 취소
   */
  cancel(transactionId: string): Promise<PaymentResult>;

  /**
   * 환불 처리
   */
  refund(request: RefundRequest): Promise<PaymentResult>;

  /**
   * 거래 상태 조회
   */
  getTransactionStatus(transactionId: string): Promise<PaymentResult>;

  /**
   * VAN 서버 상태 확인
   */
  healthCheck(): Promise<boolean>;
}

/**
 * VAN별 설정
 */
export interface VanConfig {
  vanCode: VanCode;
  apiUrl: string;
  merchantId: string;
  terminalId: string;
  timeout: number;
  retryCount: number;
}

/**
 * VAN별 타임아웃 설정 (ms)
 */
export const VAN_TIMEOUT_CONFIG: Record<VanCode | "default", number> = {
  NICE: 30000,
  KSNET: 25000,
  KOCES: 30000,
  KICC: 45000,
  KOVAN: 45000,
  JTNET: 45000,
  KIS: 30000,
  KCP: 30000,
  SMARTRO: 60000,
  SPC: 30000,
  FDIK: 30000,
  default: 30000,
};

export function getVanTimeout(vanCode: VanCode): number {
  return VAN_TIMEOUT_CONFIG[vanCode] || VAN_TIMEOUT_CONFIG.default;
}
