import { app, shell, BrowserWindow, ipcMain, session } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { hardwareManager } from "./hardware";
import type { ReceiptData, KitchenOrderData, PaymentTerminalRequest } from "./hardware/interfaces";

function createWindow(): void {
  // 개발 모드에서 CSP 완화 (vue-i18n 런타임 컴파일러 지원)
  if (is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:* https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:*;",
          ],
        },
      });
    });
  }

  const mainWindow = new BrowserWindow({
    width: is.dev ? 480 : 1080, // 개발: 모바일 비율, 프로덕션: 키오스크
    height: is.dev ? 854 : 1920,
    minWidth: 360,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: is.dev, // 개발 모드에서는 창 프레임 표시
    resizable: is.dev, // 개발 모드에서는 크기 조절 가능
    fullscreen: is.dev ? false : true,
    kiosk: is.dev ? false : true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: is.dev ? false : true, // 개발 모드에서 sandbox 비활성화
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.poson.kiosk");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Environment IPC handler
  ipcMain.handle("env:get", (_event, key: string) => process.env[key] ?? "");

  // App IPC handlers
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("app:toggleDevTools", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.toggleDevTools();
    }
  });

  // Hardware IPC handlers - Printer
  ipcMain.handle("printer:connect", async () => {
    const printer = hardwareManager.getPrinter();
    if (!printer) {
      // 기본 프린터 초기화 (설정에서 포트 읽기)
      hardwareManager.initPrinter({ port: process.env.PRINTER_PORT ?? "COM1" });
    }
    return hardwareManager.getPrinter()?.connect() ?? false;
  });

  ipcMain.handle("printer:disconnect", async () => {
    return hardwareManager.getPrinter()?.disconnect();
  });

  ipcMain.handle("printer:printReceipt", async (_event, data: ReceiptData) => {
    const printer = hardwareManager.getPrinter();
    if (!printer) return { success: false, errorCode: "NOT_INITIALIZED" };
    return printer.printReceipt(data);
  });

  ipcMain.handle("printer:printKitchenOrder", async (_event, data: KitchenOrderData) => {
    const printer = hardwareManager.getPrinter();
    if (!printer) return { success: false, errorCode: "NOT_INITIALIZED" };
    return printer.printKitchenOrder(data);
  });

  ipcMain.handle("printer:openCashDrawer", async () => {
    return hardwareManager.getPrinter()?.openCashDrawer() ?? false;
  });

  ipcMain.handle("printer:status", async () => {
    return (
      hardwareManager.getPrinter()?.getStatus() ?? {
        connected: false,
        paperStatus: "unknown",
        coverOpen: false,
      }
    );
  });

  // Hardware IPC handlers - Scanner
  ipcMain.handle("scanner:connect", async () => {
    const scanner = hardwareManager.getScanner();
    if (!scanner) {
      hardwareManager.initScanner();
    }
    return hardwareManager.getScanner()?.connect() ?? false;
  });

  ipcMain.handle("scanner:disconnect", async () => {
    return hardwareManager.getScanner()?.disconnect();
  });

  ipcMain.handle("scanner:status", async () => {
    return hardwareManager.getScanner()?.getStatus() ?? { connected: false };
  });

  // Hardware IPC handlers - Payment Terminal
  ipcMain.handle("terminal:connect", async () => {
    const terminal = hardwareManager.getTerminal();
    if (!terminal) {
      hardwareManager.initTerminal({
        port: process.env.TERMINAL_PORT ?? "COM2",
        vanCode: process.env.VAN_CODE ?? "NICE",
        terminalId: process.env.TERMINAL_ID ?? "",
      });
    }
    return hardwareManager.getTerminal()?.connect() ?? false;
  });

  ipcMain.handle("terminal:disconnect", async () => {
    return hardwareManager.getTerminal()?.disconnect();
  });

  ipcMain.handle("terminal:requestPayment", async (_event, data: PaymentTerminalRequest) => {
    const terminal = hardwareManager.getTerminal();
    if (!terminal) return { success: false, errorCode: "NOT_INITIALIZED" };
    return terminal.requestPayment(data);
  });

  ipcMain.handle("terminal:cancelPayment", async (_event, transactionId: string) => {
    const terminal = hardwareManager.getTerminal();
    if (!terminal) return { success: false, errorCode: "NOT_INITIALIZED" };
    return terminal.cancelPayment(transactionId);
  });

  ipcMain.handle("terminal:status", async () => {
    return hardwareManager.getTerminal()?.getStatus() ?? { connected: false };
  });

  // Hardware status
  ipcMain.handle("hardware:status", async () => {
    return hardwareManager.getStatus();
  });

  ipcMain.handle("hardware:connectAll", async () => {
    return hardwareManager.connectAll();
  });

  ipcMain.handle("hardware:disconnectAll", async () => {
    return hardwareManager.disconnectAll();
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
