import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// .env에서 VITE_API_URL을 읽어 origin 추출 → main process CSP에 주입
const env = loadEnv("production", process.cwd(), "VITE_");
const apiOrigin = (() => {
  const raw = env.VITE_API_URL || process.env.VITE_API_URL || "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
})();

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __API_ORIGIN__: JSON.stringify(apiOrigin),
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@electron-toolkit/preload"] })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
      },
    },
    plugins: [vue()],
    server: {
      host: true,
      // Vite proxy: /api, /uploads 요청을 백엔드(localhost:3000)로 전달
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
      // 개발 서버 CSP 완화 (vue-i18n 런타임 컴파일러 지원)
      headers: {
        "Content-Security-Policy":
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: http:; img-src 'self' data: blob: http:;",
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
  },
});
