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
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Rate limiting – global
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Rate limiting – auth endpoints (brute-force 방지)
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // 15분에 30회 (로그인 시도 제한)
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "인증 요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
  }),
);

// Rate limiting – payment endpoints
app.use(
  "/api/v1/payments",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 15분에 100회
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "결제 요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
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
