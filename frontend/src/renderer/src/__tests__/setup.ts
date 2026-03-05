import { vi } from "vitest";
import { config } from "@vue/test-utils";

// Electron API 모의 (window.api)
vi.stubGlobal("window", {
  ...globalThis.window,
  api: {
    getEnv: vi.fn().mockResolvedValue(""),
    printer: {
      print: vi.fn(),
      getStatus: vi.fn(),
    },
    terminal: {
      connect: vi.fn(),
      pay: vi.fn(),
      cancel: vi.fn(),
    },
    scanner: {
      connect: vi.fn(),
      onScan: vi.fn(),
    },
  },
});

// Vue I18n 모의
const mockT = (key: string) => key;
config.global.mocks = {
  $t: mockT,
  $i18n: { locale: "ko" },
};

// Router 모의
config.global.stubs = {
  RouterLink: true,
  RouterView: true,
};

// localStorage 모의
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// fetch 모의
vi.stubGlobal("fetch", vi.fn());

// import.meta.env 모의
vi.stubGlobal("import", {
  meta: {
    env: {
      VITE_API_URL: "http://localhost:3000",
      MODE: "test",
      DEV: true,
      PROD: false,
    },
  },
});
