import { logger } from "../../utils/logger.js";

/**
 * 재시도 설정
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * 재시도 핸들러
 * 지수 백오프와 함께 실패한 요청을 재시도
 */
export class RetryHandler {
  private readonly config: RetryConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<RetryConfig> = {}) {
    this.name = name;
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelayMs: config.baseDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 10000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableErrors: config.retryableErrors ?? [
        "NETWORK_ERROR",
        "TIMEOUT",
        "SERVICE_UNAVAILABLE",
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
      ],
    };
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      const errorMessage = error.message;

      return (
        this.config.retryableErrors?.some(
          (retryable) => errorCode === retryable || errorMessage.includes(retryable),
        ) ?? false
      );
    }
    return false;
  }

  /**
   * 지연 시간 계산 (지수 백오프 + 지터)
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt);

    // 지터 추가 (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * 지연 실행
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 재시도와 함께 함수 실행
   */
  async execute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt - 1);
          logger.info(
            { name: this.name, attempt, delay, ...context },
            "Retry: Attempting after delay",
          );
          await this.sleep(delay);
        }

        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < this.config.maxRetries && this.isRetryable(error)) {
          logger.warn(
            {
              name: this.name,
              attempt: attempt + 1,
              maxRetries: this.config.maxRetries,
              error: error instanceof Error ? error.message : String(error),
              ...context,
            },
            "Retry: Retryable error occurred",
          );
        } else {
          logger.error(
            {
              name: this.name,
              attempt: attempt + 1,
              error: error instanceof Error ? error.message : String(error),
              isRetryable: this.isRetryable(error),
              ...context,
            },
            "Retry: Max retries exceeded or non-retryable error",
          );
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * 재시도 설정 조회
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * VAN별 기본 재시도 설정
 */
export const VAN_RETRY_CONFIG: Record<string, Partial<RetryConfig>> = {
  NICE: { maxRetries: 3, baseDelayMs: 1000 },
  KICC: { maxRetries: 2, baseDelayMs: 2000 },
  KIS: { maxRetries: 3, baseDelayMs: 1000 },
  SMARTRO: { maxRetries: 2, baseDelayMs: 3000 },
  default: { maxRetries: 3, baseDelayMs: 1000 },
};

export function getVanRetryConfig(vanCode: string): Partial<RetryConfig> {
  return VAN_RETRY_CONFIG[vanCode] || VAN_RETRY_CONFIG.default;
}
