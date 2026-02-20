# Package.json Templates

## Base Configuration

```json
{
  "name": "{{project-name}}",
  "version": "1.0.0",
  "description": "Node.js Express TypeScript API Server",
  "main": "server.js",
  "scripts": {
    "start": "pm2 start ecosystem.config.js",
    "dev": "npm run build:watch & nodemon --watch dist dist/server.js",
    "build": "tsc",
    "build:watch": "tsc -w",
    "build:clean": "rm -rf dist && npm run build",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage",
    "monit": "pm2 monit",
    "restart": "pm2 restart all",
    "stop": "pm2 stop all"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## Dependencies by Feature

### Core Dependencies (Always Required)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6",
    "compression": "^1.7.4",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "@types/cors": "^2.8.17",
    "@types/cookie-parser": "^1.4.6",
    "@types/compression": "^1.7.5",
    "nodemon": "^3.0.2"
  }
}
```

### Database: MSSQL

```json
{
  "dependencies": {
    "mssql": "^12.2.0"
  }
}
```

### Database: PostgreSQL

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

### Database: MySQL

```json
{
  "dependencies": {
    "mysql2": "^3.6.5"
  }
}
```

### Database: MongoDB

```json
{
  "dependencies": {
    "mongoose": "^8.0.3"
  }
}
```

### Authentication: Session + Redis

```json
{
  "dependencies": {
    "express-session": "^1.17.3",
    "connect-redis": "^7.1.0",
    "redis": "^4.6.10",
    "session-file-store": "^1.5.0",
    "bcrypt": "^6.0.0"
  },
  "devDependencies": {
    "@types/express-session": "^1.17.10",
    "@types/bcrypt": "^5.0.2"
  }
}
```

### Authentication: JWT

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^6.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcrypt": "^5.0.2"
  }
}
```

### File Upload

```json
{
  "dependencies": {
    "multer": "^2.0.2",
    "archiver": "^7.0.1",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "@types/archiver": "^6.0.2",
    "@types/uuid": "^9.0.7"
  }
}
```

### Security

```json
{
  "dependencies": {
    "helmet": "^8.1.0",
    "express-rate-limit": "^7.1.5"
  }
}
```

### Logging

```json
{
  "dependencies": {
    "winston": "^3.19.0",
    "winston-daily-rotate-file": "^5.0.0"
  }
}
```

### API Documentation

```json
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

### DTO Validation

```json
{
  "dependencies": {
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

### Testing

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

### PM2 Production

```json
{
  "devDependencies": {
    "pm2": "^5.3.0"
  }
}
```

## Full Enterprise Configuration

```json
{
  "name": "{{project-name}}",
  "version": "1.0.0",
  "description": "Enterprise Node.js Express TypeScript API Server",
  "main": "server.js",
  "scripts": {
    "start": "pm2 start ecosystem.config.js",
    "dev": "npm run build:watch & nodemon --watch dist dist/server.js",
    "build": "tsc",
    "build:watch": "tsc -w",
    "build:clean": "rm -rf dist && npm run build",
    "test": "npm run build && jest",
    "test:unit": "npm run build && jest --testPathPattern=unit",
    "test:integration": "npm run build && jest --testPathPattern=integration",
    "test:coverage": "npm run build && jest --coverage",
    "test:load": "artillery run tests/load/api.yml",
    "monit": "pm2 monit",
    "restart": "pm2 restart all",
    "stop": "pm2 stop all"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6",
    "compression": "^1.7.4",
    "body-parser": "^1.20.2",
    "mssql": "^12.2.0",
    "express-session": "^1.17.3",
    "connect-redis": "^7.1.0",
    "redis": "^4.6.10",
    "session-file-store": "^1.5.0",
    "bcrypt": "^6.0.0",
    "multer": "^2.0.2",
    "archiver": "^7.0.1",
    "uuid": "^11.1.0",
    "helmet": "^8.1.0",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.19.0",
    "winston-daily-rotate-file": "^5.0.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "@types/cors": "^2.8.17",
    "@types/cookie-parser": "^1.4.6",
    "@types/compression": "^1.7.5",
    "@types/express-session": "^1.17.10",
    "@types/bcrypt": "^5.0.2",
    "@types/multer": "^1.4.11",
    "@types/archiver": "^6.0.2",
    "@types/uuid": "^9.0.7",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6",
    "nodemon": "^3.0.2",
    "pm2": "^5.3.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    "artillery": "^2.0.3"
  }
}
```
