import { app, shell, BrowserWindow, ipcMain, session, protocol, net } from "electron";
import { join, resolve, sep } from "path";
import { pathToFileURL } from "url";
import { spawn, ChildProcess } from "child_process";
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
              "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:* https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:* http://127.0.0.1:* https://*.google.com wss://*.google.com https://*.googleapis.com;",
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

  // 마이크 권한 자동 허용 (음성 주문 기능)
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    },
  );

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

  // ─── Speech Recognition (Whisper Daemon) ───
  // Python 상주 프로세스: 모델을 1회 로드하고 stdin/stdout JSON 프로토콜로 통신
  let sttDaemon: ChildProcess | null = null;
  let sttReady = false;
  let sttBuffer = "";
  let sttModelSize = process.env.STT_MODEL ?? "small";

  // STT 요청 큐: 동시 요청 시 순차 처리
  interface SttQueueItem {
    resolve: (value: unknown) => void;
    lang: string;
    timeout: number;
    vocabulary: string[];
    killTimer: ReturnType<typeof setTimeout>;
  }
  const sttQueue: SttQueueItem[] = [];
  let sttProcessing = false;

  function startSttDaemon(): void {
    if (sttDaemon) return;

    const scriptPath = is.dev
      ? join(__dirname, "../../src/main/stt-whisper.py")
      : join(process.resourcesPath, "stt-whisper.py");

    console.log(`[STT] Starting Whisper daemon (model=${sttModelSize})...`);
    sttDaemon = spawn("python", [scriptPath, "-model", sttModelSize], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    sttReady = false;
    sttBuffer = "";

    sttDaemon.stdout?.on("data", (data: Buffer) => {
      sttBuffer += data.toString("utf8");

      // 줄 단위로 JSON 파싱 (newline-delimited JSON)
      let newlineIdx: number;
      while ((newlineIdx = sttBuffer.indexOf("\n")) !== -1) {
        const line = sttBuffer.slice(0, newlineIdx).trim();
        sttBuffer = sttBuffer.slice(newlineIdx + 1);

        if (!line) continue;
        try {
          const msg = JSON.parse(line);

          // 최초 ready 신호
          if (msg.ready !== undefined) {
            sttReady = msg.ready;
            console.log(`[STT] Daemon ready: model=${msg.model}`);
            continue;
          }

          // 인식 결과 → 큐의 첫 번째 항목으로 전달
          if (sttQueue.length > 0) {
            const current = sttQueue.shift()!;
            clearTimeout(current.killTimer);
            console.log("[STT] Result:", msg);
            current.resolve(msg);
            sttProcessing = false;
            processNextSttRequest();
          }
        } catch {
          console.error("[STT] Parse error:", line);
        }
      }
    });

    sttDaemon.stderr?.on("data", (data: Buffer) => {
      const line = data.toString("utf8").trim();
      if (line) console.log("[STT]", line);
    });

    sttDaemon.on("close", (code) => {
      console.log(`[STT] Daemon exited (code=${code})`);
      sttDaemon = null;
      sttReady = false;
      drainSttQueue("daemon_exited");
    });

    sttDaemon.on("error", (err) => {
      console.error("[STT] Daemon error:", err.message);
      sttDaemon = null;
      sttReady = false;
      drainSttQueue(err.message);
    });
  }

  function sendSttCommand(cmd: Record<string, unknown>): void {
    if (sttDaemon?.stdin?.writable) {
      sttDaemon.stdin.write(JSON.stringify(cmd) + "\n", "utf8");
    }
  }

  function drainSttQueue(error: string): void {
    while (sttQueue.length > 0) {
      const item = sttQueue.shift()!;
      clearTimeout(item.killTimer);
      item.resolve({ success: false, error });
    }
    sttProcessing = false;
  }

  function processNextSttRequest(): void {
    if (sttProcessing || sttQueue.length === 0) return;
    sttProcessing = true;

    const req = sttQueue[0];
    const sttLang = req.lang || "ko-KR";
    console.log(`[STT] Processing queued request: lang=${sttLang}, timeout=${req.timeout}s`);

    sendSttCommand({
      cmd: "recognize",
      lang: sttLang,
      timeout: req.timeout,
      vocab: req.vocabulary,
    });
  }

  // 앱 시작 시 데몬 자동 시작
  startSttDaemon();

  ipcMain.handle("stt:isAvailable", async () => {
    // 데몬이 죽었으면 재시작 시도
    if (!sttDaemon) startSttDaemon();
    return { available: true, ready: sttReady };
  });

  ipcMain.handle(
    "stt:recognize",
    async (_event, lang: string, timeoutSec: number, vocabulary?: string[]) => {

    // 데몬이 죽었으면 재시작
    if (!sttDaemon) startSttDaemon();

    // ready 신호 대기 (데몬 시작 직후 또는 모델 로드 중)
    if (!sttReady) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (sttReady || !sttDaemon) { clearInterval(check); resolve(); }
        }, 300);
        setTimeout(() => { clearInterval(check); resolve(); }, 60000);
      });
    }

    if (!sttReady) {
      return { success: false, error: "daemon_not_ready" };
    }

    const timeout = Math.min(Math.max(timeoutSec || 10, 3), 30);
    console.log(`[STT] Recognize: lang=${lang || "ko-KR"}, timeout=${timeout}s, vocab=${vocabulary?.length ?? 0}, queue=${sttQueue.length}`);

    return new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        // 타임아웃 시 큐에서 해당 항목 제거
        const idx = sttQueue.findIndex((item) => item.resolve === resolve);
        if (idx !== -1) {
          sttQueue.splice(idx, 1);
          if (idx === 0) sttProcessing = false;
          resolve({ success: false, error: "timeout" });
          processNextSttRequest();
        }
      }, (timeout + 30) * 1000);

      sttQueue.push({
        resolve,
        lang: lang || "ko-KR",
        timeout,
        vocabulary: vocabulary ?? [],
        killTimer,
      });

      // 현재 처리 중이 아니면 즉시 시작
      processNextSttRequest();
    });
  });

  ipcMain.handle("stt:setModel", async (_event, model: string) => {
    const validModels = ["tiny", "base", "small", "medium", "large-v3"];
    if (!validModels.includes(model)) return { success: false, error: "invalid_model" };
    if (model === sttModelSize && sttReady) return { success: true, model: sttModelSize };

    console.log(`[STT] Switching model: ${sttModelSize} → ${model}`);
    sttModelSize = model;

    // 기존 데몬 종료 후 재시작
    if (sttDaemon) {
      try { sendSttCommand({ cmd: "quit" }); } catch {}
      sttDaemon.kill();
      sttDaemon = null;
      sttReady = false;
    }
    startSttDaemon();
    return { success: true, model: sttModelSize };
  });

  ipcMain.handle("stt:stop", async () => {
    // 큐의 모든 대기 요청 취소
    drainSttQueue("cancelled");
  });

  // 앱 종료 시 STT 데몬 정리
  app.on("before-quit", () => {
    if (sttDaemon) {
      try { sendSttCommand({ cmd: "quit" }); } catch {}
      setTimeout(() => { try { sttDaemon?.kill(); } catch {} }, 1000);
    }
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
