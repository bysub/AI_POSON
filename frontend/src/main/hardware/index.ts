export * from "./interfaces";
export { EscPosPrinter } from "./printer/escpos-printer";
export { UsbScanner, SerialScanner } from "./scanner/usb-scanner";
export { VanTerminal } from "./terminal/van-terminal";
export type { VanTerminalConfig } from "./terminal/van-terminal";

import type { IPrinter, IScanner, IPaymentTerminal } from "./interfaces";
import { EscPosPrinter } from "./printer/escpos-printer";
import { UsbScanner } from "./scanner/usb-scanner";
import { VanTerminal } from "./terminal/van-terminal";

/**
 * 하드웨어 관리자
 * 모든 하드웨어 장치를 관리
 */
export class HardwareManager {
  private printer: IPrinter | null = null;
  private scanner: IScanner | null = null;
  private terminal: IPaymentTerminal | null = null;

  /**
   * 프린터 초기화
   */
  initPrinter(config: { port: string; name?: string; baudRate?: number }): void {
    this.printer = new EscPosPrinter(config);
  }

  /**
   * 스캐너 초기화 (USB HID)
   */
  initScanner(config?: { name?: string }): void {
    this.scanner = new UsbScanner(config);
  }

  /**
   * 결제 단말기 초기화
   */
  initTerminal(config: {
    port: string;
    vanCode: string;
    terminalId: string;
    name?: string;
    baudRate?: number;
  }): void {
    this.terminal = new VanTerminal(config);
  }

  /**
   * 모든 장치 연결
   */
  async connectAll(): Promise<{
    printer: boolean;
    scanner: boolean;
    terminal: boolean;
  }> {
    const results = {
      printer: false,
      scanner: false,
      terminal: false,
    };

    if (this.printer) {
      results.printer = await this.printer.connect();
    }

    if (this.scanner) {
      results.scanner = await this.scanner.connect();
    }

    if (this.terminal) {
      results.terminal = await this.terminal.connect();
    }

    return results;
  }

  /**
   * 모든 장치 연결 해제
   */
  async disconnectAll(): Promise<void> {
    if (this.printer?.isConnected) {
      await this.printer.disconnect();
    }

    if (this.scanner?.isConnected) {
      await this.scanner.disconnect();
    }

    if (this.terminal?.isConnected) {
      await this.terminal.disconnect();
    }
  }

  /**
   * 프린터 접근
   */
  getPrinter(): IPrinter | null {
    return this.printer;
  }

  /**
   * 스캐너 접근
   */
  getScanner(): IScanner | null {
    return this.scanner;
  }

  /**
   * 결제 단말기 접근
   */
  getTerminal(): IPaymentTerminal | null {
    return this.terminal;
  }

  /**
   * 장치 상태 확인
   */
  async getStatus(): Promise<{
    printer: { connected: boolean };
    scanner: { connected: boolean };
    terminal: { connected: boolean };
  }> {
    return {
      printer: this.printer
        ? await this.printer.getStatus()
        : { connected: false, paperStatus: "unknown" as const, coverOpen: false },
      scanner: this.scanner ? await this.scanner.getStatus() : { connected: false },
      terminal: this.terminal ? await this.terminal.getStatus() : { connected: false },
    };
  }
}

// 싱글톤 인스턴스
export const hardwareManager = new HardwareManager();
