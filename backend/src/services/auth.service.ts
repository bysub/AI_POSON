import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { config } from "../config/index.js";
import { prisma } from "../utils/db.js";
import { logger } from "../utils/logger.js";
import type {
  AdminRole,
  AdminUser,
  JwtPayload,
  LoginRequest,
  LoginResponse,
  TokenPair,
} from "../types/auth.js";

// 인메모리 리프레시 토큰 저장소 (프로덕션에서는 Redis 사용)
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * 인증 서비스
 */
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = config.jwt?.accessSecret ?? "access-secret-key-change-in-production";
    this.refreshTokenSecret =
      config.jwt?.refreshSecret ?? "refresh-secret-key-change-in-production";
    this.accessTokenExpiry = config.jwt?.accessExpiry ?? "15m";
    this.refreshTokenExpiry = config.jwt?.refreshExpiry ?? "7d";
  }

  /**
   * 로그인
   */
  async login(request: LoginRequest): Promise<LoginResponse | null> {
    const { username, password } = request;

    // 관리자 조회 (Prisma에 Admin 모델 필요)
    // 임시로 하드코딩된 관리자 사용
    const admin = await this.findAdminByUsername(username);

    if (!admin) {
      logger.warn({ username }, "Login failed: User not found");
      return null;
    }

    // 비밀번호 검증
    const isValidPassword = await this.verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      logger.warn({ username }, "Login failed: Invalid password");
      return null;
    }

    // 토큰 생성
    const tokens = this.generateTokenPair({
      id: admin.id,
      username: admin.username,
      role: admin.role,
    });

    // 리프레시 토큰 저장
    this.storeRefreshToken(tokens.refreshToken, admin.id);

    // 마지막 로그인 시간 업데이트
    this.updateLastLogin(admin.id);

    logger.info({ username, role: admin.role }, "Login successful");

    return {
      ...tokens,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  /**
   * 토큰 갱신
   */
  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      // 리프레시 토큰 검증
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as JwtPayload;

      // 저장된 토큰 확인
      const storedToken = refreshTokenStore.get(refreshToken);

      if (!storedToken || storedToken.userId !== payload.sub) {
        logger.warn({ userId: payload.sub }, "Refresh token not found or mismatch");
        return null;
      }

      if (storedToken.expiresAt < new Date()) {
        refreshTokenStore.delete(refreshToken);
        logger.warn({ userId: payload.sub }, "Refresh token expired");
        return null;
      }

      // 관리자 조회
      const admin = await this.findAdminById(payload.sub);

      if (!admin) {
        return null;
      }

      // 기존 리프레시 토큰 삭제
      refreshTokenStore.delete(refreshToken);

      // 새 토큰 쌍 생성
      const tokens = this.generateTokenPair({
        id: admin.id,
        username: admin.username,
        role: admin.role,
      });

      // 새 리프레시 토큰 저장
      this.storeRefreshToken(tokens.refreshToken, admin.id);

      logger.info({ userId: admin.id }, "Token refreshed");

      return tokens;
    } catch (error) {
      logger.warn({ error }, "Token refresh failed");
      return null;
    }
  }

  /**
   * 로그아웃
   */
  async logout(refreshToken: string): Promise<void> {
    refreshTokenStore.delete(refreshToken);
    logger.info("Logout successful");
  }

  /**
   * 액세스 토큰 검증
   */
  verifyAccessToken(token: string): AdminUser | null {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JwtPayload;

      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  /**
   * 비밀번호 해시 생성
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * 비밀번호 검증
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 토큰 쌍 생성
   */
  private generateTokenPair(user: AdminUser): TokenPair {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.parseExpiry(this.refreshTokenExpiry),
    });

    return { accessToken, refreshToken };
  }

  /**
   * 리프레시 토큰 저장
   */
  private storeRefreshToken(token: string, userId: string): void {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일

    refreshTokenStore.set(token, { userId, expiresAt });
  }

  /**
   * 만료 시간 파싱 (초 단위)
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) return 900; // 기본 15분

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 900;
    }
  }

  /**
   * 관리자 조회 (username)
   */
  private async findAdminByUsername(
    username: string,
  ): Promise<{ id: string; username: string; passwordHash: string; role: AdminRole } | null> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { username, isActive: true },
        select: {
          id: true,
          username: true,
          passwordHash: true,
          role: true,
        },
      });

      if (admin) {
        return {
          id: admin.id,
          username: admin.username,
          passwordHash: admin.passwordHash,
          role: admin.role as AdminRole,
        };
      }

      // 개발용 폴백 (DB에 관리자가 없을 때)
      // 비밀번호: admin123
      if (username === "admin" && process.env.NODE_ENV !== "production") {
        return {
          id: "dev-admin-001",
          username: "admin",
          passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V6Ay3QyZfvzBOO",
          role: "ADMIN",
        };
      }

      return null;
    } catch (error) {
      logger.warn({ error, username }, "Admin lookup failed, using fallback");
      // DB 연결 실패 시 개발용 폴백
      if (username === "admin" && process.env.NODE_ENV !== "production") {
        return {
          id: "dev-admin-001",
          username: "admin",
          passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V6Ay3QyZfvzBOO",
          role: "ADMIN",
        };
      }
      return null;
    }
  }

  /**
   * 관리자 ID로 조회
   */
  private async findAdminById(
    id: string,
  ): Promise<{ id: string; username: string; role: AdminRole } | null> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id, isActive: true },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      if (admin) {
        return {
          id: admin.id,
          username: admin.username,
          role: admin.role as AdminRole,
        };
      }

      // 개발용 폴백
      if (id === "dev-admin-001" && process.env.NODE_ENV !== "production") {
        return {
          id: "dev-admin-001",
          username: "admin",
          role: "ADMIN",
        };
      }

      return null;
    } catch {
      if (id === "dev-admin-001" && process.env.NODE_ENV !== "production") {
        return {
          id: "dev-admin-001",
          username: "admin",
          role: "ADMIN",
        };
      }
      return null;
    }
  }

  /**
   * 로그인 시간 업데이트
   */
  private async updateLastLogin(adminId: string): Promise<void> {
    try {
      if (!adminId.startsWith("dev-")) {
        await prisma.admin.update({
          where: { id: adminId },
          data: { lastLoginAt: new Date() },
        });
      }
    } catch {
      // 무시
    }
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
