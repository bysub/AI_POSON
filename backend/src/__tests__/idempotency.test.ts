import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdempotencyService } from "../services/payment/idempotency.service";
import type { PaymentResult } from "../types/payment";

// getRedis는 setup.ts에서 null을 반환하도록 되어 있으므로 메모리 모드로 동작

describe("IdempotencyService", () => {
  let service: IdempotencyService;

  beforeEach(() => {
    // 짧은 TTL로 생성 (테스트 편의)
    service = new IdempotencyService(60 * 1000); // 1분
  });

  const successResult: PaymentResult = {
    success: true,
    transactionId: "txn-001",
    approvalNumber: "AP001",
    vanCode: "NICE",
    amount: 10000,
    timestamp: new Date(),
  };

  const failResult: PaymentResult = {
    success: false,
    errorCode: "VAN_ERROR",
    errorMessage: "VAN 연결 실패",
    timestamp: new Date(),
  };

  describe("checkAndLock", () => {
    it("새 키는 null을 반환하고 PROCESSING 상태로 잠금한다", async () => {
      const result = await service.checkAndLock("key-1");
      expect(result).toBeNull();

      const record = await service.get("key-1");
      expect(record).toBeDefined();
      expect(record!.status).toBe("PROCESSING");
    });

    it("PROCESSING 상태의 키는 DUPLICATE_REQUEST를 반환한다", async () => {
      await service.checkAndLock("key-2");

      const result = await service.checkAndLock("key-2");
      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
      expect(result!.errorCode).toBe("DUPLICATE_REQUEST");
    });

    it("COMPLETED 상태의 키는 캐시된 결과를 반환한다", async () => {
      await service.checkAndLock("key-3");
      await service.complete("key-3", successResult);

      const result = await service.checkAndLock("key-3");
      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.transactionId).toBe("txn-001");
    });

    it("FAILED 상태의 키는 재시도를 허용한다 (null 반환)", async () => {
      await service.checkAndLock("key-4");
      await service.fail("key-4", failResult);

      const result = await service.checkAndLock("key-4");
      expect(result).toBeNull(); // 재시도 허용

      const record = await service.get("key-4");
      expect(record!.status).toBe("PROCESSING");
    });
  });

  describe("complete", () => {
    it("레코드 상태를 COMPLETED로 변경하고 결과를 저장한다", async () => {
      await service.checkAndLock("key-5");
      await service.complete("key-5", successResult);

      const record = await service.get("key-5");
      expect(record!.status).toBe("COMPLETED");
      expect(record!.result).toBeDefined();
      expect(record!.result!.success).toBe(true);
    });
  });

  describe("fail", () => {
    it("레코드 상태를 FAILED로 변경한다", async () => {
      await service.checkAndLock("key-6");
      await service.fail("key-6", failResult);

      const record = await service.get("key-6");
      expect(record!.status).toBe("FAILED");
    });
  });

  describe("unlock", () => {
    it("레코드를 완전히 삭제한다", async () => {
      await service.checkAndLock("key-7");
      await service.unlock("key-7");

      const record = await service.get("key-7");
      expect(record).toBeUndefined();
    });
  });

  describe("TTL 만료", () => {
    it("만료된 레코드는 조회되지 않는다", async () => {
      vi.useFakeTimers();

      const shortService = new IdempotencyService(1000); // 1초 TTL
      await shortService.checkAndLock("key-ttl");

      // TTL 경과
      vi.advanceTimersByTime(1001);

      const record = await shortService.get("key-ttl");
      expect(record).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
