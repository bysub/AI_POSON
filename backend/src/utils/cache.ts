import Redis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

/**
 * Redis 클라이언트
 */
let redis: Redis | null = null;

/**
 * Redis 연결 초기화
 */
export function initRedis(): Redis {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on("connect", () => {
    logger.info("Redis: Connected");
  });

  redis.on("error", (error) => {
    logger.error({ error: error.message }, "Redis: Connection error");
  });

  redis.on("close", () => {
    logger.warn("Redis: Connection closed");
  });

  return redis;
}

/**
 * Redis 클라이언트 가져오기
 */
export function getRedis(): Redis | null {
  return redis;
}

/**
 * Redis 연결 종료
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info("Redis: Disconnected");
  }
}

/**
 * 캐시 서비스
 */
export class CacheService {
  private readonly redis: Redis | null;
  private readonly defaultTTL: number;
  private readonly prefix: string;

  constructor(options?: { ttl?: number; prefix?: string }) {
    this.redis = getRedis();
    this.defaultTTL = options?.ttl ?? 300; // 기본 5분
    this.prefix = options?.prefix ?? "kiosk:";
  }

  /**
   * 캐시 키 생성
   */
  private makeKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 캐시에서 값 가져오기
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(this.makeKey(key));

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ key, error }, "Cache: Get failed");
      return null;
    }
  }

  /**
   * 캐시에 값 저장
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl ?? this.defaultTTL;

      await this.redis.setex(this.makeKey(key), expiry, serialized);

      return true;
    } catch (error) {
      logger.warn({ key, error }, "Cache: Set failed");
      return false;
    }
  }

  /**
   * 캐시에서 값 삭제
   */
  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(this.makeKey(key));
      return true;
    } catch (error) {
      logger.warn({ key, error }, "Cache: Delete failed");
      return false;
    }
  }

  /**
   * 캐시에서 값 삭제 (alias)
   */
  async del(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * 패턴에 맞는 키 삭제 (SCAN 사용 - non-blocking)
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      let totalDeleted = 0;
      let cursor = "0";
      const matchPattern = this.makeKey(pattern);

      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor, "MATCH", matchPattern, "COUNT", "100",
        );
        if (keys.length > 0) {
          totalDeleted += await this.redis.del(...keys);
        }
        cursor = newCursor;
      } while (cursor !== "0");

      if (totalDeleted > 0) {
        logger.info({ pattern, count: totalDeleted }, "Cache: Pattern deleted");
      }

      return totalDeleted;
    } catch (error) {
      logger.warn({ pattern, error }, "Cache: Delete pattern failed");
      return 0;
    }
  }

  /**
   * 캐시에서 가져오거나 로더 실행
   */
  async getOrSet<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await loader();

    await this.set(key, value, ttl);

    return value;
  }

  /**
   * 캐시 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.exists(this.makeKey(key));
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * TTL 조회
   */
  async ttl(key: string): Promise<number> {
    if (!this.redis) return -2;

    try {
      return await this.redis.ttl(this.makeKey(key));
    } catch {
      return -2;
    }
  }

  /**
   * 전체 캐시 초기화 (SCAN 사용 - non-blocking)
   */
  async flushAll(): Promise<void> {
    if (!this.redis) return;

    let totalDeleted = 0;
    let cursor = "0";
    const matchPattern = `${this.prefix}*`;

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor, "MATCH", matchPattern, "COUNT", "100",
      );
      if (keys.length > 0) {
        totalDeleted += await this.redis.del(...keys);
      }
      cursor = newCursor;
    } while (cursor !== "0");

    logger.info({ count: totalDeleted }, "Cache: Flushed all");
  }
}

// 기본 캐시 서비스 인스턴스
export const cacheService = new CacheService();

// 카테고리 캐시 키
export const CACHE_KEYS = {
  CATEGORIES: "categories",
  CATEGORY: (id: number) => `category:${id}`,
  PRODUCTS: "products",
  PRODUCTS_BY_CATEGORY: (categoryId: number) => `products:category:${categoryId}`,
  PRODUCT: (id: number) => `product:${id}`,
  PRODUCT_BY_BARCODE: (barcode: string) => `product:barcode:${barcode}`,
  SUPPLIERS: "suppliers",
  SUPPLIER: (id: number) => `supplier:${id}`,
  PURCHASES: "purchases",
  PURCHASE: (id: number) => `purchase:${id}`,
  PURCHASE_PRODUCTS: "purchase-products",
  PURCHASE_PRODUCT: (id: number) => `purchase-product:${id}`,
  PURCHASE_PRODUCTS_BY_SUPPLIER: (supplierId: number) => `purchase-products:supplier:${supplierId}`,
  STOCK_MOVEMENTS: "stock-movements",
  BRANCHES_LARGE: "branches:large",
  BRANCHES_MEDIUM: (lCode: string) => `branches:medium:${lCode}`,
  BRANCHES_SMALL: (lCode: string, mCode: string) => `branches:small:${lCode}:${mCode}`,
} as const;
