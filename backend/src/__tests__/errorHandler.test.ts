import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError, errorHandler } from "../middleware/errorHandler.js";

describe("errorHandler", () => {
  const mockReq = {} as Request;
  const mockNext = vi.fn() as unknown as NextFunction;

  function createMockRes() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    return res;
  }

  it("AppError를 적절한 상태코드로 응답한다", () => {
    const res = createMockRes();
    const error = new AppError(400, "잘못된 요청", "BAD_REQUEST");

    errorHandler(error, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "잘못된 요청",
      },
    });
  });

  it("일반 Error를 500으로 응답한다", () => {
    const res = createMockRes();
    const error = new Error("Unexpected error");

    errorHandler(error, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });

  it("AppError의 code가 없으면 'ERROR'로 기본값 사용", () => {
    const res = createMockRes();
    const error = new AppError(422, "처리 불가");

    errorHandler(error, mockReq, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "ERROR",
        message: "처리 불가",
      },
    });
  });
});
