# Server Setup Patterns

## server.js (Entry Point)

```javascript
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const helmet = require("helmet");
const session = require("express-session");

// Environment-based configuration
const config = require("./config");

// Middleware
const { correlationId } = require("./dist/middleware/correlationId");
const { errorHandler } = require("./dist/middleware/errorHandler");
const { isAuthenticated } = require("./dist/middleware/auth");
const { apiLimiter, authLimiter } = require("./dist/middleware/rateLimiter");

// Logger
const logger = require("./dist/utils/logger").default;

const app = express();
const PORT = config.server.port;

// ===========================================
// Middleware Stack (Order Matters!)
// ===========================================

// 1. HTTPS redirect in production
if (config.server.httpsRedirect) {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// 2. Security headers
app.use(
  helmet({
    contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
    crossOriginEmbedderPolicy: false,
  }),
);

// 3. Correlation ID for request tracking
app.use(correlationId);

// 4. Compression
app.use(compression());

// 5. Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// 6. Rate limiting
app.use("/api", apiLimiter);
app.use("/api/login", authLimiter);

// 7. CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-correlation-id"],
  }),
);

// 8. Body parsing
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 9. Session configuration
const sessionConfig = {
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.server.env === "production",
    httpOnly: true,
    maxAge: config.session.maxAge,
  },
};

// Redis or FileStore for session
if (config.redis.enabled) {
  const RedisStore = require("connect-redis").default;
  const { createClient } = require("redis");

  const redisClient = createClient({ url: config.redis.url });
  redisClient.connect().catch((err) => {
    logger.error("Redis connection failed, falling back to FileStore", err);
  });

  redisClient.on("error", (err) => {
    logger.error("Redis error:", err);
  });

  sessionConfig.store = new RedisStore({ client: redisClient });
  logger.info("Using Redis session store");
} else {
  const FileStore = require("session-file-store")(session);
  sessionConfig.store = new FileStore({
    path: "./sessions",
    ttl: config.session.maxAge / 1000,
    retries: 0,
  });
  logger.info("Using FileStore session store");
}

app.use(session(sessionConfig));

// ===========================================
// Routes
// ===========================================

// Health check (no auth required)
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: require("./package.json").version,
  });
});

// Auth routes (no auth required)
const loginRoutes = require("./dist/routes/common/loginRoutes").default;
app.use("/api/v1", loginRoutes);

// Apply authentication middleware to all other /api routes
app.use("/api", isAuthenticated);

// Protected routes
const routes = require("./dist/routes").default;
app.use("/api/v1", routes);

// Legacy API redirect (deprecated)
app.use("/api", (req, res, next) => {
  if (!req.path.startsWith("/v1")) {
    req.url = `/v1${req.path}`;
  }
  next();
});

// ===========================================
// Swagger Documentation
// ===========================================
if (config.swagger.enabled) {
  const swaggerJsdoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "{{project-name}} API",
        version: "1.0.0",
        description: "API Documentation",
      },
      servers: [{ url: `http://localhost:${PORT}/api/v1` }],
    },
    apis: ["./dist/routes/**/*.js"],
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
}

// ===========================================
// Error Handling
// ===========================================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId,
  });
});

// ===========================================
// Server Start
// ===========================================
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
});

module.exports = app;
```

## db.ts (Database Connection)

```typescript
import sql from "mssql";
import config from "./config";
import logger from "./utils/logger";

const dbConfig: sql.config = {
  user: config.database.user,
  password: config.database.password,
  server: config.database.server,
  port: config.database.port,
  database: config.database.name,
  pool: {
    max: config.database.pool.max,
    min: config.database.pool.min,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    logger.info("Database connection pool created");
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info("Database connection pool closed");
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (transaction: sql.Transaction) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error("Transaction rolled back:", error);
    throw error;
  }
}

export { sql };
export default { getPool, closePool, withTransaction, sql };
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## ecosystem.config.js (PM2)

```javascript
module.exports = {
  apps: [
    {
      name: "{{project-name}}",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
    },
  ],
};
```

## .env.example

```env
# Server
PORT=3000
NODE_ENV=development

# Database (MSSQL)
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=your_database
DB_POOL_MAX=10
DB_POOL_MIN=2

# Session
SESSION_SECRET=your_session_secret_key_here

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Security
BCRYPT_ROUNDS=12
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
FILE_UPLOAD_PATH=./uploads
FILE_UPLOAD_MAX_SIZE=209715200

# CORS
ORIGIN_URL=http://localhost:5173

# Swagger
SWAGGER_ENABLED=true

# HTTPS (production only)
ENABLE_HTTPS_REDIRECT=false
TLS_KEY_PATH=/path/to/key.pem
TLS_CERT_PATH=/path/to/cert.pem
```

## .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Sessions
sessions/

# Uploads
uploads/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/

# PM2
.pm2/
```
