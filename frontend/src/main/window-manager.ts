import { BrowserWindow, session, shell, protocol, net } from "electron";
import { join, resolve, sep } from "path";
import { pathToFileURL } from "url";
import { is } from "@electron-toolkit/utils";

// electron.vite.config.ts에서 빌드 시 주입 (VITE_API_URL origin)
declare const __API_ORIGIN__: string;

/** 런타임 환경변수 → 빌드 시 주입값 → 기본값 순으로 API origin 결정 */
function getApiOrigin(): string {
  // 런타임 환경변수 우선 (키오스크 현장 배포 시 유연성)
  const runtimeUrl = process.env.POSON_API_URL;
  if (runtimeUrl) {
    try {
      return new URL(runtimeUrl).origin;
    } catch {
      /* ignore */
    }
  }
  // 빌드 시 주입된 값
  if (typeof __API_ORIGIN__ !== "undefined" && __API_ORIGIN__) {
    return __API_ORIGIN__;
  }
  return "http://localhost:3000";
}

/**
 * 커스텀 프로토콜 핸들러 등록 (app:// → renderer 파일 서빙)
 * app.whenReady() 이후에 호출해야 함
 */
export function registerAppProtocol(): void {
  const RENDERER_ROOT = resolve(__dirname, "../renderer");

  protocol.handle("app", (request) => {
    let { pathname } = new URL(request.url);
    pathname = decodeURIComponent(pathname);

    // Path Traversal 방어
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
}

/**
 * BrowserWindow 생성 + CSP 설정
 */
export function createWindow(): void {
  // CSP 헤더 설정 — API origin을 동적으로 포함
  const apiOrigin = getApiOrigin();

  if (is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              `default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:* ${apiOrigin} https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:* http://127.0.0.1:* ${apiOrigin} https://*.google.com wss://*.google.com https://*.googleapis.com;`,
            ],
          },
        });
      } else {
        callback({});
      }
    });
  } else {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              `default-src 'self' app:; script-src 'self' app: 'unsafe-inline' 'unsafe-eval'; style-src 'self' app: 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' app: data: blob: ${apiOrigin} https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' app: data: https://fonts.gstatic.com; connect-src 'self' app: http://localhost:* http://127.0.0.1:* ${apiOrigin} https://*.google.com wss://*.google.com https://*.googleapis.com;`,
            ],
          },
        });
      } else {
        callback({ responseHeaders: details.responseHeaders });
      }
    });
  }

  const mainWindow = new BrowserWindow({
    width: is.dev ? 480 : 1080,
    height: is.dev ? 854 : 1920,
    minWidth: 360,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: is.dev,
    resizable: is.dev,
    fullscreen: !is.dev,
    kiosk: !is.dev,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: !is.dev,
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
      callback(permission === "media");
    },
  );

  // 프로덕션에서 리소스 로딩 실패 로깅 (디버깅용)
  if (!is.dev) {
    session.defaultSession.webRequest.onErrorOccurred((details) => {
      console.error(`[Load Error] ${details.resourceType}: ${details.url} - ${details.error}`);
    });
  }

  // 프로덕션 디버깅: F12로 DevTools 토글
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12" && input.type === "keyDown") {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 페이지 로드 실패 시 에러 로깅
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Page Load Failed] code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`);
  });

  // 렌더러 콘솔 메시지를 main process 로그에도 출력
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      // level 2 = warning, 3 = error
      console.warn(`[Renderer ${level === 3 ? "ERROR" : "WARN"}] ${message} (${sourceId}:${line})`);
    }
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadURL("app://poson/index.html");
  }
}
