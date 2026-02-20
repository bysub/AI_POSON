# Middleware Patterns

## correlationId.js

```javascript
const { v4: uuidv4 } = require("uuid");

function correlationId(req, res, next) {
  // Use existing correlation ID from header or generate new one
  const correlationId = req.headers["x-correlation-id"] || uuidv4();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  next();
}

module.exports = { correlationId };
```

## auth.ts (Session-based)

```typescript
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
    interface Session {
      user?: {
        userId: string;
        userName: string;
        userNm: string;
        email?: string;
        roleId?: string;
        [key: string]: unknown;
      };
    }
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for specific paths
  const publicPaths = ["/health", "/login", "/logout"];
  if (publicPaths.some((path) => req.path.includes(path))) {
    return next();
  }

  if (req.session && req.session.user) {
    logger.debug("User authenticated", {
      userId: req.session.user.userId,
      correlationId: req.correlationId,
    });
    return next();
  }

  logger.warn("Unauthorized access attempt", {
    path: req.path,
    correlationId: req.correlationId,
  });

  res.status(401).json({
    error: "Unauthorized",
    message: "로그인이 필요합니다.",
    correlationId: req.correlationId,
  });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "로그인이 필요합니다.",
        correlationId: req.correlationId,
      });
      return;
    }

    const userRole = req.session.user.roleId;
    if (!userRole || !roles.includes(userRole)) {
      logger.warn("Access denied - insufficient role", {
        userId: req.session.user.userId,
        requiredRoles: roles,
        userRole,
        correlationId: req.correlationId,
      });

      res.status(403).json({
        error: "Forbidden",
        message: "접근 권한이 없습니다.",
        correlationId: req.correlationId,
      });
      return;
    }

    next();
  };
}
```

## auth.ts (JWT-based)

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import logger from "../utils/logger";

interface JwtPayload {
  userId: string;
  userName: string;
  userNm: string;
  roleId?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      correlationId?: string;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: "Unauthorized",
      message: "토큰이 필요합니다.",
      correlationId: req.correlationId,
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "TokenExpired",
        message: "토큰이 만료되었습니다.",
        correlationId: req.correlationId,
      });
      return;
    }

    logger.warn("Invalid token", {
      error: (error as Error).message,
      correlationId: req.correlationId,
    });

    res.status(403).json({
      error: "Forbidden",
      message: "유효하지 않은 토큰입니다.",
      correlationId: req.correlationId,
    });
  }
}

export function generateTokens(user: Omit<JwtPayload, "iat" | "exp">) {
  const accessToken = jwt.sign(user, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(user, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

export function refreshAccessToken(refreshToken: string): string | null {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    const { iat, exp, ...user } = decoded;

    return jwt.sign(user, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  } catch {
    return null;
  }
}
```

## errorHandler.js

```javascript
const logger = require("../utils/logger").default;

function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || "unknown";

  // Log error details
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't expose stack trace in production
  const response = {
    error: err.name || "InternalServerError",
    message: process.env.NODE_ENV === "production" ? "서버 오류가 발생했습니다." : err.message,
    correlationId,
  };

  // Add validation errors if present
  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
```

## rateLimiter.js

```javascript
const rateLimit = require("express-rate-limit");
const config = require("../config");

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs, // 15 minutes
  max: config.rateLimit.api.max, // 100 requests per window
  message: {
    error: "TooManyRequests",
    message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || "unknown";
  },
});

// Auth endpoints rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs, // 15 minutes
  max: config.rateLimit.auth.max, // 5 login attempts per window
  message: {
    error: "TooManyRequests",
    message: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
```

## validators/dtoValidator.ts

```typescript
import { Request, Response, NextFunction } from "express";
import { validate, ValidationError } from "class-validator";
import { plainToInstance } from "class-transformer";

interface FormattedError {
  field: string;
  message: string;
  constraints: Record<string, string>;
}

function formatErrors(errors: ValidationError[]): FormattedError[] {
  return errors.map((error) => ({
    field: error.property,
    message: Object.values(error.constraints || {}).join(", "),
    constraints: error.constraints || {},
  }));
}

export function validateDto<T extends object>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dtoInstance = plainToInstance(dtoClass, req.body);
    const errors = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      res.status(400).json({
        error: "ValidationError",
        message: "입력값이 올바르지 않습니다.",
        errors: formatErrors(errors),
        correlationId: req.correlationId,
      });
      return;
    }

    req.body = dtoInstance;
    next();
  };
}
```

## requestLogger.ts (Optional - More detailed)

```typescript
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.info("Request received", {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? "warn" : "info";

    logger[logLevel]("Request completed", {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("content-length"),
    });
  });

  next();
}
```
