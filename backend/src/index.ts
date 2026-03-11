import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";

import { config } from "./config/index.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./utils/db.js";
import { orderService } from "./services/order.service.js";

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      // origin 없는 요청 허용 (Electron 앱, curl 등)
      if (!origin) {
        callback(null, true);
        return;
      }
      // 허용 목록 확인
      if (config.cors.origin.includes(origin)) {
        callback(null, true);
        return;
      }
      // Electron 앱 프로토콜 허용 (app://poson 등)
      if (/^app:\/\//.test(origin)) {
        callback(null, true);
        return;
      }
      // 개발 환경: 로컬 네트워크 IP 자동 허용 (192.168.x.x, 10.x.x.x)
      if (config.env !== "production" && /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost)/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: Origin '${origin}' is not allowed`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Rate limiting – 공통 설정
const isDev = config.env === "development";

/** Device ID 기반 rate limit 키 (NAT 환경에서 기기별 독립 카운터) */
const deviceKeyGenerator = (req: express.Request): string => {
  const deviceId = req.headers["x-device-id"] as string | undefined;
  return deviceId || req.ip || "unknown";
};

/** 인증된 요청 skip (유효한 JWT 토큰 보유 시 rate limit 면제) */
const skipAuthenticated = (req: express.Request): boolean => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const { authService } = require("./services/auth.service.js");
    return !!authService.verifyAccessToken(authHeader.substring(7));
  } catch { return false; }
};

/** 공통 JSON 429 핸들러 (로깅 포함) */
const rateLimitHandler = (message: string) => (req: express.Request, res: express.Response) => {
  logger.warn(
    { ip: req.ip, deviceId: req.headers["x-device-id"], path: req.path, method: req.method },
    `Rate limit exceeded: ${req.path}`,
  );
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message,
      retryAfter: res.getHeader("Retry-After"),
    },
  });
};

// Rate limiting – global (NAT 환경: 매장 내 10대 기기 공유 고려)
// ⚠️ express-rate-limit v7: max=0은 "전부 차단"이므로 skip으로 dev 비활성화
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000, // prod: 15분당 3000회 (기기 10대 × 300회)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: deviceKeyGenerator,
    skip: isDev ? () => true : undefined,
    handler: rateLimitHandler("요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
  }),
);

// Rate limiting – 로그인만 (brute-force 방지, refresh/logout/me 제외)
app.use(
  "/api/v1/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // prod: 15분당 50회 (기기 10대 × 5회 재시도)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: deviceKeyGenerator,
    skip: isDev ? () => true : undefined,
    handler: rateLimitHandler("로그인 요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
  }),
);

// Rate limiting – 토큰 갱신 (자동 갱신이므로 넉넉하게)
app.use(
  "/api/v1/auth/refresh",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // prod: 15분당 200회
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: deviceKeyGenerator,
    skip: isDev ? () => true : undefined,
    handler: rateLimitHandler("토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
  }),
);

// Rate limiting – payment endpoints (인증된 요청은 skip)
app.use(
  "/api/v1/payments",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // prod: 15분당 300회 (피크타임 기기 10대 동시 결제)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: deviceKeyGenerator,
    skip: isDev ? () => true : skipAuthenticated,
    handler: rateLimitHandler("결제 요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Compression
app.use(compression());

// Logging
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

// API routes
app.use("/api", apiRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.env} mode`);

  // 분할 결제 타임아웃 보호 배치 (5분 주기)
  setInterval(async () => {
    try {
      await orderService.recoverStaleSplitPayments();
    } catch (err) {
      logger.error({ error: err instanceof Error ? err.message : String(err) }, "Split payment recovery batch failed");
    }
  }, 5 * 60 * 1000);
});

export { app };
