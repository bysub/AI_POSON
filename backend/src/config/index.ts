import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// S-1/S-17: 프로덕션에서 JWT Secret 미설정 시 즉시 종료
if (isProduction) {
  const missing: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET) missing.push("JWT_ACCESS_SECRET");
  if (!process.env.JWT_REFRESH_SECRET) missing.push("JWT_REFRESH_SECRET");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");

  if (missing.length > 0) {
    console.error(`[FATAL] 필수 환경변수가 설정되지 않았습니다: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// 개발 환경에서도 JWT Secret 폴백 시 경고
if (!isProduction && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  console.warn("[WARN] JWT Secret이 환경변수에 설정되지 않았습니다. 개발용 기본값을 사용합니다.");
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),

  database: {
    url: process.env.DATABASE_URL || "",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-only-access-secret-do-not-use-in-prod",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-only-refresh-secret-do-not-use-in-prod",
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
} as const;

export type Config = typeof config;
