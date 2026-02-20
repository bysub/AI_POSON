---
name: nodejs-init-creator
description: |
  This skill creates Node.js + Express + TypeScript backend projects through interactive conversation.
  It should be used when users say "새 백엔드 프로젝트 만들어줘", "Node.js 서버 초기 세팅해줘",
  "Express 프로젝트 생성", "API 서버 설정", or want to create a new Node.js backend application.
  The skill guides users through project configuration options including database, authentication,
  file upload, system management screens, and middleware choices.
---

# Node.js + Express + TypeScript Project Initializer

This skill creates production-ready Node.js + Express + TypeScript backend projects through interactive conversation.

## Purpose

To scaffold a complete Node.js + Express + TypeScript project with:

- TypeScript configuration with strict mode
- Express server with middleware stack
- MSSQL database connection with connection pooling
- Repository pattern with BaseRepository class
- Service layer for business logic
- Session-based authentication with Redis/FileStore fallback
- Winston logging with daily rotation
- Swagger API documentation
- File upload/download with Multer
- Rate limiting and security headers (Helmet)
- Environment-based configuration
- System management APIs (User, Code, Menu, Auth)

## When to Use

This skill should be triggered when users:

- Request a new Node.js/Express backend project creation
- Ask for backend/API server initial setup
- Want to clone the current backend structure for a new project
- Need a Node.js + Express + TypeScript boilerplate with enterprise patterns

## Interactive Setup Flow

### Phase 1: Basic Information

Ask the user for basic project information:

```
프로젝트 기본 정보를 입력해주세요:

1. 프로젝트명 (예: my-api-server)
2. 프로젝트 경로 (기본값: 현재 디렉토리)
3. 서버 포트 (기본값: 3000)
4. Node.js 버전 (기본값: 20.x)
```

### Phase 2: Database Selection

Present database options:

| Option              | Description                             |
| ------------------- | --------------------------------------- |
| MSSQL (Recommended) | Microsoft SQL Server with mssql package |
| PostgreSQL          | PostgreSQL with pg package              |
| MySQL               | MySQL with mysql2 package               |
| MongoDB             | MongoDB with mongoose package           |
| None                | No database, mock data only             |

### Phase 3: Authentication Selection

Present authentication options:

| Option                        | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| Session + Redis (Recommended) | express-session with Redis store, FileStore fallback |
| JWT                           | JSON Web Token authentication                        |
| Session + File                | express-session with FileStore only                  |
| None                          | No authentication                                    |

### Phase 4: File Upload Selection

Ask about file upload feature:

| Option                          | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| Full File Service (Recommended) | Multer upload, archiver zip download, CRUD operations |
| Basic Upload Only               | Multer upload without download/management             |
| None                            | No file upload feature                                |

### Phase 5: Common Features Selection

Ask about common features to include (multi-select):

| Feature               | Description                                            |
| --------------------- | ------------------------------------------------------ |
| Tree Data Structure   | Hierarchical data APIs with parent-child relationships |
| Pagination Utilities  | OFFSET/FETCH pagination helpers                        |
| Winston Logger        | Daily rotating log files                               |
| Swagger Documentation | Auto-generated API docs                                |
| Rate Limiting         | Express rate limit middleware                          |
| CORS Configuration    | Cross-origin resource sharing                          |
| Helmet Security       | Security headers middleware                            |
| Compression           | Response compression                                   |

### Phase 6: System Management APIs

Ask whether to generate system management APIs:

| API             | Description                                     |
| --------------- | ----------------------------------------------- |
| User Management | User CRUD, search, password hashing with bcrypt |
| Code Management | Master-detail code management APIs              |
| Menu Management | Menu tree APIs with ordering                    |
| Auth Management | Role-based permission management APIs           |
| All             | Generate all system management APIs             |
| None            | No system management APIs                       |

### Phase 7: Additional Options

Ask about additional options:

| Option            | Description                                   |
| ----------------- | --------------------------------------------- |
| PM2 Configuration | ecosystem.config.js for production clustering |
| Jest Testing      | Test setup with unit/integration tests        |
| Docker Support    | Dockerfile and docker-compose.yml             |
| Environment Files | .env.example with all variables               |

## Project Generation

After collecting all options, generate the project structure:

```
{project-name}/
├── package.json
├── tsconfig.json
├── ecosystem.config.js (if PM2 enabled)
├── jest.config.js (if Jest enabled)
├── Dockerfile (if Docker enabled)
├── docker-compose.yml (if Docker enabled)
├── .env.example
├── .gitignore
├── server.js
├── db.ts
├── config/
│   ├── index.js
│   ├── default.js
│   ├── development.js
│   ├── production.js
│   └── test.js
├── middleware/
│   ├── auth.ts
│   ├── correlationId.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── validators/
│       └── dtoValidator.ts
├── repository/
│   ├── base/
│   │   └── baseRepository.ts
│   ├── common/
│   │   ├── codeRepository.ts
│   │   └── menuRepository.ts
│   └── sys/
│       ├── userRepository.ts (if sys APIs enabled)
│       ├── codeRepository.ts
│       ├── menuRepository.ts
│       └── authRepository.ts
├── service/
│   ├── common/
│   │   ├── loginService.ts (if auth enabled)
│   │   ├── codeService.ts
│   │   ├── menuService.ts
│   │   └── fileService.ts (if file upload enabled)
│   └── sys/
│       ├── userService.ts (if sys APIs enabled)
│       ├── codeService.ts
│       ├── menuService.ts
│       └── authService.ts
├── routes/
│   ├── index.js
│   ├── common/
│   │   ├── loginRoutes.ts (if auth enabled)
│   │   ├── codeRoutes.ts
│   │   ├── menuRoutes.ts
│   │   └── fileRoutes.ts (if file upload enabled)
│   └── sys/
│       ├── userRoutes.ts (if sys APIs enabled)
│       ├── codeRoutes.ts
│       ├── menuRoutes.ts
│       └── authRoutes.ts
├── dto/
│   ├── common/
│   │   └── loginDto.ts
│   └── sys/
│       ├── userDto.ts
│       ├── codeDto.ts
│       ├── menuDto.ts
│       └── authDto.ts
├── utils/
│   ├── logger.ts
│   ├── paginationUtils.ts (if pagination enabled)
│   └── responseUtils.ts
├── types/
│   └── index.ts
├── logs/
│   └── .gitkeep
├── sessions/
│   └── .gitkeep
└── tests/ (if Jest enabled)
    ├── unit/
    │   ├── utils/
    │   └── service/
    └── integration/
```

## Template Files

Reference the template files in `references/` directory for:

- `references/package-json-template.md` - package.json configuration options
- `references/server-setup.md` - Express server setup patterns
- `references/middleware-patterns.md` - Middleware templates
- `references/repository-patterns.md` - Repository layer patterns
- `references/service-patterns.md` - Service layer patterns
- `references/routes-patterns.md` - Route definitions
- `references/config-patterns.md` - Configuration management
- `references/system-apis.md` - System management API templates

## Implementation Steps

1. **Collect Configuration**
   - Use AskUserQuestion tool for each phase
   - Store selections in memory for generation

2. **Generate Base Files**
   - Create package.json with selected dependencies
   - Create tsconfig.json with strict TypeScript settings
   - Create .env.example with required variables

3. **Generate Server Setup**
   - Create server.js with middleware stack
   - Create db.ts with database connection
   - Create config/ with environment files

4. **Generate Middleware**
   - Create auth middleware if authentication selected
   - Create correlationId, errorHandler, rateLimiter
   - Create DTO validator middleware

5. **Generate Repository Layer**
   - Create BaseRepository abstract class
   - Create domain repositories extending BaseRepository

6. **Generate Service Layer**
   - Create service classes with business logic
   - Include transaction support

7. **Generate Routes**
   - Create route files for each domain
   - Register routes in index.js

8. **Generate System Management APIs** (if selected)
   - User Management APIs
   - Code Management APIs
   - Menu Management APIs
   - Auth Management APIs

9. **Post-Generation**
   - Display npm install command
   - Show development server command
   - Provide quick start guide

## Configuration Templates

### Minimal package.json Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.2"
  }
}
```

### With MSSQL Database

Add to dependencies:

```json
{
  "mssql": "^12.2.0"
}
```

### With Session Authentication

Add to dependencies:

```json
{
  "express-session": "^1.17.3",
  "connect-redis": "^7.1.0",
  "redis": "^4.6.10",
  "session-file-store": "^1.5.0",
  "bcrypt": "^6.0.0"
}
```

### With JWT Authentication

Add to dependencies:

```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^6.0.0"
}
```

### With File Upload

Add to dependencies:

```json
{
  "multer": "^2.0.2",
  "archiver": "^7.0.1",
  "uuid": "^11.1.0"
}
```

### With Full Security Stack

Add to dependencies:

```json
{
  "helmet": "^8.1.0",
  "express-rate-limit": "^7.1.5"
}
```

### With Logging

Add to dependencies:

```json
{
  "winston": "^3.19.0",
  "winston-daily-rotate-file": "^5.0.0"
}
```

### With Swagger Documentation

Add to dependencies:

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0"
}
```

### With Testing

Add to devDependencies:

```json
{
  "jest": "^29.7.0",
  "@types/jest": "^29.5.11",
  "supertest": "^6.3.3",
  "@types/supertest": "^6.0.2"
}
```

### With PM2

Add to devDependencies:

```json
{
  "pm2": "^5.3.0"
}
```

## Important Notes

- Always use TypeScript for business logic (service, repository, dto, middleware)
- JavaScript for configuration files (config/, ecosystem.config.js, jest.config.js)
- Entry point (server.js) requires compiled modules from dist/
- Build TypeScript with `npm run build` before running
- Use parameterized queries to prevent SQL injection
- Passwords hashed with bcrypt (configurable rounds)
- Correlation ID for request tracking
- Environment-based configuration with validation
- Session storage falls back to FileStore if Redis unavailable

## Example Conversation

**User**: "새 백엔드 프로젝트 만들어줘"

**Claude**:
"Node.js + Express + TypeScript 프로젝트를 생성해드리겠습니다.

먼저 기본 정보를 알려주세요:

1. 프로젝트명을 입력해주세요 (예: my-api-server)
2. 프로젝트를 생성할 경로를 입력해주세요 (기본: 현재 디렉토리)"

[Continue with interactive questions for each phase...]

**User**: "시스템 관리 API도 다 포함해줘"

**Claude**:
"시스템 관리 API를 모두 포함하겠습니다:

- 사용자 관리 (User Management)
- 코드 관리 (Code Management)
- 메뉴 관리 (Menu Management)
- 권한 관리 (Auth Management)

각 API는 Repository 패턴을 따르며, 페이징/검색 기능을 포함합니다."
