# Rate Limit 심층 분석 보고서

> 분석일: 2026-03-11
> 최종 수정: 2026-03-11
> 상태: **수정 완료** — 백엔드/프론트엔드 전체 적용, 빌드 검증 통과

---

## 1. 발생 현상

- 관리자 로그인 시 **"로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요."** 메시지 출력
- 실제 원인은 `express-rate-limit`의 **429 Too Many Requests** 응답
- 프론트엔드가 429를 인식하지 못하고 **잘못된 에러 메시지**를 표시

### 근본 원인 요약

| 원인 | 영향 | 심각도 |
|------|------|--------|
| Auth 엔드포인트 일괄 rate limit (login+refresh+logout+me 공유) | refresh가 login 한도 소진 | Critical |
| IP 기반 키 + NAT 환경 | 매장 내 전 기기가 1개 카운터 공유 | Critical |
| 429 응답이 plain text | 프론트엔드 JSON 파싱 실패 → 잘못된 에러 메시지 | High |
| 프론트엔드 429 미분류 | 모든 에러를 "비밀번호 확인" 메시지로 통합 | High |
| express-rate-limit v7에서 `max: 0` = 전부 차단 | 개발 환경에서 모든 요청 즉시 429 | **Critical** |

---

## 2. Rate Limit 구성 (수정 전 → 수정 후)

### 수정 전 (AS-IS)

| 대상 | 경로 | windowMs | max | 비고 |
|------|------|----------|-----|------|
| Global | 전체 | 15분 | 1000 | 모든 요청에 적용 (1차 필터) |
| Auth | `/api/v1/auth/*` | 15분 | 30 | login, refresh, logout, me **모두 포함** |
| Payment | `/api/v1/payments/*` | 15분 | 100 | 결제 관련 전체 |

```
요청 → Global(1000) → Auth(30) → 실제 핸들러
```

- Global이 먼저 소진되면 Auth 커스텀 메시지가 아닌 **영문 plain text** 반환
- Auth 30회에 `/refresh`, `/logout`, `/me` 요청도 카운트됨
- `keyGenerator` 미설정 → 기본 `req.ip` → NAT 환경에서 전 기기 공유

### 수정 후 (TO-BE) — 현재 적용됨

| 대상 | 경로 | windowMs | max | dev 동작 | keyGenerator | skip | 비고 |
|------|------|----------|-----|----------|-------------|------|------|
| Global | 전체 | 15분 | 3000 | `skip: () => true` | deviceKeyGenerator | — | 기기 10대 × 300회 |
| Auth Login | `/api/v1/auth/login` | 15분 | 50 | `skip: () => true` | deviceKeyGenerator | — | brute-force 방지 (login만) |
| Auth Refresh | `/api/v1/auth/refresh` | 15분 | 200 | `skip: () => true` | deviceKeyGenerator | — | 자동 갱신 (별도 분리) |
| Payment | `/api/v1/payments` | 15분 | 300 | `skip: () => true` | deviceKeyGenerator | skipAuthenticated | 인증된 요청 면제 |

> **⚠️ express-rate-limit v7 주의**: `max: 0`은 v6까지 "무제한"이었으나, **v7부터 "모든 요청 차단"**으로 변경됨. 개발 환경 비활성화는 반드시 `skip: () => true`를 사용해야 함.

```
요청 → Global(3000/device) → Login(50/device) or Refresh(200/device) → 실제 핸들러
        ↓                                                                  ↓
    JSON 429 응답 + logger.warn                                    JSON 429 응답 + logger.warn
    (dev: skip으로 비활성화)                                       (dev: skip으로 비활성화)
```

---

## 3. 결함 분석 및 수정 상태

### 결함 1: 프론트엔드 429 미처리 — ✅ 수정 완료

**파일**: `frontend/src/renderer/src/services/api/client.ts`

**수정 전**: 모든 HTTP 에러를 `Error`로 통합 처리
```typescript
if (!response.ok) {
  const msg = data?.error?.message ?? `요청 실패 (${response.status})`;
  throw new Error(msg);
}
```

**수정 후**: `RateLimitError` 클래스 도입, 429 별도 분기
```typescript
// client.ts:21-28 — RateLimitError 클래스
export class RateLimitError extends Error {
  readonly retryAfter: number | null;
  constructor(message: string, retryAfter?: string | number | null) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter ? Number(retryAfter) : null;
  }
}

// client.ts:288-296 — 429 상태 코드 별도 처리 (401 체크보다 먼저 실행)
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  let message = "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
  } catch { /* JSON 파싱 실패 시 기본 메시지 사용 */ }
  throw new RateLimitError(message, retryAfter);
}
```

**파일**: `frontend/src/renderer/src/stores/auth.ts:75-82`

**수정 후**: RateLimitError 감지 → 서버 메시지 그대로 표시
```typescript
catch (err) {
  if (err instanceof RateLimitError) {
    error.value = err.message;  // "로그인 요청이 너무 많습니다. 잠시 후 다시 시도하세요."
  } else {
    error.value = "로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.";
  }
}
```

### 결함 2: Auth rate limit 범위 과다 — ✅ 수정 완료

**파일**: `backend/src/index.ts:102-126`

**수정 전**: `/api/v1/auth` 전체에 30회 일괄 적용
**수정 후**: 엔드포인트별 분리
- `/api/v1/auth/login` → 50회 (brute-force 방지)
- `/api/v1/auth/refresh` → 200회 (자동 갱신이므로 넉넉하게)
- `/auth/logout`, `/auth/me` → global rate limit만 적용 (별도 제한 없음)

### 결함 3: Rate Limit 응답이 JSON이 아님 — ✅ 수정 완료

**파일**: `backend/src/index.ts:74-88`

**수정 전**: `express-rate-limit` 기본 plain text (`"Too many requests..."`)
**수정 후**: 공통 `rateLimitHandler` 함수로 JSON 응답 통일 + 로깅 포함
```typescript
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
```

### 결함 4: express-rate-limit v7에서 `max: 0` = 전부 차단 — ✅ 수정 완료

**파일**: `backend/src/index.ts:90-140`

**수정 전**: `max: isDev ? 0 : N` — v7에서 `max: 0`은 **모든 요청 즉시 차단**
```typescript
max: isDev ? 0 : 3000, // ❌ v7: 0 = 전부 차단 (무제한이 아님!)
```

**수정 후**: `skip` 함수로 개발 환경 비활성화
```typescript
max: 3000,
skip: isDev ? () => true : undefined, // ✅ dev: 전체 skip
```

### 결함 5: IP 기반 rate limit + NAT 환경 충돌 — ✅ 수정 완료

**문제**:
```
[키오스크 1] ─┐
[키오스크 2] ─┤
[키오스크 3] ─┼── NAT ── [공인 IP: 1.2.3.4] ── [서버]
[POS 1]      ─┤
[POS 2]      ─┘
```

**백엔드 (✅ 완료)**: Device ID 기반 `keyGenerator` 적용
```typescript
// backend/src/index.ts:58-62
const deviceKeyGenerator = (req: express.Request): string => {
  const deviceId = req.headers["x-device-id"] as string | undefined;
  return deviceId || req.ip || "unknown";
};
```
- 모든 rate limit 미들웨어에 `keyGenerator: deviceKeyGenerator` 적용됨
- `X-Device-Id` 헤더가 있으면 기기별 독립 카운터, 없으면 IP fallback

**프론트엔드 (✅ 완료)**: `X-Device-Id` 헤더 전송 구현
- `getDeviceId()` / `setDeviceId()` 헬퍼 함수 추가 (`client.ts:168-183`)
- `request()` 함수 headers에 `X-Device-Id` 헤더 추가 (`client.ts:277-280`)
- settingsStore `initialize()` 시 `setDeviceId()` 호출 (`stores/settings.ts:35`)
- CORS `allowedHeaders`에 `"X-Device-Id"` 추가 (`backend/src/index.ts:50`)

### 결함 6: 인증된 요청의 rate limit 면제 — ✅ 수정 완료 (결제만)

**파일**: `backend/src/index.ts:64-72`

**수정 후**: 유효한 JWT 토큰 보유 시 payment rate limit skip
```typescript
const skipAuthenticated = (req: express.Request): boolean => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const { authService } = require("./services/auth.service.js");
    return !!authService.verifyAccessToken(authHeader.substring(7));
  } catch { return false; }
};
```
- 현재 `/api/v1/payments`에만 `skip: skipAuthenticated` 적용
- login 엔드포인트에는 의도적으로 미적용 (brute-force 방지 목적)

---

## 4. 운영 환경 위험 시나리오

### 시나리오 A: 서버 재시작 후 로그인 폭풍

```
1. 서버 재시작 → in-memory rate limit 카운터 초기화 (이건 OK)
2. 하지만 JWT 리프레시 토큰도 메모리에 저장 (Redis 미연결 시)
3. 모든 기기의 refresh 실패 → 모든 기기가 동시에 /auth/login 호출
4. 매장 내 8대 × 재시도 3~5회 = 24~40회
```

| 구분 | 수정 전 | 수정 후 |
|------|---------|---------|
| Auth 한도 | 30회 (login+refresh 공유) | login 50회 / refresh 200회 (분리) |
| 결과 | **즉시 소진 → 관리자 접근 불가** | 여유 확보 (50회 login 전용) |
| 잔존 위험 | — | Device ID 미설정 기기는 IP fallback (POSON_DEVICE_ID 환경변수 필수) |

### 시나리오 B: 일반 운영 중 점진적 소진

```
수정 전:
  1. refresh 8회 + me 20회 = 28회 소비 → 로그인 2회만 가능

수정 후:
  1. refresh → 별도 200회 한도 (login에 영향 없음)
  2. me → global 3000회만 적용 (별도 제한 없음)
  3. login 50회 전용 → 충분한 여유
```

### 시나리오 C: 사용자 혼란에 의한 악순환

```
수정 전:
  1. 429 → "아이디와 비밀번호를 확인해주세요" → 재시도 악순환

수정 후:
  1. 429 → "로그인 요청이 너무 많습니다. 잠시 후 다시 시도하세요." → 대기
  2. RateLimitError에 retryAfter 포함 → 향후 자동 재시도 타이머 구현 가능
```

### 시나리오 D: NAT 환경 + X-Device-Id (✅ 해결됨)

```
현재 상황 (수정 후):
  1. settingsStore 초기화 시 POSON_DEVICE_ID → setDeviceId() 호출
  2. 모든 API 요청에 X-Device-Id 헤더 자동 포함
  3. 백엔드 deviceKeyGenerator가 기기별 독립 카운터 할당
  4. → 매장 10대 기기 각각 login 50회 보유 (총 500회)

전제 조건:
  - 각 기기에 POSON_DEVICE_ID 환경변수가 고유하게 설정되어야 함
  - 미설정 기기는 req.ip fallback (NAT 환경에서 공유 가능)
```

---

## 5. 영향 범위

| 영역 | 수정 전 | 수정 후 | 잔존 위험 |
|------|---------|---------|-----------|
| 관리자 로그인 | **Critical** — 차단됨 | **Resolved** | Device ID 기반 기기별 독립 카운터 |
| 키오스크 운영 | **High** — 토큰 갱신 실패 | **Resolved** | refresh 200회 분리로 안전 |
| 결제 처리 | **Medium** | **Resolved** | 인증 요청 skip + 300회 |
| 장애 대응 | **Critical** — 접근 불가 | **Mitigated** | logger.warn으로 모니터링 가능 |
| 에러 진단 | **High** — 잘못된 메시지 | **Resolved** | RateLimitError + JSON 응답 |

---

## 6. 수정 이력

### 6.1 백엔드 변경 (`backend/src/index.ts:55-140`)

| 항목 | 변경 내용 | 상태 |
|------|-----------|------|
| `deviceKeyGenerator` | Device ID 기반 rate limit 키 함수 (L58-62) | ✅ |
| `skipAuthenticated` | JWT 인증된 요청 rate limit 면제 (L64-72) | ✅ |
| `rateLimitHandler` | 공통 JSON 429 핸들러 + logger.warn (L74-88) | ✅ |
| Global rate limit | max: 1000 → `isDev ? 0 : 3000`, deviceKeyGenerator 적용 (L91-100) | ✅ |
| Auth Login 분리 | `/api/v1/auth/login`, max: 50, deviceKeyGenerator (L102-113) | ✅ |
| Auth Refresh 분리 | `/api/v1/auth/refresh`, max: 200, deviceKeyGenerator (L115-126) | ✅ |
| Payment 상향 | max: 300, deviceKeyGenerator, skipAuthenticated (L128-140) | ✅ |
| Dev 환경 | ~~`max: 0`~~ → `skip: () => true` (v7 호환 비활성화) | ✅ |

### 6.2 프론트엔드 변경

| 파일 | 변경 내용 | 상태 |
|------|-----------|------|
| `client.ts:21-28` | `RateLimitError` 클래스 추가 (export) | ✅ |
| `client.ts:14` | `ApiResponse.error`에 `retryAfter` 필드 추가 | ✅ |
| `client.ts:168-183` | `getDeviceId()` / `setDeviceId()` 헬퍼 함수 추가 | ✅ |
| `client.ts:288-296` | `response.status === 429` 분기 → `RateLimitError` throw | ✅ |
| `auth.ts:3` | `RateLimitError` import 추가 | ✅ |
| `auth.ts:77-81` | `instanceof RateLimitError` 분기 — 서버 메시지 표시 | ✅ |
| `client.ts:277-280` | `request()` headers에 `X-Device-Id` 헤더 추가 | ✅ |
| `stores/settings.ts:3,35` | `setDeviceId` import + `initialize()` 시 호출 | ✅ |

### 6.3 CORS 설정 변경

| 파일 | 변경 내용 | 상태 |
|------|-----------|------|
| `backend/src/index.ts:50` | `allowedHeaders`에 `"X-Device-Id"` 추가 | ✅ |

---

## 7. 미적용 개선사항 (Backlog)

### ~~7.1 프론트엔드 X-Device-Id 헤더 전송~~ — ✅ 구현 완료

- `client.ts:277-280` — request() headers에 `X-Device-Id` 추가
- `stores/settings.ts:3,35` — `setDeviceId` import + initialize() 시 호출
- `backend/src/index.ts:50` — CORS allowedHeaders에 추가
- TypeScript 빌드 검증 통과 (백엔드 + 프론트엔드)

### 7.2 Retry-After 기반 UI 카운트다운 — 우선순위: 낮음

**현재 상태**: `RateLimitError.retryAfter`에 값은 저장되지만 UI에서 활용하지 않음

**해결 방안**:
```typescript
// auth.ts — 카운트다운 타이머
if (err instanceof RateLimitError) {
  const seconds = err.retryAfter ?? 60;
  error.value = `요청이 너무 많습니다. ${seconds}초 후 다시 시도하세요.`;
  // 로그인 버튼 비활성화 + 카운트다운 표시
}
```

### 7.3 Redis 기반 분산 rate limit — 우선순위: 낮음 (다중 서버 시)

**현재 상태**: `express-rate-limit` 기본 메모리 저장소 → 서버 재시작 시 초기화

**해결 방안**: `rate-limit-redis` 패키지로 Redis 저장소 사용
```typescript
import RedisStore from "rate-limit-redis";
import { getRedis } from "./utils/cache.js";

const store = getRedis()
  ? new RedisStore({ sendCommand: (...args) => getRedis()!.call(...args) })
  : undefined;
rateLimit({ store, ... });
```

**적용 시점**: 서버 다중화 (로드밸런서 + 서버 2대 이상) 시 필수

### 7.4 Global rate limit에 skipAuthenticated 적용 — 우선순위: 중간

**현재 상태**: `skipAuthenticated`가 payment 엔드포인트에만 적용됨

**개선 방안**: global rate limit에도 적용하여 인증된 요청은 global 카운터 소비하지 않도록
```typescript
// backend/src/index.ts — global rate limit에 skip 추가
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 0 : 3000,
    keyGenerator: deviceKeyGenerator,
    skip: skipAuthenticated,  // ← 추가
    handler: rateLimitHandler("요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
  }),
);
```

**주의**: login 엔드포인트의 별도 rate limit은 유지 (brute-force 방지)

### 7.5 Rate Limit 모니터링 대시보드 — 우선순위: 낮음

**현재 상태**: `logger.warn`으로 rate limit 초과 로깅은 되지만 시각적 모니터링 없음

**개선 방안**:
- 관리자 대시보드에 rate limit 초과 이벤트 표시
- 기기별 요청 횟수 모니터링
- 임계값 도달 시 사전 경고 (예: 80% 도달 시 알림)

---

## 8. 관련 파일

| 파일 | 역할 | 수정 여부 |
|------|------|-----------|
| `backend/src/index.ts:55-140` | Rate limit 설정 (deviceKeyGenerator, skipAuthenticated, 핸들러, global, login, refresh, payment) | ✅ 수정됨 |
| `backend/src/middleware/auth.middleware.ts` | JWT 인증 미들웨어 | 변경 없음 |
| `backend/src/routes/auth.ts` | 로그인/갱신/로그아웃 라우트 | 변경 없음 |
| `backend/src/services/auth.service.ts` | 인증 서비스 (토큰 발급/검증) | 변경 없음 |
| `frontend/src/renderer/src/services/api/client.ts` | API 클라이언트 (RateLimitError + 429 처리 + Device ID 헤더) | ✅ 수정됨 |
| `frontend/src/renderer/src/stores/auth.ts` | 로그인 상태 관리 (에러 메시지 구분) | ✅ 수정됨 |
| `frontend/src/renderer/src/stores/settings.ts` | 매장 설정 (setDeviceId 호출) | ✅ 수정됨 |

---

## 9. 검증 체크리스트

### 완료

- [x] TypeScript 빌드 통과 (백엔드 `tsc --noEmit`)
- [x] TypeScript 빌드 통과 (프론트엔드 `vue-tsc --noEmit`)
- [x] 백엔드 deviceKeyGenerator 구현
- [x] 백엔드 skipAuthenticated 구현 (payment)
- [x] 백엔드 rateLimitHandler 로깅 구현
- [x] 프론트엔드 RateLimitError 클래스 구현
- [x] 프론트엔드 429 상태 코드 별도 처리
- [x] auth.ts에서 RateLimitError 메시지 구분 표시

- [x] 프론트엔드 request() 함수에 `X-Device-Id` 헤더 추가
- [x] settingsStore 초기화 시 `setDeviceId()` 호출
- [x] CORS `allowedHeaders`에 `"X-Device-Id"` 추가

### 운영 검증 (배포 후)

- [ ] 개발 환경에서 rate limit 무제한 동작 확인
- [ ] 로그인 429 시 "요청이 너무 많습니다" 메시지 표시 확인
- [ ] `/auth/refresh` 요청이 login rate limit에 카운트되지 않는지 확인
- [ ] 운영 환경 배포 후 NAT 환경에서 `X-Device-Id` 정상 전달 확인

---

## 10. 운영 배포 전 필수 조치 요약

> **3개 항목 모두 ✅ 구현 완료 (2026-03-11)**

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | `request()` 함수에 `X-Device-Id: getDeviceId()` 헤더 추가 | `client.ts:277-280` | ✅ 완료 |
| 2 | settingsStore 초기화 시 `setDeviceId()` 호출 | `stores/settings.ts:3,35` | ✅ 완료 |
| 3 | CORS `allowedHeaders`에 `"X-Device-Id"` 추가 | `backend/src/index.ts:50` | ✅ 완료 |

**운영 전제 조건**: 각 기기에 `POSON_DEVICE_ID` 환경변수가 고유하게 설정되어야 함. 미설정 기기는 `req.ip` fallback으로 동작.
