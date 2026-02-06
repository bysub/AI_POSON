// VAN 코드
export type VanCode =
  | "NICE"
  | "KSNET"
  | "KOCES"
  | "KICC"
  | "KOVAN"
  | "JTNET"
  | "KIS"
  | "KCP"
  | "SMARTRO"
  | "SPC"
  | "FDIK";

// 결제 상태
export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIAL_REF"
  | "FAILED";

// 결제 유형
export type PaymentType = "CARD" | "CASH" | "MIXED";

// 결제 요청
export interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentType: PaymentType;
  vanCode?: VanCode;
  installmentMonths?: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

// 카드 결제 요청
export interface CardPaymentRequest extends PaymentRequest {
  paymentType: "CARD";
  vanCode: VanCode;
}

// 현금 결제 요청
export interface CashPaymentRequest extends PaymentRequest {
  paymentType: "CASH";
  receivedAmount: number;
  phoneNumber?: string; // 현금영수증용
}

// 결제 결과
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  approvalNumber?: string;
  vanCode?: VanCode;
  amount?: number;
  changeAmount?: number; // 현금 거스름돈
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

// 환불 요청
export interface RefundRequest {
  originalTransactionId: string;
  refundAmount: number;
  reason: RefundReason;
  items?: RefundItem[];
}

export type RefundReason = "CUSTOMER_REQUEST" | "DEFECT" | "ORDER_CANCEL" | "OTHER";

export interface RefundItem {
  productId: number;
  quantity: number;
  amount: number;
}

// VAN 응답 (통합)
export interface VanResponse {
  resultCode: string;
  resultMessage: string;
  approvalNumber?: string;
  transactionId?: string;
  vanCode: VanCode;
  rawResponse?: unknown;
}

// 멱등성 레코드
export interface IdempotencyRecord {
  key: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  result?: PaymentResult;
  createdAt: Date;
  expiresAt: Date;
}
