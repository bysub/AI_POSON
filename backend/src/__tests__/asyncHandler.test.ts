import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

describe("asyncHandler", () => {
  const mockReq = {} as Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;
    mockNext = vi.fn() as unknown as NextFunction;
  });

  it("정상 실행 시 next를 호출하지 않는다", async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.json({ success: true });
    });

    await handler(mockReq, mockRes, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("에러 발생 시 next(error)를 호출한다", async () => {
    const testError = new Error("Test error");
    const handler = asyncHandler(async () => {
      throw testError;
    });

    await handler(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it("rejected Promise를 next로 전달한다", async () => {
    const rejectedError = new Error("Rejected");
    const handler = asyncHandler(async () => {
      throw rejectedError;
    });

    handler(mockReq, mockRes, mockNext);
    // asyncHandler 내부의 Promise.catch가 microtask 큐에서 처리되므로 대기
    await new Promise((r) => setTimeout(r, 0));
    expect(mockNext).toHaveBeenCalledWith(rejectedError);
  });
});
