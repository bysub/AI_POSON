# POSON POS Self-Service Kiosk - 코드 리뷰 리포트

> **리뷰 일자**: 2026-03-03
> **프로젝트**: VB6 레거시 키오스크 시스템 → Electron + Vue 3 마이그레이션
> **리뷰어**: Claude Code (code-reviewer skill)

---

## 1. 개요

### 1.1 프로젝트 구조
```
backend/        # Express + TypeScript + Prisma + PostgreSQL
frontend/       # Electron + Vue 3 + Pinia + Tailwind CSS
```

### 1.2 분석 대상
- **Backend**: 38개 TypeScript 파일 (routes, services, middleware, utils)
- **Frontend**: 71개 TypeScript/Vue 파일 (main, preload, renderer)
- **Database**: Prisma 스키마 (20+ 모델)

### 1.3 전체 평가 요약

| 영역 | 점수 | 등급 |
|------|------|------|
| **아키텍처** | 85/100 | A |
| **보안** | 78/100 | B+ |
| **성능** | 82/100 | A- |
| **코드 품질** | 88/100 | A |
| **유지보수성** | 85/100 | A |
| **전체** | **83.6/100** | **A-** |

---

## 2. 아키텍처 평가

### 2.1 강점 (Strengths)

#### Backend 아키텍처
- **Strategy Pattern 결제 시스템**: VAN별 전략 패턴으로 NICE, KICC, KIS, SMARTRO 지원
  ```
  PaymentService → NicePaymentStrategy | KiccPaymentStrategy | ...
  ```
- **Circuit Breaker 패턴**: VAN 장애 시 자동 차단/복구
- **Idempotency Service**: 중복 결제 방지
- **2계층 설정 시스템**: SystemSetting (매장 공통) + DeviceSetting (기기별)

#### Frontend 아키텍처
- **Electron 보안 구조**: `contextIsolation: true`, `nodeIntegration: false`
- **오프라인 우선 아키텍처**: Dexie.js + IndexedDB + SyncManager
- **Pinia 상태 관리**: 역할별 스토어 분리 (auth, cart, products, network, locale)
- **커스텀 프로토콜**: `app://` 프로토콜로 file:// CORS 제한 우회

#### Database 설계
- **정규화된 스키마**: 3단계 분류 체계 (LBranch/MBranch/SBranch)
- **재고 이력 추적**: StockMovement 테이블로 완전한 감사 추적
- **다국어 지원**: name, nameEn, nameJa, nameZh 필드

### 2.2 개선 권장사항

#### [A-1] API 버전 관리 개선 (Medium)
**현재**: `/api/v1/...` 경로 하드코딩
**권장**: 환경 변수 기반 API 버전 관리
```typescript
// config/index.ts
export const API_VERSION = process.env.API_VERSION ?? 'v1';
```

#### [A-2] 서비스 레이어 분리 (Medium)
**현재**: 라우트 파일에 비즈니스 로직 혼재
**권장**: 서비스 레이어 분리로 테스트 용이성 향상
```
routes/products.ts → services/product.service.ts
```

---

## 3. 보안 평가

### 3.1 보안 강점

#### JWT 인증 구현
- bcrypt 해시 (salt rounds: 12) - `backend/src/services/auth.service.ts:164`
- 액세스/리프레시 토큰 분리
- 토큰 자동 갱신 메커니즘 - `frontend/src/renderer/src/services/api/client.ts:163-201`

#### Express 보안 미들웨어
```typescript
// backend/src/index.ts:18-51
app.use(helmet({...}));
app.use(cors({...}));
app.use(rateLimit({...}));
```

#### Electron 보안
- Path Traversal 방어 - `frontend/src/main/index.ts:113-118`
- Null Byte Injection 방어 - `frontend/src/main/index.ts:122-124`
- 환경변수 화이트리스트 - `frontend/src/main/index.ts:134-145`
- CSP 헤더 설정 - `frontend/src/main/index.ts:26-56`

### 3.2 보안 취약점 및 권장사항

#### [S-1] 개발용 하드코딩 자격 증명 제거 (Critical)
**위치**: `backend/src/services/auth.service.ts:258-265`
```typescript
// 개발용 폴백 - 프로덕션에서 반드시 제거
if (username === "admin" && process.env.NODE_ENV !== "production") {
  return {
    id: "dev-admin-001",
    username: "admin",
    passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V6Ay3QyZfvzBOO",
    role: "ADMIN",
  };
}
```
**위험도**: NODE_ENV 설정 실수 시 프로덕션 노출
**권장**: 환경 변수 `ALLOW_DEV_FALLBACK=true` 명시적 설정 필요

#### [S-2] CORS 설정 강화 (High)
**위치**: `backend/src/index.ts:25-41`
```typescript
origin: (origin, callback) => {
  // ...
  callback(null, true); // Allow all origins in development
}
```
**위험도**: 프로덕션에서 모든 origin 허용 가능
**권장**: 환경별 명시적 origin 목록 관리
```typescript
const ALLOWED_ORIGINS = {
  development: ['http://localhost:5173', ...],
  production: [process.env.FRONTEND_URL]
};
```

#### [S-3] Input Validation 강화 (Medium)
**위치**: `backend/src/routes/products.ts:183-192`
```typescript
// 수동 검증 - Zod 스키마로 대체 권장
if (!name || sellPrice === undefined || !categoryIds?.length) {
  return next(new AppError(400, "필수 필드가 누락되었습니다", "MISSING_FIELDS"));
}
```
**권장**: 모든 라우트에 Zod 스키마 적용 (auth 라우트처럼)

#### [S-4] 리프레시 토큰 인메모리 저장 (Medium)
**위치**: `backend/src/services/auth.service.ts:16`
```typescript
// 인메모리 리프레시 토큰 저장소 (프로덕션에서는 Redis 사용)
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>();
```
**위험도**: 서버 재시작 시 모든 세션 무효화
**권장**: Redis 저장소로 마이그레이션 (캐시 인프라 이미 존재)

#### [S-5] SQL Injection 방어 확인 (Low)
**상태**: Prisma ORM 사용으로 기본 방어됨
**검증**: Raw SQL 쿼리 미사용 확인 완료

### 3.3 OWASP Top 10 체크리스트

| 취약점 | 상태 | 비고 |
|--------|------|------|
| A01 Broken Access Control | ✅ 양호 | authorize 미들웨어 적용 |
| A02 Cryptographic Failures | ✅ 양호 | bcrypt, JWT 적절 사용 |
| A03 Injection | ✅ 양호 | Prisma ORM 사용 |
| A04 Insecure Design | ⚠️ 주의 | 개발용 폴백 제거 필요 |
| A05 Security Misconfiguration | ⚠️ 주의 | CORS 설정 강화 필요 |
| A06 Vulnerable Components | ✅ 양호 | 최신 패키지 사용 |
| A07 Auth Failures | ✅ 양호 | JWT + 역할 기반 접근 제어 |
| A08 Data Integrity Failures | ✅ 양호 | 트랜잭션 적절 사용 |
| A09 Logging Failures | ✅ 양호 | Pino 로거 사용 |
| A10 SSRF | ✅ 양호 | 외부 URL 호출 없음 |

---

## 4. 성능 평가

### 4.1 성능 강점

#### Redis 캐싱 전략
```typescript
// backend/src/utils/cache.ts
export const CACHE_KEYS = {
  CATEGORIES: "categories",
  PRODUCTS: "products",
  PRODUCTS_BY_CATEGORY: (categoryId: number) => `products:category:${categoryId}`,
  // ...
};
```
- TTL 5분 설정
- 조건부 캐싱 (검색어 없을 때만)
- Graceful fallback (Redis 미연결 시)

#### Rate Limiting
```typescript
// 15분당 IP당 1000 요청 제한
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
}));
```

#### 오프라인 동기화
- 30초 주기 자동 동기화
- 최대 5회 재시도 로직
- 점진적 백오프

### 4.2 성능 개선 권장사항

#### [P-1] N+1 쿼리 잠재적 문제 (Medium)
**위치**: `backend/src/routes/products.ts:587-594`
```typescript
async function invalidateProductCache(categoryIds?: number[] | null): Promise<void> {
  await cacheService.del(CACHE_KEYS.PRODUCTS);
  if (categoryIds) {
    for (const id of categoryIds) {
      await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(id));
    }
  }
}
```
**권장**: `Promise.all()` 또는 Redis `MDELETE` 사용

#### [P-2] 캐시 패턴 삭제 최적화 (Low)
**위치**: `backend/src/routes/products.ts:597-608`
```typescript
// 모든 카테고리 캐시 개별 삭제
for (const cat of categories) {
  await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(cat.id));
}
```
**권장**: `cacheService.deletePattern("products:category:*")` 활용

#### [P-3] 프론트엔드 번들 최적화 (Medium)
**권장**:
- Vue Router 코드 스플리팅
- 관리자 뷰 레이지 로딩
- Vite 청크 최적화

---

## 5. 코드 품질 평가

### 5.1 코드 품질 강점

#### 타입 안정성
- TypeScript 전면 적용
- Prisma 생성 타입 활용
- 프론트엔드 타입 미러링

#### 일관된 API 응답 포맷
```typescript
// 모든 API 응답
{ success: boolean, data?: T, error?: { code: string, message: string } }
```

#### 에러 처리 패턴
```typescript
// backend/src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(public statusCode: number, public message: string, public code?: string) { ... }
}
```

#### Pinia Composition API 패턴
```typescript
// 일관된 스토어 구조
export const useAuthStore = defineStore("auth", () => {
  // State
  const admin = ref<Admin | null>(null);
  // Getters
  const isAuthenticated = computed(() => ...);
  // Actions
  async function login(...) { ... }
  // Return
  return { admin, isAuthenticated, login, ... };
});
```

### 5.2 코드 품질 개선 권장사항

#### [Q-1] 매직 넘버 상수화 (Low)
**위치**: 여러 파일에 분산
```typescript
// 현재
const CACHE_TTL = 300;
rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

// 권장
// config/constants.ts
export const CACHE = { DEFAULT_TTL: 300 };
export const RATE_LIMIT = { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 1000 };
```

#### [Q-2] 에러 메시지 국제화 (Medium)
**현재**: 한글 메시지 하드코딩
```typescript
new AppError(400, "필수 필드가 누락되었습니다", "MISSING_FIELDS")
```
**권장**: 에러 코드 기반 메시지 조회

#### [Q-3] 테스트 커버리지 확대 (High)
**현재 상태**: 테스트 설정 존재, 커버리지 부족 추정
**권장**:
- 결제 서비스 단위 테스트
- API 통합 테스트
- E2E 테스트 (Playwright)

---

## 6. 유지보수성 평가

### 6.1 유지보수 강점

#### 문서화
- CLAUDE.md: 프로젝트 컨벤션 명시
- 주석: 한글 주석으로 명확한 의도 전달
- API 경로 표 문서화

#### 모듈화
- 라우트별 파일 분리 (14개 모듈)
- 결제 전략 패턴으로 VAN 확장 용이
- 하드웨어 추상화 계층

#### 설정 외부화
- 환경 변수 기반 설정
- 기기별 설정 분리 (Device/DeviceSetting)

### 6.2 유지보수 개선 권장사항

#### [M-1] 로깅 구조화 (Medium)
**권장**: 요청 ID 추적, 상관 ID 추가
```typescript
// 요청 시작 시 requestId 생성
req.requestId = crypto.randomUUID();
logger.info({ requestId: req.requestId, ... }, "Request started");
```

#### [M-2] API 문서화 자동화 (Medium)
**권장**: Swagger/OpenAPI 스펙 생성
- `swagger-jsdoc` + `swagger-ui-express` 도입
- 타입 기반 자동 문서 생성

---

## 7. 디자인 패턴 분석

### 7.1 적용된 패턴

| 패턴 | 적용 위치 | 평가 |
|------|-----------|------|
| **Strategy** | PaymentService | ✅ 우수 |
| **Circuit Breaker** | payment/circuit-breaker.ts | ✅ 우수 |
| **Repository** | Prisma Client | ✅ 적절 |
| **Singleton** | AuthService, CacheService | ✅ 적절 |
| **Factory** | createPaymentService() | ✅ 적절 |
| **Observer** | SyncManager (network events) | ✅ 적절 |
| **Composition API** | Pinia stores | ✅ 우수 |

### 7.2 패턴 개선 권장

#### [D-1] Repository 패턴 명시화 (Low)
**현재**: Prisma 직접 호출
**권장**: Repository 클래스로 추상화 (테스트 목킹 용이)

---

## 8. 결론 및 우선순위 권장사항

### 8.1 Critical (즉시 조치 필요)
1. **[S-1]** 개발용 하드코딩 자격 증명 제거

### 8.2 High (조기 조치 권장)
1. **[S-2]** CORS 설정 환경별 분리
2. **[Q-3]** 테스트 커버리지 확대

### 8.3 Medium (일반 개선)
1. **[S-3]** Input Validation Zod 스키마 전면 적용
2. **[S-4]** 리프레시 토큰 Redis 저장소 마이그레이션
3. **[P-1]** N+1 쿼리 패턴 개선
4. **[Q-2]** 에러 메시지 국제화
5. **[A-2]** 서비스 레이어 분리

### 8.4 Low (선택적 개선)
1. **[Q-1]** 매직 넘버 상수화
2. **[P-2]** 캐시 패턴 삭제 최적화
3. **[D-1]** Repository 패턴 명시화

---

## 9. 참고 자료

- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Context7 Documentation](https://context7.com)

---

**리뷰 완료**

이 리뷰는 code-reviewer 스킬과 Context7 MCP를 활용하여 수행되었습니다.
