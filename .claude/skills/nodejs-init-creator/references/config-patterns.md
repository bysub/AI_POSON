# Configuration Patterns

## config/index.js

```javascript
const _ = require("lodash");
const path = require("path");

const env = process.env.NODE_ENV || "development";

// Load environment-specific config
const defaultConfig = require("./default");
const envConfig = require(`./${env}`);

// Deep merge configs
const config = _.merge({}, defaultConfig, envConfig);

// Validate required configuration
function validateConfig(config) {
  const required = ["server.port", "database.server", "database.name", "session.secret"];

  const missing = required.filter((path) => !_.get(config, path));

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }

  // Production-specific validation
  if (env === "production") {
    if (config.session.secret === "your_session_secret_key_here") {
      throw new Error("Production requires a proper session secret");
    }

    if (config.database.password === "your_password") {
      throw new Error("Production requires proper database credentials");
    }
  }
}

validateConfig(config);

module.exports = config;
```

## config/default.js

```javascript
module.exports = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || "development",
    httpsRedirect: process.env.ENABLE_HTTPS_REDIRECT === "true",
  },

  database: {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "your_password",
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    name: process.env.DB_NAME || "your_database",
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  },

  session: {
    secret: process.env.SESSION_SECRET || "your_session_secret_key_here",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    name: "sid",
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === "true",
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your_refresh_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    helmet: {
      contentSecurityPolicy: false,
    },
  },

  cors: {
    origin: process.env.ORIGIN_URL || "http://localhost:5173",
  },

  rateLimit: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
    },
  },

  file: {
    uploadPath: process.env.FILE_UPLOAD_PATH || "./uploads",
    maxSize: parseInt(process.env.FILE_UPLOAD_MAX_SIZE, 10) || 209715200, // 200MB
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== "false",
  },

  logging: {
    level: "info",
    dir: "./logs",
  },
};
```

## config/development.js

```javascript
module.exports = {
  server: {
    env: "development",
  },

  security: {
    helmet: {
      contentSecurityPolicy: false,
    },
  },

  swagger: {
    enabled: true,
  },

  logging: {
    level: "debug",
  },
};
```

## config/production.js

```javascript
module.exports = {
  server: {
    env: "production",
    httpsRedirect: true,
  },

  session: {
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "strict",
    },
  },

  redis: {
    enabled: true,
  },

  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    },
  },

  swagger: {
    enabled: false,
  },

  logging: {
    level: "warn",
  },
};
```

## config/test.js

```javascript
module.exports = {
  server: {
    env: "test",
    port: 3001,
  },

  database: {
    name: process.env.DB_NAME_TEST || "your_database_test",
  },

  session: {
    secret: "test_session_secret",
  },

  redis: {
    enabled: false,
  },

  logging: {
    level: "error",
  },
};
```

## utils/logger.ts

```typescript
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import config from "../config";

const logDir = config.logging.dir;
const logLevel = config.logging.level;

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    const corrId = correlationId ? `[${correlationId}]` : "";
    return `${timestamp} ${level.toUpperCase()} ${corrId} ${message} ${metaStr}`.trim();
  }),
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    const corrId = correlationId ? `[${correlationId.slice(0, 8)}]` : "";
    return `${timestamp} ${level} ${corrId} ${message} ${metaStr}`.trim();
  }),
);

// Daily rotate transport for output logs
const outputTransport = new DailyRotateFile({
  filename: path.join(logDir, "out-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: logLevel,
  format: customFormat,
});

// Daily rotate transport for error logs
const errorTransport = new DailyRotateFile({
  filename: path.join(logDir, "err-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
  format: customFormat,
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: logLevel,
});

const logger = winston.createLogger({
  level: logLevel,
  transports: [outputTransport, errorTransport],
});

// Add console in development
if (config.server.env !== "production") {
  logger.add(consoleTransport);
}

// Handle transport errors
outputTransport.on("error", (error) => {
  console.error("Output log transport error:", error);
});

errorTransport.on("error", (error) => {
  console.error("Error log transport error:", error);
});

export default logger;
```

## utils/paginationUtils.ts

```typescript
import sql, { Request } from "mssql";

export interface PaginationParams {
  pageNum?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedResponse<T> {
  list: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Execute a paginated query with OFFSET/FETCH
 *
 * @param request - MSSQL Request object with parameters already bound
 * @param baseQuery - Base SELECT query (without ORDER BY pagination)
 * @param countQuery - COUNT query for total records
 * @param params - Pagination parameters
 * @returns Paginated response
 */
export async function executePaginatedQuery<T>(
  request: Request,
  baseQuery: string,
  countQuery: string,
  params: PaginationParams,
): Promise<PaginatedResponse<T>> {
  const pageNum = params.pageNum || 1;
  const pageSize = params.pageSize || 20;
  const offset = (pageNum - 1) * pageSize;

  // Get total count
  const countResult = await request.query<{ totalCount: number }>(countQuery);
  const totalCount = countResult.recordset[0]?.totalCount || 0;

  // Get paginated data
  const paginatedQuery = `
    ${baseQuery}
    OFFSET ${offset} ROWS
    FETCH NEXT ${pageSize} ROWS ONLY
  `;

  const dataResult = await request.query<T>(paginatedQuery);

  return {
    list: dataResult.recordset,
    totalCount,
    pageSize,
    currentPage: pageNum,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Build ORDER BY clause from params
 */
export function buildOrderByClause(
  params: PaginationParams,
  defaultSort: string = "IDX DESC",
): string {
  if (params.sortField) {
    const order = params.sortOrder || "ASC";
    return `ORDER BY ${params.sortField} ${order}`;
  }
  return `ORDER BY ${defaultSort}`;
}

/**
 * Build WHERE clause helper
 */
export function buildWhereClause(conditions: string[], includeDeleted: boolean = false): string {
  const allConditions = includeDeleted ? conditions : ["DEL_YN = 'N'", ...conditions];

  return allConditions.length > 0 ? `WHERE ${allConditions.join(" AND ")}` : "";
}
```

## utils/responseUtils.ts

```typescript
import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  status: number = 200,
): Response {
  const correlationId = (res.req as any).correlationId;

  return res.status(status).json({
    success: true,
    data,
    message,
    correlationId,
  });
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: string,
  message: string,
  status: number = 500,
): Response {
  const correlationId = (res.req as any).correlationId;

  return res.status(status).json({
    success: false,
    error,
    message,
    correlationId,
  });
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  errors: { field: string; message: string }[],
): Response {
  const correlationId = (res.req as any).correlationId;

  return res.status(400).json({
    success: false,
    error: "VALIDATION_ERROR",
    message: "입력값이 올바르지 않습니다.",
    errors,
    correlationId,
  });
}

/**
 * Send not found response
 */
export function sendNotFound(
  res: Response,
  message: string = "리소스를 찾을 수 없습니다.",
): Response {
  return sendError(res, "NOT_FOUND", message, 404);
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: Response, message: string = "인증이 필요합니다."): Response {
  return sendError(res, "UNAUTHORIZED", message, 401);
}

/**
 * Send forbidden response
 */
export function sendForbidden(res: Response, message: string = "접근 권한이 없습니다."): Response {
  return sendError(res, "FORBIDDEN", message, 403);
}
```
