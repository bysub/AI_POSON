import { Router } from "express";
import { z } from "zod";
import { authService } from "../services/auth.service.js";
import { authenticate } from "../middleware/auth.middleware.js";
import type { AuthenticatedRequest } from "../types/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

// 로그인 요청 스키마
const loginSchema = z.object({
  username: z.string().min(1, "사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

// 토큰 갱신 스키마
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "리프레시 토큰이 필요합니다"),
});

/**
 * POST /api/v1/auth/login
 * 관리자 로그인
 */
router.post("/login", async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "유효하지 않은 요청입니다",
          details: validationResult.error.errors,
        },
      });
    }

    const result = await authService.login(validationResult.data);

    if (!result) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "사용자명 또는 비밀번호가 올바르지 않습니다",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, "Login error");

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "로그인 처리 중 오류가 발생했습니다",
      },
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * 토큰 갱신
 */
router.post("/refresh", async (req, res) => {
  try {
    const validationResult = refreshSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "리프레시 토큰이 필요합니다",
        },
      });
    }

    const result = await authService.refreshToken(validationResult.data.refreshToken);

    if (!result) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "유효하지 않은 리프레시 토큰입니다",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, "Token refresh error");

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "토큰 갱신 중 오류가 발생했습니다",
      },
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * 로그아웃
 */
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    return res.status(200).json({
      success: true,
      message: "로그아웃 되었습니다",
    });
  } catch (error) {
    logger.error({ error }, "Logout error");

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "로그아웃 처리 중 오류가 발생했습니다",
      },
    });
  }
});

/**
 * GET /api/v1/auth/me
 * 현재 로그인 사용자 정보
 */
router.get("/me", authenticate, (req: AuthenticatedRequest, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
});

export { router as authRouter };
