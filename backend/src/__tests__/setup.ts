import { vi } from "vitest";

// Prisma 클라이언트 모의
vi.mock("../utils/db.js", () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    systemSetting: { findMany: vi.fn(), upsert: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    payment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    admin: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    member: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    device: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deviceSetting: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    supplier: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    purchase: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    purchaseItem: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    purchaseProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  redis: null,
}));

// Logger 모의 (테스트 시 콘솔 출력 억제)
vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
}));

// Cache 서비스 모의
vi.mock("../utils/cache.js", () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    getOrSet: vi.fn(),
    deletePattern: vi.fn(),
    flushAll: vi.fn(),
  },
  getRedis: vi.fn(() => null),
  CACHE_KEYS: {
    PRODUCTS: "products",
    CATEGORIES: "categories",
    CATEGORY: (id: string) => `category:${id}`,
    SUPPLIERS: "suppliers",
    BRANCHES_LARGE: "branches:large",
    BRANCHES_MEDIUM: "branches:medium",
    BRANCHES_SMALL: "branches:small",
  },
}));
