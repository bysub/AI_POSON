import { app, shell, BrowserWindow, ipcMain, session, protocol, net } from "electron";
import { join, resolve, sep } from "path";
import { pathToFileURL } from "url";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { hardwareManager } from "./hardware";
import type { ReceiptData, KitchenOrderData, PaymentTerminalRequest } from "./hardware/interfaces";

// 프로덕션 모드에서 커스텀 프로토콜 등록 (file:// 프로토콜의 크로스 오리진 제한 우회)
// app.whenReady() 이전에 호출해야 함
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function createWindow(): void {
  // 개발 모드에서만 CSP 헤더 동적 적용 (Vite 서버 응답에 CSP 추가)
  // 프로덕션에서는 index.html의 meta 태그 CSP만 사용 (app:// 프로토콜은 onHeadersReceived 불필요)
  if (is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:* https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:* http://127.0.0.1:*;",
            ],
          },
        });
      } else {
        callback({});
      }
    });
  } else {
    // 프로덕션: backend helmet CSP가 이미지/폰트 로딩을 차단하지 않도록
    // 서브리소스 응답에서만 제한적인 CSP 헤더 제거 (API 응답은 유지)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (
        details.responseHeaders &&
        (details.resourceType === "image" ||
          details.resourceType === "stylesheet" ||
          details.resourceType === "font")
      ) {
        delete details.responseHeaders["content-security-policy"];
        delete details.responseHeaders["Content-Security-Policy"];
      }
      callback({ responseHeaders: details.responseHeaders });
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

  // 프로덕션에서 이미지 로딩 실패 로깅 (디버깅용)
  if (!is.dev) {
    session.defaultSession.webRequest.onErrorOccurred((details) => {
      if (details.resourceType === "image") {
        console.error(`[Image Load Error] ${details.url} - ${details.error}`);
      }
    });
  }

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    // 커스텀 프로토콜로 로드 (file:// 대신 app:// 사용)
    mainWindow.loadURL("app://poson/index.html");
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.poson.kiosk");

  // 커스텀 프로토콜 핸들러: app://poson/... → renderer 디렉토리 파일 서빙
  const RENDERER_ROOT = resolve(__dirname, "../renderer");

  protocol.handle("app", (request) => {
    let { pathname } = new URL(request.url);
    pathname = decodeURIComponent(pathname);

    // Path Traversal 방어: 절대 경로로 변환 후 renderer 루트 내 경로인지 검증
    const filePath = resolve(RENDERER_ROOT, pathname.replace(/^\/+/, ""));

    if (!filePath.startsWith(RENDERER_ROOT + sep) && filePath !== RENDERER_ROOT) {
      console.error(`[Security] Path traversal blocked: ${request.url}`);
      return new Response("Forbidden", { status: 403 });
    }

    // Null byte injection 방어
    if (filePath.includes("\0")) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).href);
  });

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Environment IPC handler (화이트리스트 기반 - 보안상 허용된 키만 노출)
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
