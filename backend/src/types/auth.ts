import type { Request } from "express";

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
}

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    role: AdminRole;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
