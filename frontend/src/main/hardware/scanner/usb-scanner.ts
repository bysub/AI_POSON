import type { IScanner, ScannerStatus } from "../interfaces";

/**
 * USB 바코드 스캐너 구현
 * 키보드 웨지 방식 (HID)
 */
export class UsbScanner implements IScanner {
  readonly name: string;
  private _isConnected: boolean = false;
  private scanCallback: ((barcode: string) => void) | null = null;
  private buffer: string = "";
  private bufferTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BUFFER_TIMEOUT = 50; // ms

  constructor(config?: { name?: string }) {
    this.name = config?.name ?? "USB Barcode Scanner";
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 스캐너 연결 (키보드 이벤트 리스닝 시작)
   */
  async connect(): Promise<boolean> {
    try {
      // 키보드 이벤트 리스너 등록
      window.addEventListener("keypress", this.handleKeyPress);
      this._isConnected = true;

      console.log("[Scanner] Connected (keyboard wedge mode)");
      return true;
    } catch (error) {
      console.error("[Scanner] Connection failed:", error);
      return false;
    }
  }

  /**
   * 스캐너 연결 해제
   */
  async disconnect(): Promise<void> {
    window.removeEventListener("keypress", this.handleKeyPress);
    this._isConnected = false;
    this.buffer = "";

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    console.log("[Scanner] Disconnected");
  }

  /**
   * 바코드 스캔 이벤트 리스너 등록
   */
  onScan(callback: (barcode: string) => void): void {
    this.scanCallback = callback;
  }

  /**
   * 바코드 스캔 이벤트 리스너 해제
   */
  offScan(): void {
    this.scanCallback = null;
  }

  /**
   * 스캐너 상태 확인
   */
  async getStatus(): Promise<ScannerStatus> {
    return {
      connected: this._isConnected,
    };
  }

  /**
   * 키 입력 처리
   * 바코드 스캐너는 빠르게 연속 입력되므로 버퍼링하여 처리
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    // 입력 필드에 포커스가 있으면 무시
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    // 타임아웃 리셋
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    // Enter 키면 바코드 완성
    if (event.key === "Enter") {
      if (this.buffer.length > 0) {
        this.emitBarcode(this.buffer);
        this.buffer = "";
      }
      return;
    }

    // 버퍼에 문자 추가
    if (event.key.length === 1) {
      this.buffer += event.key;
    }

    // 타임아웃 설정 (일정 시간 입력 없으면 바코드로 처리)
    this.bufferTimeout = setTimeout(() => {
      if (this.buffer.length >= 4) {
        // 최소 4자리 이상
        this.emitBarcode(this.buffer);
      }
      this.buffer = "";
    }, this.BUFFER_TIMEOUT);
  };

  /**
   * 바코드 이벤트 발생
   */
  private emitBarcode(barcode: string): void {
    // 바코드 유효성 검사
    if (!this.isValidBarcode(barcode)) {
      console.warn("[Scanner] Invalid barcode:", barcode);
      return;
    }

    console.log("[Scanner] Scanned:", barcode);

    if (this.scanCallback) {
      this.scanCallback(barcode);
    }
  }

  /**
   * 바코드 유효성 검사
   */
  private isValidBarcode(barcode: string): boolean {
    // 기본 검증: 영숫자와 일부 특수문자만 허용
    const validPattern = /^[A-Za-z0-9\-_.]+$/;
    return validPattern.test(barcode) && barcode.length >= 4;
  }
}

/**
 * 시리얼 바코드 스캐너 구현 (COM 포트)
 */
export class SerialScanner implements IScanner {
  readonly name: string;
  private _isConnected: boolean = false;
  private scanCallback: ((barcode: string) => void) | null = null;
  private port: string;
  private baudRate: number;

  constructor(config: { name?: string; port: string; baudRate?: number }) {
    this.name = config.name ?? "Serial Barcode Scanner";
    this.port = config.port;
    this.baudRate = config.baudRate ?? 9600;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 스캐너 연결
   */
  async connect(): Promise<boolean> {
    try {
      // TODO: 실제 시리얼 포트 연결 구현
      console.log(`[Scanner] Connecting to ${this.port}...`);

      // 시뮬레이션
      await this.delay(100);
      this._isConnected = true;

      console.log(`[Scanner] Connected to ${this.port}`);
      return true;
    } catch (error) {
      console.error("[Scanner] Connection failed:", error);
      return false;
    }
  }

  /**
   * 스캐너 연결 해제
   */
  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log("[Scanner] Disconnected");
  }

  /**
   * 바코드 스캔 이벤트 리스너 등록
   */
  onScan(callback: (barcode: string) => void): void {
    this.scanCallback = callback;
  }

  /**
   * 바코드 스캔 이벤트 리스너 해제
   */
  offScan(): void {
    this.scanCallback = null;
  }

  /**
   * 스캐너 상태 확인
   */
  async getStatus(): Promise<ScannerStatus> {
    return {
      connected: this._isConnected,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
