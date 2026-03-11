import { app, BrowserWindow, session, shell, protocol } from "electron";
import { join, resolve, sep, extname } from "path";
import { existsSync, readFileSync } from "fs";
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
 * MIME 타입 매핑
 */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

/**
 * 커스텀 프로토콜 핸들러 등록 (app:// → renderer 파일 서빙)
 * .asar 내부 파일은 net.fetch(file://) 불가하므로 fs.readFileSync 사용
 */
export function registerAppProtocol(): void {
  const RENDERER_ROOT = resolve(__dirname, "../renderer");

  protocol.handle("app", (request) => {
    let { pathname } = new URL(request.url);
    pathname = decodeURIComponent(pathname);

    // Path Traversal 방어
    const filePath = resolve(RENDERER_ROOT, pathname.replace(/^\/+/, ""));
    if (!filePath.startsWith(RENDERER_ROOT + sep) && filePath !== RENDERER_ROOT) {
      return new Response("Forbidden", { status: 403 });
    }

    // Null byte injection 방어
    if (filePath.includes("\0")) {
      return new Response("Forbidden", { status: 403 });
    }

    const fileExists = existsSync(filePath);
    const targetPath = fileExists
      ? filePath
      : resolve(RENDERER_ROOT, "index.html"); // SPA fallback

    try {
      const data = readFileSync(targetPath);
      const ext = extname(targetPath).toLowerCase();
      const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

      return new Response(data, {
        status: 200,
        headers: { "Content-Type": mimeType },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  });
}

/**
 * BrowserWindow 생성 + CSP 설정
 */
export function createWindow(): void {
  const prodCSP = [
    "default-src 'self' app:;",
    "script-src 'self' app: 'unsafe-inline' 'unsafe-eval';",
    "style-src 'self' app: 'unsafe-inline' https://fonts.googleapis.com;",
    "img-src 'self' app: data: blob: http://localhost:* https://*.unsplash.com https://images.unsplash.com https://flagcdn.com;",
    "font-src 'self' app: data: https://fonts.gstatic.com;",
    `connect-src 'self' app: http://localhost:* http://127.0.0.1:* http://192.168.*:* http://10.*:* http://172.16.*:* https://*.google.com wss://*.google.com https://*.googleapis.com;`,
  ].join(" ");

  const devCSP =
    "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:* https://*.unsplash.com https://images.unsplash.com https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:* http://127.0.0.1:* https://*.google.com wss://*.google.com https://*.googleapis.com;";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [is.dev ? devCSP : prodCSP],
        },
      });
    } else {
      callback(is.dev ? {} : { responseHeaders: details.responseHeaders });
    }
  });

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
      sandbox: false,
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

  const url = is.dev && process.env["ELECTRON_RENDERER_URL"]
    ? process.env["ELECTRON_RENDERER_URL"]
    : "app://poson/index.html";
  mainWindow.loadURL(url);
}
