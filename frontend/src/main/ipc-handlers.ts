import { app, BrowserWindow, ipcMain } from "electron";
import { is } from "@electron-toolkit/utils";
import { hardwareManager } from "./hardware";
import type { ReceiptData, KitchenOrderData, PaymentTerminalRequest } from "./hardware/interfaces";

// S-5: IPC sender origin 검증
function validateIpcSender(event: Electron.IpcMainInvokeEvent): boolean {
  const senderUrl = event.senderFrame?.url ?? "";
  if (is.dev) {
    return senderUrl.startsWith("http://localhost:") || senderUrl === "";
  }
  return senderUrl.startsWith("app://") || senderUrl === "";
}

// secureHandle 래퍼: sender 검증 후 실행
function secureHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown,
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!validateIpcSender(event)) {
      console.error(`[Security] IPC blocked: ${channel} from ${event.senderFrame?.url}`);
      return { success: false, errorCode: "UNAUTHORIZED_SENDER" };
    }
    return handler(event, ...args);
  });
}

/**
 * 일반 IPC 핸들러 등록 (env, app, hardware)
 */
export function registerIpcHandlers(): void {
  // ─── Environment ───
  const SAFE_ENV_KEYS = new Set([
    "POSON_DEVICE_ID",
    "NODE_ENV",
    "PRINTER_PORT",
    "TERMINAL_PORT",
    "VAN_CODE",
    "TERMINAL_ID",
  ]);
  ipcMain.handle("env:get", (_event, key: string) => {
    if (!SAFE_ENV_KEYS.has(key)) return "";
    return process.env[key] ?? "";
  });

  // ─── App ───
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("app:toggleDevTools", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.webContents.toggleDevTools();
  });

  // ─── Printer ───
  secureHandle("printer:connect", async () => {
    if (!hardwareManager.getPrinter()) {
      hardwareManager.initPrinter({ port: process.env.PRINTER_PORT ?? "COM1" });
    }
    return hardwareManager.getPrinter()?.connect() ?? false;
  });

  secureHandle("printer:disconnect", async () => {
    return hardwareManager.getPrinter()?.disconnect();
  });

  secureHandle("printer:printReceipt", async (_event, ...args: unknown[]) => {
    const data = args[0] as ReceiptData;
    const printer = hardwareManager.getPrinter();
    if (!printer) return { success: false, errorCode: "NOT_INITIALIZED" };
    return printer.printReceipt(data);
  });

  secureHandle("printer:printKitchenOrder", async (_event, ...args: unknown[]) => {
    const data = args[0] as KitchenOrderData;
    const printer = hardwareManager.getPrinter();
    if (!printer) return { success: false, errorCode: "NOT_INITIALIZED" };
    return printer.printKitchenOrder(data);
  });

  secureHandle("printer:openCashDrawer", async () => {
    return hardwareManager.getPrinter()?.openCashDrawer() ?? false;
  });

  secureHandle("printer:status", async () => {
    return hardwareManager.getPrinter()?.getStatus() ?? {
      connected: false,
      paperStatus: "unknown",
      coverOpen: false,
    };
  });

  // ─── Scanner ───
  secureHandle("scanner:connect", async () => {
    if (!hardwareManager.getScanner()) {
      hardwareManager.initScanner();
    }
    return hardwareManager.getScanner()?.connect() ?? false;
  });

  secureHandle("scanner:disconnect", async () => {
    return hardwareManager.getScanner()?.disconnect();
  });

  secureHandle("scanner:status", async () => {
    return hardwareManager.getScanner()?.getStatus() ?? { connected: false };
  });

  // ─── Payment Terminal ───
  secureHandle("terminal:connect", async () => {
    if (!hardwareManager.getTerminal()) {
      hardwareManager.initTerminal({
        port: process.env.TERMINAL_PORT ?? "COM2",
        vanCode: process.env.VAN_CODE ?? "NICE",
        terminalId: process.env.TERMINAL_ID ?? "",
      });
    }
    return hardwareManager.getTerminal()?.connect() ?? false;
  });

  secureHandle("terminal:disconnect", async () => {
    return hardwareManager.getTerminal()?.disconnect();
  });

  secureHandle("terminal:requestPayment", async (_event, ...args: unknown[]) => {
    const data = args[0] as PaymentTerminalRequest;
    const terminal = hardwareManager.getTerminal();
    if (!terminal) return { success: false, errorCode: "NOT_INITIALIZED" };
    return terminal.requestPayment(data);
  });

  secureHandle("terminal:cancelPayment", async (_event, ...args: unknown[]) => {
    const transactionId = args[0] as string;
    const terminal = hardwareManager.getTerminal();
    if (!terminal) return { success: false, errorCode: "NOT_INITIALIZED" };
    return terminal.cancelPayment(transactionId);
  });

  secureHandle("terminal:status", async () => {
    return hardwareManager.getTerminal()?.getStatus() ?? { connected: false };
  });

  // ─── Hardware aggregate ───
  secureHandle("hardware:status", async () => {
    return hardwareManager.getStatus();
  });

  secureHandle("hardware:connectAll", async () => {
    return hardwareManager.connectAll();
  });

  secureHandle("hardware:disconnectAll", async () => {
    return hardwareManager.disconnectAll();
  });
}
