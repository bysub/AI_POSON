import { logger } from "../../utils/logger.js";

/**
 * Circuit Breaker 상태
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit Breaker 설정
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // 실패 임계값
  successThreshold: number; // 반개방 상태에서 성공 임계값
  timeout: number; // 개방 상태 유지 시간 (ms)
}

/**
 * Circuit Breaker 패턴 구현
 * 연속 실패 시 일시적으로 요청 차단하여 시스템 보호
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 30000, // 30초
    };
  }

  /**
   * 현재 상태 확인
   */
  getState(): CircuitState {
    if (this.state === "OPEN") {
      // 타임아웃 경과 시 HALF_OPEN으로 전환
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
        logger.info({ name: this.name }, "Circuit breaker: OPEN -> HALF_OPEN");
      }
    }
    return this.state;
  }

  /**
   * 요청 허용 여부 확인
   */
  canExecute(): boolean {
    const state = this.getState();
    return state !== "OPEN";
  }

  /**
   * 함수 실행 (Circuit Breaker 적용)
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      logger.warn({ name: this.name, state: this.state }, "Circuit breaker: Request blocked");
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 성공 처리
   */
  onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
        logger.info({ name: this.name }, "Circuit breaker: HALF_OPEN -> CLOSED");
      }
    } else if (this.state === "CLOSED") {
      // 연속 실패 카운트 리셋
      this.failureCount = 0;
    }
  }

  /**
   * 실패 처리
   */
  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      // HALF_OPEN에서 실패 시 바로 OPEN
      this.state = "OPEN";
      this.successCount = 0;
      logger.warn({ name: this.name }, "Circuit breaker: HALF_OPEN -> OPEN");
    } else if (this.state === "CLOSED" && this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      logger.warn(
        { name: this.name, failureCount: this.failureCount },
        "Circuit breaker: CLOSED -> OPEN",
      );
    }
  }

  /**
   * 강제 리셋
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    logger.info({ name: this.name }, "Circuit breaker: Reset");
  }

  /**
   * 상태 정보 조회
   */
  getStatus(): {
    name: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
  } {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

/**
 * Circuit Breaker Open 에러
 */
export class CircuitBreakerOpenError extends Error {
  readonly circuitName: string;

  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' is open`);
    this.name = "CircuitBreakerOpenError";
    this.circuitName = circuitName;
  }
}
