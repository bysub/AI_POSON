import type {
  IPaymentTerminal,
  PaymentTerminalRequest,
  PaymentTerminalResult,
  TerminalStatus,
} from "../interfaces";

/**
 * VAN 단말기 설정
 */
export interface VanTerminalConfig {
  name?: string;
  port: string;
  baudRate?: number;
  vanCode: string;
  terminalId: string;
}

/**
 * VAN 결제 단말기 구현
 */
export class VanTerminal implements IPaymentTerminal {
  readonly name: string;
  private _isConnected: boolean = false;
  private readonly port: string;
  private readonly baudRate: number;
  private readonly vanCode: string;
  private readonly terminalId: string;

  constructor(config: VanTerminalConfig) {
    this.name = config.name ?? `${config.vanCode} Terminal`;
    this.port = config.port;
    this.baudRate = config.baudRate ?? 9600;
    this.vanCode = config.vanCode;
    this.terminalId = config.terminalId;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 단말기 연결
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`[Terminal] Connecting to ${this.vanCode} terminal on ${this.port}...`);

      // TODO: 실제 시리얼 포트 연결 구현
      await this.delay(100);
      this._isConnected = true;

      console.log(`[Terminal] Connected to ${this.vanCode} terminal`);
      return true;
    } catch (error) {
      console.error("[Terminal] Connection failed:", error);
      return false;
    }
  }

  /**
   * 단말기 연결 해제
   */
  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log("[Terminal] Disconnected");
  }

  /**
   * 카드 결제 요청
   */
  async requestPayment(data: PaymentTerminalRequest): Promise<PaymentTerminalResult> {
    if (!this._isConnected) {
      return {
        success: false,
        errorCode: "NOT_CONNECTED",
        errorMessage: "단말기가 연결되지 않았습니다",
      };
    }

    try {
      console.log(`[Terminal] Payment request: ${data.amount}원`);

      // 결제 요청 전문 생성
      const _request = this.buildPaymentRequest(data);

      // TODO: 실제 시리얼 통신으로 교체 (_request를 시리얼 통신에 사용 예정)
      const response = await this.simulatePayment(data);

      return this.parsePaymentResponse(response);
    } catch (error) {
      return {
        success: false,
        errorCode: "TERMINAL_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(transactionId: string): Promise<PaymentTerminalResult> {
    if (!this._isConnected) {
      return {
        success: false,
        errorCode: "NOT_CONNECTED",
        errorMessage: "단말기가 연결되지 않았습니다",
      };
    }

    try {
      console.log(`[Terminal] Cancel request: ${transactionId}`);

      // TODO: 실제 취소 요청 구현
      await this.delay(500);

      return {
        success: true,
        transactionId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: "CANCEL_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 단말기 상태 확인
   */
  async getStatus(): Promise<TerminalStatus> {
    return {
      connected: this._isConnected,
      terminalId: this.terminalId,
      vanCode: this.vanCode,
    };
  }

  /**
   * 결제 요청 전문 생성 (VAN별 포맷)
   */
  private buildPaymentRequest(data: PaymentTerminalRequest): Buffer {
    // 각 VAN사별 전문 포맷에 맞게 생성
    // 예: NICE, KICC, KIS 등
    const fields = [
      "AP", // 승인 요청
      this.terminalId.padEnd(10, " "),
      data.amount.toString().padStart(12, "0"),
      (data.installmentMonths ?? 0).toString().padStart(2, "0"),
      data.orderId.padEnd(20, " "),
    ];

    return Buffer.from(fields.join(""));
  }

  /**
   * 결제 응답 파싱
   */
  private parsePaymentResponse(response: SimulatedResponse): PaymentTerminalResult {
    if (response.resultCode === "0000") {
      return {
        success: true,
        transactionId: response.transactionId,
        approvalNumber: response.approvalNumber,
        cardName: response.cardName,
        cardNumber: response.cardNumber,
        installmentMonths: response.installmentMonths,
      };
    }

    return {
      success: false,
      errorCode: response.resultCode,
      errorMessage: response.resultMessage,
    };
  }

  /**
   * 결제 시뮬레이션 (개발용)
   */
  private async simulatePayment(data: PaymentTerminalRequest): Promise<SimulatedResponse> {
    // 카드 삽입 대기 시뮬레이션
    console.log("[Terminal] Waiting for card...");
    await this.delay(1000);

    // 승인 처리 시뮬레이션
    console.log("[Terminal] Processing...");
    await this.delay(1500);

    // 랜덤 실패 시뮬레이션 (5%)
    if (Math.random() < 0.05) {
      return {
        resultCode: "1003",
        resultMessage: "한도 초과",
      };
    }

    return {
      resultCode: "0000",
      resultMessage: "정상 승인",
      transactionId: `${this.vanCode}${Date.now()}`,
      approvalNumber: Math.random().toString().substring(2, 10),
      cardName: "삼성카드",
      cardNumber: "****-****-****-1234",
      installmentMonths: data.installmentMonths ?? 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 시뮬레이션 응답 타입
 */
interface SimulatedResponse {
  resultCode: string;
  resultMessage: string;
  transactionId?: string;
  approvalNumber?: string;
  cardName?: string;
  cardNumber?: string;
  installmentMonths?: number;
}
