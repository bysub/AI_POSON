import type { Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { AppError } from "./errorHandler.js";
import type { AuthenticatedRequest, AdminRole } from "../types/auth.js";

/**
 * JWT 인증 미들웨어
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "인증 토큰이 필요합니다", "UNAUTHORIZED"));
  }

  const token = authHeader.substring(7);
  const user = authService.verifyAccessToken(token);

  if (!user) {
    return next(new AppError(401, "유효하지 않은 토큰입니다", "INVALID_TOKEN"));
  }

  req.user = user;
  next();
}

/**
 * 권한 확인 미들웨어 팩토리
 */
export function authorize(...allowedRoles: AdminRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, "인증이 필요합니다", "UNAUTHORIZED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, "권한이 없습니다", "FORBIDDEN"));
    }

    next();
  };
}

/**
 * 선택적 인증 미들웨어 (토큰 있으면 검증, 없어도 통과)
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = authService.verifyAccessToken(token);

    if (user) {
      req.user = user;
    }
  }

  next();
}
