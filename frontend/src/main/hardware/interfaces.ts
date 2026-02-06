/**
 * 하드웨어 추상화 레이어 (HAL) 인터페이스
 */

/**
 * 프린터 인터페이스
 */
export interface IPrinter {
  readonly name: string;
  readonly isConnected: boolean;

  /**
   * 프린터 연결
   */
  connect(): Promise<boolean>;

  /**
   * 프린터 연결 해제
   */
  disconnect(): Promise<void>;

  /**
   * 영수증 출력
   */
  printReceipt(data: ReceiptData): Promise<PrintResult>;

  /**
   * 주방 전표 출력
   */
  printKitchenOrder(data: KitchenOrderData): Promise<PrintResult>;

  /**
   * 캐시드로어 열기
   */
  openCashDrawer(): Promise<boolean>;

  /**
   * 프린터 상태 확인
   */
  getStatus(): Promise<PrinterStatus>;
}

/**
 * 스캐너 인터페이스
 */
export interface IScanner {
  readonly name: string;
  readonly isConnected: boolean;

  /**
   * 스캐너 연결
   */
  connect(): Promise<boolean>;

  /**
   * 스캐너 연결 해제
   */
  disconnect(): Promise<void>;

  /**
   * 바코드 스캔 이벤트 리스너 등록
   */
  onScan(callback: (barcode: string) => void): void;

  /**
   * 바코드 스캔 이벤트 리스너 해제
   */
  offScan(): void;

  /**
   * 스캐너 상태 확인
   */
  getStatus(): Promise<ScannerStatus>;
}

/**
 * 결제 단말기 인터페이스
 */
export interface IPaymentTerminal {
  readonly name: string;
  readonly isConnected: boolean;

  /**
   * 단말기 연결
   */
  connect(): Promise<boolean>;

  /**
   * 단말기 연결 해제
   */
  disconnect(): Promise<void>;

  /**
   * 카드 결제 요청
   */
  requestPayment(data: PaymentTerminalRequest): Promise<PaymentTerminalResult>;

  /**
   * 결제 취소
   */
  cancelPayment(transactionId: string): Promise<PaymentTerminalResult>;

  /**
   * 단말기 상태 확인
   */
  getStatus(): Promise<TerminalStatus>;
}

// ========================
// Data Types
// ========================

/**
 * 영수증 데이터
 */
export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  businessNumber?: string;
  orderNumber: string;
  orderDate: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cardInfo?: {
    cardName: string;
    approvalNumber: string;
    installmentMonths?: number;
  };
  cashInfo?: {
    receivedAmount: number;
    changeAmount: number;
  };
  footer?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
}

/**
 * 주방 전표 데이터
 */
export interface KitchenOrderData {
  orderNumber: string;
  orderDate: Date;
  tableNumber?: string;
  items: KitchenOrderItem[];
  notes?: string;
}

export interface KitchenOrderItem {
  name: string;
  quantity: number;
  options?: string[];
  notes?: string;
}

/**
 * 출력 결과
 */
export interface PrintResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 프린터 상태
 */
export interface PrinterStatus {
  connected: boolean;
  paperStatus: "ok" | "low" | "empty" | "unknown";
  coverOpen: boolean;
  error?: string;
}

/**
 * 스캐너 상태
 */
export interface ScannerStatus {
  connected: boolean;
  error?: string;
}

/**
 * 결제 단말기 요청
 */
export interface PaymentTerminalRequest {
  amount: number;
  orderId: string;
  installmentMonths?: number;
}

/**
 * 결제 단말기 결과
 */
export interface PaymentTerminalResult {
  success: boolean;
  transactionId?: string;
  approvalNumber?: string;
  cardName?: string;
  cardNumber?: string; // 마스킹됨
  installmentMonths?: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 단말기 상태
 */
export interface TerminalStatus {
  connected: boolean;
  terminalId?: string;
  vanCode?: string;
  error?: string;
}
