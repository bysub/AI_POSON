import type { PaymentResult, IdempotencyRecord } from "../../types/payment.js";
import { logger } from "../../utils/logger.js";

/**
 * 멱등성 서비스 - 중복 결제 방지
 * Redis 또는 메모리 기반으로 동작
 */
export class IdempotencyService {
  private readonly store: Map<string, IdempotencyRecord>;
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    // 기본 24시간
    this.store = new Map();
    this.ttlMs = ttlMs;

    // 주기적으로 만료된 레코드 정리
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // 1시간마다
  }

  /**
   * 멱등성 키 확인 및 잠금
   * @returns 이미 처리된 경우 기존 결과 반환, 새 요청인 경우 null
   */
  async checkAndLock(key: string): Promise<PaymentResult | null> {
    const existing = this.store.get(key);

    if (existing) {
      if (existing.status === "COMPLETED" && existing.result) {
        logger.info({ key }, "Idempotency: Returning cached result");
        return existing.result;
      }

      if (existing.status === "PROCESSING") {
        // 처리 중인 요청이 있음 - 에러 반환
        logger.warn({ key }, "Idempotency: Request already processing");
        return {
          success: false,
          errorCode: "DUPLICATE_REQUEST",
          errorMessage: "동일한 요청이 처리 중입니다",
          timestamp: new Date(),
        };
      }

      if (existing.status === "FAILED") {
        // 실패한 요청은 재시도 허용
        logger.info({ key }, "Idempotency: Retrying failed request");
      }
    }

    // 새 레코드 생성
    const record: IdempotencyRecord = {
      key,
      status: "PROCESSING",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.ttlMs),
    };

    this.store.set(key, record);
    return null;
  }

  /**
   * 처리 완료 기록
   */
  async complete(key: string, result: PaymentResult): Promise<void> {
    const record = this.store.get(key);
    if (record) {
      record.status = "COMPLETED";
      record.result = result;
      logger.info({ key, success: result.success }, "Idempotency: Completed");
    }
  }

  /**
   * 처리 실패 기록
   */
  async fail(key: string, result: PaymentResult): Promise<void> {
    const record = this.store.get(key);
    if (record) {
      record.status = "FAILED";
      record.result = result;
      logger.warn({ key }, "Idempotency: Failed");
    }
  }

  /**
   * 잠금 해제 (예외 상황)
   */
  async unlock(key: string): Promise<void> {
    this.store.delete(key);
    logger.info({ key }, "Idempotency: Unlocked");
  }

  /**
   * 만료된 레코드 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt.getTime() < now) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, "Idempotency: Cleaned up expired records");
    }
  }

  /**
   * 레코드 조회 (디버깅용)
   */
  get(key: string): IdempotencyRecord | undefined {
    return this.store.get(key);
  }
}

// 싱글톤 인스턴스
export const idempotencyService = new IdempotencyService();
