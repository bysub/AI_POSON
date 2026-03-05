import type { PaymentResult, IdempotencyRecord } from "../../types/payment.js";
import { logger } from "../../utils/logger.js";
import { getRedis } from "../../utils/cache.js";

/**
 * 멱등성 서비스 - 중복 결제 방지
 * R-2: Redis 우선, 메모리 폴백
 */
const IDEM_PREFIX = "idem:";

export class IdempotencyService {
  private readonly memoryFallback: Map<string, IdempotencyRecord>;
  private readonly ttlSec: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.memoryFallback = new Map();
    this.ttlSec = Math.floor(ttlMs / 1000);

    // 메모리 폴백용 주기적 정리
    setInterval(() => this.cleanupMemory(), 60 * 60 * 1000);
  }

  /**
   * 멱등성 키 확인 및 잠금
   * @returns 이미 처리된 경우 기존 결과 반환, 새 요청인 경우 null
   */
  async checkAndLock(key: string): Promise<PaymentResult | null> {
    const existing = await this.getRecord(key);

    if (existing) {
      if (existing.status === "COMPLETED" && existing.result) {
        logger.info({ key }, "Idempotency: Returning cached result");
        return existing.result;
      }

      if (existing.status === "PROCESSING") {
        logger.warn({ key }, "Idempotency: Request already processing");
        return {
          success: false,
          errorCode: "DUPLICATE_REQUEST",
          errorMessage: "동일한 요청이 처리 중입니다",
          timestamp: new Date(),
        };
      }

      if (existing.status === "FAILED") {
        logger.info({ key }, "Idempotency: Retrying failed request");
      }
    }

    // 새 레코드 생성
    const record: IdempotencyRecord = {
      key,
      status: "PROCESSING",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.ttlSec * 1000),
    };

    await this.setRecord(key, record);
    return null;
  }

  /**
   * 처리 완료 기록
   */
  async complete(key: string, result: PaymentResult): Promise<void> {
    const record = await this.getRecord(key);
    if (record) {
      record.status = "COMPLETED";
      record.result = result;
      await this.setRecord(key, record);
      logger.info({ key, success: result.success }, "Idempotency: Completed");
    }
  }

  /**
   * 처리 실패 기록
   */
  async fail(key: string, result: PaymentResult): Promise<void> {
    const record = await this.getRecord(key);
    if (record) {
      record.status = "FAILED";
      record.result = result;
      await this.setRecord(key, record);
      logger.warn({ key }, "Idempotency: Failed");
    }
  }

  /**
   * 잠금 해제 (예외 상황)
   */
  async unlock(key: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`${IDEM_PREFIX}${key}`);
      } catch (err) {
        logger.warn({ err }, "Idempotency: Redis unlock failed");
      }
    }
    this.memoryFallback.delete(key);
    logger.info({ key }, "Idempotency: Unlocked");
  }

  /**
   * 레코드 조회
   */
  async get(key: string): Promise<IdempotencyRecord | undefined> {
    return (await this.getRecord(key)) ?? undefined;
  }

  // ── Redis/메모리 저장 추상화 ──

  private async getRecord(key: string): Promise<IdempotencyRecord | null> {
    const redis = getRedis();
    if (redis) {
      try {
        const data = await redis.get(`${IDEM_PREFIX}${key}`);
        if (data) {
          const parsed = JSON.parse(data);
          // Date 문자열 → Date 객체 복원
          parsed.createdAt = new Date(parsed.createdAt);
          parsed.expiresAt = new Date(parsed.expiresAt);
          if (parsed.result?.timestamp) {
            parsed.result.timestamp = new Date(parsed.result.timestamp);
          }
          return parsed as IdempotencyRecord;
        }
        return null;
      } catch (err) {
        logger.warn({ err }, "Idempotency: Redis get failed, using memory");
      }
    }

    const mem = this.memoryFallback.get(key);
    if (mem && mem.expiresAt.getTime() > Date.now()) {
      return mem;
    }
    if (mem) this.memoryFallback.delete(key);
    return null;
  }

  private async setRecord(key: string, record: IdempotencyRecord): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`${IDEM_PREFIX}${key}`, JSON.stringify(record), "EX", this.ttlSec);
        return;
      } catch (err) {
        logger.warn({ err }, "Idempotency: Redis set failed, using memory");
      }
    }
    this.memoryFallback.set(key, record);
  }

  private cleanupMemory(): void {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [key, record] of this.memoryFallback.entries()) {
      if (record.expiresAt.getTime() < now) {
        this.memoryFallback.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, "Idempotency: Cleaned up expired records (memory)");
    }
  }
}

// 싱글톤 인스턴스
export const idempotencyService = new IdempotencyService();
