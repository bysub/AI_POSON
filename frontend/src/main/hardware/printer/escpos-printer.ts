import type {
  IPrinter,
  ReceiptData,
  KitchenOrderData,
  PrintResult,
  PrinterStatus,
} from "../interfaces";

/**
 * ESC/POS 명령어
 */
const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  // 초기화
  INIT: [ESC, 0x40],

  // 정렬
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // 폰트 크기
  FONT_NORMAL: [GS, 0x21, 0x00],
  FONT_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  FONT_DOUBLE_WIDTH: [GS, 0x21, 0x10],
  FONT_DOUBLE_BOTH: [GS, 0x21, 0x11],

  // 강조
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],

  // 밑줄
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],

  // 줄바꿈
  LINE_FEED: [0x0a],

  // 용지 자르기
  CUT_PAPER: [GS, 0x56, 0x00],
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01],

  // 캐시드로어
  OPEN_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa],

  // 바코드
  BARCODE_HEIGHT: [GS, 0x68, 0x50],
  BARCODE_WIDTH: [GS, 0x77, 0x02],
  BARCODE_TEXT_BELOW: [GS, 0x48, 0x02],
  BARCODE_CODE128: [GS, 0x6b, 0x49],
};

/**
 * ESC/POS 프린터 구현
 */
export class EscPosPrinter implements IPrinter {
  readonly name: string;
  private _isConnected: boolean = false;
  private port: string;
  private baudRate: number;
  private encoding: string;

  constructor(config: { name?: string; port: string; baudRate?: number; encoding?: string }) {
    this.name = config.name ?? "ESC/POS Printer";
    this.port = config.port;
    this.baudRate = config.baudRate ?? 9600;
    this.encoding = config.encoding ?? "euc-kr";
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 프린터 연결
   */
  async connect(): Promise<boolean> {
    try {
      // TODO: 실제 시리얼 포트 연결 구현
      // Node.js serialport 라이브러리 사용
      console.log(`[Printer] Connecting to ${this.port}...`);

      // 시뮬레이션
      await this.delay(100);
      this._isConnected = true;

      console.log(`[Printer] Connected to ${this.port}`);
      return true;
    } catch (error) {
      console.error("[Printer] Connection failed:", error);
      return false;
    }
  }

  /**
   * 프린터 연결 해제
   */
  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log("[Printer] Disconnected");
  }

  /**
   * 영수증 출력
   */
  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    if (!this._isConnected) {
      return {
        success: false,
        errorCode: "NOT_CONNECTED",
        errorMessage: "프린터가 연결되지 않았습니다",
      };
    }

    try {
      const buffer = this.buildReceiptBuffer(data);
      await this.sendToDevice(buffer);

      console.log("[Printer] Receipt printed");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errorCode: "PRINT_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 주방 전표 출력
   */
  async printKitchenOrder(data: KitchenOrderData): Promise<PrintResult> {
    if (!this._isConnected) {
      return {
        success: false,
        errorCode: "NOT_CONNECTED",
        errorMessage: "프린터가 연결되지 않았습니다",
      };
    }

    try {
      const buffer = this.buildKitchenOrderBuffer(data);
      await this.sendToDevice(buffer);

      console.log("[Printer] Kitchen order printed");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errorCode: "PRINT_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 캐시드로어 열기
   */
  async openCashDrawer(): Promise<boolean> {
    if (!this._isConnected) {
      return false;
    }

    try {
      await this.sendToDevice(Buffer.from(COMMANDS.OPEN_DRAWER));
      console.log("[Printer] Cash drawer opened");
      return true;
    } catch (error) {
      console.error("[Printer] Failed to open cash drawer:", error);
      return false;
    }
  }

  /**
   * 프린터 상태 확인
   */
  async getStatus(): Promise<PrinterStatus> {
    return {
      connected: this._isConnected,
      paperStatus: "ok", // TODO: 실제 상태 조회
      coverOpen: false,
    };
  }

  /**
   * 영수증 버퍼 생성
   */
  private buildReceiptBuffer(data: ReceiptData): Buffer {
    const parts: Buffer[] = [];

    // 초기화
    parts.push(Buffer.from(COMMANDS.INIT));

    // 매장 정보 (중앙 정렬)
    parts.push(Buffer.from(COMMANDS.ALIGN_CENTER));
    parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_BOTH));
    parts.push(this.textBuffer(data.storeName));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    parts.push(Buffer.from(COMMANDS.FONT_NORMAL));
    if (data.storeAddress) {
      parts.push(this.textBuffer(data.storeAddress));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }
    if (data.storePhone) {
      parts.push(this.textBuffer(`TEL: ${data.storePhone}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }
    if (data.businessNumber) {
      parts.push(this.textBuffer(`사업자번호: ${data.businessNumber}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }

    // 구분선
    parts.push(this.textBuffer("=".repeat(32)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 주문 정보
    parts.push(Buffer.from(COMMANDS.ALIGN_LEFT));
    parts.push(this.textBuffer(`주문번호: ${data.orderNumber}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(this.textBuffer(`일시: ${this.formatDate(data.orderDate)}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 구분선
    parts.push(this.textBuffer("-".repeat(32)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 상품 목록
    for (const item of data.items) {
      parts.push(this.textBuffer(item.name));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));

      const priceStr = `  ${item.quantity} x ${this.formatCurrency(item.price)}`;
      const totalStr = this.formatCurrency(item.quantity * item.price);
      const padding = " ".repeat(32 - priceStr.length - totalStr.length);
      parts.push(this.textBuffer(priceStr + padding + totalStr));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));

      if (item.options && item.options.length > 0) {
        for (const option of item.options) {
          parts.push(this.textBuffer(`  + ${option}`));
          parts.push(Buffer.from(COMMANDS.LINE_FEED));
        }
      }
    }

    // 구분선
    parts.push(this.textBuffer("-".repeat(32)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 합계
    parts.push(Buffer.from(COMMANDS.BOLD_ON));
    parts.push(this.textBuffer(`소계:${" ".repeat(18)}${this.formatCurrency(data.subtotal)}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(this.textBuffer(`부가세:${" ".repeat(16)}${this.formatCurrency(data.tax)}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_HEIGHT));
    parts.push(this.textBuffer(`합계:${" ".repeat(14)}${this.formatCurrency(data.total)}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.FONT_NORMAL));
    parts.push(Buffer.from(COMMANDS.BOLD_OFF));

    // 결제 정보
    parts.push(this.textBuffer("=".repeat(32)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    if (data.cardInfo) {
      parts.push(this.textBuffer(`결제방법: ${data.paymentMethod}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      parts.push(this.textBuffer(`카드: ${data.cardInfo.cardName}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      parts.push(this.textBuffer(`승인번호: ${data.cardInfo.approvalNumber}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      if (data.cardInfo.installmentMonths && data.cardInfo.installmentMonths > 0) {
        parts.push(this.textBuffer(`할부: ${data.cardInfo.installmentMonths}개월`));
        parts.push(Buffer.from(COMMANDS.LINE_FEED));
      }
    }

    if (data.cashInfo) {
      parts.push(this.textBuffer(`받은금액: ${this.formatCurrency(data.cashInfo.receivedAmount)}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      parts.push(this.textBuffer(`거스름돈: ${this.formatCurrency(data.cashInfo.changeAmount)}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }

    // 푸터
    if (data.footer) {
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      parts.push(Buffer.from(COMMANDS.ALIGN_CENTER));
      parts.push(this.textBuffer(data.footer));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }

    // 여백 및 용지 자르기
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.CUT_PAPER_PARTIAL));

    return Buffer.concat(parts);
  }

  /**
   * 주방 전표 버퍼 생성
   */
  private buildKitchenOrderBuffer(data: KitchenOrderData): Buffer {
    const parts: Buffer[] = [];

    // 초기화
    parts.push(Buffer.from(COMMANDS.INIT));

    // 주문 번호 (크게)
    parts.push(Buffer.from(COMMANDS.ALIGN_CENTER));
    parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_BOTH));
    parts.push(this.textBuffer(`#${data.orderNumber}`));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.FONT_NORMAL));

    if (data.tableNumber) {
      parts.push(this.textBuffer(`테이블: ${data.tableNumber}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }

    parts.push(this.textBuffer(this.formatDate(data.orderDate)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 구분선
    parts.push(this.textBuffer("=".repeat(32)));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));

    // 상품 목록
    parts.push(Buffer.from(COMMANDS.ALIGN_LEFT));
    parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_HEIGHT));

    for (const item of data.items) {
      parts.push(this.textBuffer(`${item.quantity}x ${item.name}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));

      if (item.options && item.options.length > 0) {
        parts.push(Buffer.from(COMMANDS.FONT_NORMAL));
        for (const option of item.options) {
          parts.push(this.textBuffer(`   + ${option}`));
          parts.push(Buffer.from(COMMANDS.LINE_FEED));
        }
        parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_HEIGHT));
      }

      if (item.notes) {
        parts.push(Buffer.from(COMMANDS.FONT_NORMAL));
        parts.push(this.textBuffer(`   * ${item.notes}`));
        parts.push(Buffer.from(COMMANDS.LINE_FEED));
        parts.push(Buffer.from(COMMANDS.FONT_DOUBLE_HEIGHT));
      }
    }

    // 메모
    if (data.notes) {
      parts.push(Buffer.from(COMMANDS.FONT_NORMAL));
      parts.push(this.textBuffer("-".repeat(32)));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
      parts.push(this.textBuffer(`메모: ${data.notes}`));
      parts.push(Buffer.from(COMMANDS.LINE_FEED));
    }

    // 여백 및 용지 자르기
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.LINE_FEED));
    parts.push(Buffer.from(COMMANDS.CUT_PAPER_PARTIAL));

    return Buffer.concat(parts);
  }

  /**
   * 텍스트를 인코딩된 버퍼로 변환
   */
  private textBuffer(text: string): Buffer {
    // TODO: 실제로는 iconv-lite 등을 사용하여 EUC-KR 인코딩
    return Buffer.from(text, "utf8");
  }

  /**
   * 날짜 포맷
   */
  private formatDate(date: Date): string {
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * 통화 포맷
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString("ko-KR") + "원";
  }

  /**
   * 장치로 데이터 전송
   */
  private async sendToDevice(buffer: Buffer): Promise<void> {
    // TODO: 실제 시리얼 포트로 데이터 전송
    console.log(`[Printer] Sending ${buffer.length} bytes`);
    await this.delay(50); // 시뮬레이션
  }

  /**
   * 지연
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
