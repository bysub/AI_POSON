import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/auth.service";
import { prisma } from "../utils/db.js";

// config 모킹
vi.mock("../config/index.js", () => ({
  config: {
    env: "development",
    jwt: {
      accessSecret: "test-access-secret",
      refreshSecret: "test-refresh-secret",
      accessExpiry: "15m",
      refreshExpiry: "7d",
    },
  },
}));

describe("AuthService", () => {
  let authService: AuthService;
  const testPasswordHash = bcrypt.hashSync("admin123", 12);

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe("login", () => {
    it("올바른 자격증명으로 로그인 성공 시 토큰을 반환한다", async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue({
        id: "admin-1",
        username: "admin",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        isActive: true,
      } as any);

      const result = await authService.login({
        username: "admin",
        password: "admin123",
      });

      expect(result).not.toBeNull();
      expect(result!.accessToken).toBeDefined();
      expect(result!.refreshToken).toBeDefined();
      expect(result!.user.username).toBe("admin");
      expect(result!.user.role).toBe("ADMIN");
      expect(result!.expiresIn).toBe(900); // 15m = 900s
    });

    it("존재하지 않는 사용자로 로그인 실패한다", async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(null);

      // development 환경이므로 admin은 dev fallback이 동작하지만, unknown은 실패
      const result = await authService.login({
        username: "unknown",
        password: "password",
      });

      expect(result).toBeNull();
    });

    it("잘못된 비밀번호로 로그인 실패한다", async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue({
        id: "admin-1",
        username: "admin",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        isActive: true,
      } as any);

      const result = await authService.login({
        username: "admin",
        password: "wrong-password",
      });

      expect(result).toBeNull();
    });
  });

  describe("verifyAccessToken", () => {
    it("유효한 토큰에서 사용자 정보를 반환한다", () => {
      const token = jwt.sign(
        { sub: "admin-1", username: "admin", role: "ADMIN" },
        "test-access-secret",
        { expiresIn: 900 },
      );

      const user = authService.verifyAccessToken(token);
      expect(user).not.toBeNull();
      expect(user!.id).toBe("admin-1");
      expect(user!.username).toBe("admin");
      expect(user!.role).toBe("ADMIN");
    });

    it("만료된 토큰은 null을 반환한다", () => {
      const token = jwt.sign(
        { sub: "admin-1", username: "admin", role: "ADMIN" },
        "test-access-secret",
        { expiresIn: -1 },
      );

      const user = authService.verifyAccessToken(token);
      expect(user).toBeNull();
    });

    it("잘못된 시크릿의 토큰은 null을 반환한다", () => {
      const token = jwt.sign(
        { sub: "admin-1", username: "admin", role: "ADMIN" },
        "wrong-secret",
      );

      const user = authService.verifyAccessToken(token);
      expect(user).toBeNull();
    });

    it("형식이 잘못된 토큰은 null을 반환한다", () => {
      expect(authService.verifyAccessToken("invalid-token")).toBeNull();
      expect(authService.verifyAccessToken("")).toBeNull();
    });
  });

  describe("hashPassword", () => {
    it("비밀번호를 bcrypt 해시로 변환한다", async () => {
      const hash = await authService.hashPassword("test123");
      expect(hash).toBeDefined();
      expect(hash).not.toBe("test123");

      const isValid = await bcrypt.compare("test123", hash);
      expect(isValid).toBe(true);
    });
  });

  describe("refreshToken", () => {
    it("유효한 리프레시 토큰으로 새 토큰 쌍을 반환한다", async () => {
      // 1. 먼저 로그인하여 토큰 발급
      vi.mocked(prisma.admin.findUnique).mockResolvedValue({
        id: "admin-1",
        username: "admin",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        isActive: true,
      } as any);

      const loginResult = await authService.login({
        username: "admin",
        password: "admin123",
      });

      expect(loginResult).not.toBeNull();

      // 2. 리프레시 토큰으로 갱신
      const refreshResult = await authService.refreshToken(loginResult!.refreshToken);

      expect(refreshResult).not.toBeNull();
      expect(refreshResult!.accessToken).toBeDefined();
      expect(refreshResult!.refreshToken).toBeDefined();
    });

    it("잘못된 리프레시 토큰은 null을 반환한다", async () => {
      const result = await authService.refreshToken("invalid-token");
      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("로그아웃 시 에러 없이 완료된다", async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue({
        id: "admin-1",
        username: "admin",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        isActive: true,
      } as any);

      const loginResult = await authService.login({
        username: "admin",
        password: "admin123",
      });

      await expect(authService.logout(loginResult!.refreshToken)).resolves.not.toThrow();
    });
  });
});
