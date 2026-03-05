import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../services/payment/circuit-breaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker("test-van", {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 상태", () => {
    it("CLOSED 상태로 시작한다", () => {
      expect(cb.getState()).toBe("CLOSED");
      expect(cb.canExecute()).toBe(true);
    });

    it("getStatus가 올바른 정보를 반환한다", () => {
      const status = cb.getStatus();
      expect(status.name).toBe("test-van");
      expect(status.state).toBe("CLOSED");
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });
  });

  describe("CLOSED → OPEN 전환", () => {
    it("failureThreshold 도달 시 OPEN으로 전환된다", () => {
      cb.onFailure();
      cb.onFailure();
      expect(cb.getState()).toBe("CLOSED");

      cb.onFailure(); // 3번째 = threshold
      expect(cb.getState()).toBe("OPEN");
      expect(cb.canExecute()).toBe(false);
    });

    it("성공 시 실패 카운트가 리셋된다", () => {
      cb.onFailure();
      cb.onFailure();
      cb.onSuccess(); // 리셋
      cb.onFailure(); // 1번째
      cb.onFailure(); // 2번째
      expect(cb.getState()).toBe("CLOSED");
    });
  });

  describe("OPEN → HALF_OPEN 전환", () => {
    it("타임아웃 경과 후 HALF_OPEN으로 전환된다", () => {
      // OPEN 상태로 만들기
      for (let i = 0; i < 3; i++) cb.onFailure();
      expect(cb.getState()).toBe("OPEN");

      // 타임아웃 전
      vi.advanceTimersByTime(4999);
      expect(cb.getState()).toBe("OPEN");

      // 타임아웃 후
      vi.advanceTimersByTime(1);
      expect(cb.getState()).toBe("HALF_OPEN");
      expect(cb.canExecute()).toBe(true);
    });
  });

  describe("HALF_OPEN → CLOSED 전환", () => {
    it("successThreshold 도달 시 CLOSED로 전환된다", () => {
      // HALF_OPEN으로 만들기
      for (let i = 0; i < 3; i++) cb.onFailure();
      vi.advanceTimersByTime(5000);
      expect(cb.getState()).toBe("HALF_OPEN");

      cb.onSuccess(); // 1번째
      expect(cb.getState()).toBe("HALF_OPEN");

      cb.onSuccess(); // 2번째 = threshold
      expect(cb.getState()).toBe("CLOSED");
      expect(cb.getStatus().failureCount).toBe(0);
    });
  });

  describe("HALF_OPEN → OPEN 전환", () => {
    it("HALF_OPEN에서 실패 시 바로 OPEN으로 전환된다", () => {
      for (let i = 0; i < 3; i++) cb.onFailure();
      vi.advanceTimersByTime(5000);
      expect(cb.getState()).toBe("HALF_OPEN");

      cb.onFailure();
      expect(cb.getState()).toBe("OPEN");
    });
  });

  describe("execute", () => {
    it("CLOSED에서 함수를 실행하고 결과를 반환한다", async () => {
      const result = await cb.execute(() => Promise.resolve("ok"));
      expect(result).toBe("ok");
    });

    it("함수 실패 시 에러를 전파하고 실패 카운트를 증가시킨다", async () => {
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
      expect(cb.getStatus().failureCount).toBe(1);
    });

    it("OPEN에서 CircuitBreakerOpenError를 던진다", async () => {
      for (let i = 0; i < 3; i++) cb.onFailure();

      await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(
        CircuitBreakerOpenError,
      );
    });

    it("CircuitBreakerOpenError에 circuitName이 포함된다", async () => {
      for (let i = 0; i < 3; i++) cb.onFailure();

      try {
        await cb.execute(() => Promise.resolve("ok"));
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitBreakerOpenError);
        expect((err as CircuitBreakerOpenError).circuitName).toBe("test-van");
      }
    });
  });

  describe("reset", () => {
    it("OPEN 상태를 CLOSED로 리셋한다", () => {
      for (let i = 0; i < 3; i++) cb.onFailure();
      expect(cb.getState()).toBe("OPEN");

      cb.reset();
      expect(cb.getState()).toBe("CLOSED");
      expect(cb.getStatus().failureCount).toBe(0);
      expect(cb.getStatus().successCount).toBe(0);
    });
  });

  describe("기본값", () => {
    it("config 없이 기본 임계값이 적용된다", () => {
      const defaultCb = new CircuitBreaker("default");

      // 기본 failureThreshold = 5
      for (let i = 0; i < 4; i++) defaultCb.onFailure();
      expect(defaultCb.getState()).toBe("CLOSED");

      defaultCb.onFailure(); // 5번째
      expect(defaultCb.getState()).toBe("OPEN");
    });
  });
});
