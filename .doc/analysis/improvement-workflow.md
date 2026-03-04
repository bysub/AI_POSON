# POSON POS Kiosk - 종합 개선 작업흐름

> 기준 문서: `comprehensive-architecture-review.md`
> 작성일: 2026-03-04
> 현재 종합 점수: **64.5/100 (D+)** | 보안: 65(D) | 테스트: 0(F)

---

## Phase 0: 긴급 인프라 구축 (선행 필수, 0.5일)

> 모든 후속 Phase의 안전망. 이것 없이 코드 수정은 위험.

### 0-1. Backend 테스트 인프라

| # | 작업 | 파일 | 우선순위 |
|---|------|------|----------|
| 0-1-1 | Vitest 설정 파일 생성 | `backend/vitest.config.ts` | P0 |
| 0-1-2 | 테스트 DB 환경 분리 | `backend/.env.test` | P0 |
| 0-1-3 | `express-async-errors` 설치 또는 `asyncHandler` 래퍼 작성 | `backend/src/utils/asyncHandler.ts` | P0 |
| 0-1-4 | 기존 라우트에 asyncHandler 적용 (R-5 해결) | `backend/src/routes/*.ts` (14개) | P0 |

### 0-2. Frontend 테스트 인프라

| # | 작업 | 파일 | 우선순위 |
|---|------|------|----------|
| 0-2-1 | Vitest 설정 확인/수정 | `frontend/vitest.config.ts` | P1 |
| 0-2-2 | Vue Test Utils 기본 설정 | `frontend/src/renderer/src/__tests__/setup.ts` | P1 |

### 0-3. CI 기본 검증

| # | 작업 | 설명 | 우선순위 |
|---|------|------|----------|
| 0-3-1 | lint + type-check 스크립트 확인 | `npm run lint && npm run type-check` 동작 검증 | P1 |

**완료 기준**: `npm run test` 실행 시 0개 테스트가 정상 통과하는 상태

---

## Phase 1: 보안 패치 + 테스트 (Critical, 3~5일)

> 18개 취약점 중 P0 11개 우선 해결. **각 수정마다 테스트 작성**.

### 1-1. P0 Critical 즉시 수정 (6개)

| # | 취약점 | 작업 | 파일 | 테스트 |
|---|--------|------|------|--------|
| 1-1-1 | **S-7** 주문 가격 클라이언트 신뢰 | 서버에서 DB 가격 조회 후 합계 재계산 | `backend/src/routes/orders.ts:105,139-142` | 가격 조작 시도 테스트 |
| 1-1-2 | **S-8** 주문 상태 무인증 변경 | `authenticate` 미들웨어 추가 | `backend/src/routes/orders.ts:333` | 미인증 상태변경 차단 테스트 |
| 1-1-3 | **S-10** 결제 API 무인증 | 키오스크 전용 토큰 또는 `authenticate` 추가 | `backend/src/routes/payments.ts:69,177,236,294` | 미인증 결제 차단 테스트 |
| 1-1-4 | **S-11** `?admin=true` 필터 우회 | `authenticate` + `authorize` 뒤에서만 허용 | `backend/src/routes/products.ts:27-29` | 미인증 admin 쿼리 차단 테스트 |
| 1-1-5 | **S-1/S-17** JWT Secret 하드코딩 | 환경변수 통합 + 시작 시 검증 (없으면 프로세스 종료) | `backend/src/config/index.ts:18-19`, `auth.service.ts:28-30` | Secret 미설정 시 종료 테스트 |
| 1-1-6 | **S-3** CORS else 전체 허용 | `callback(new Error('Not allowed by CORS'))` | `backend/src/index.ts:24-42` | 비허용 origin 차단 테스트 |

**의존성**: Phase 0-1-3 (asyncHandler) 완료 후 진행

### 1-2. P0 High 수정 (5개)

| # | 취약점 | 작업 | 파일 |
|---|--------|------|------|
| 1-2-1 | **S-2** Refresh Token in-memory | Redis로 이전 | `backend/src/services/auth.service.ts:15-16` |
| 1-2-2 | **S-6** 개발용 하드코딩 인증 | `NODE_ENV=development` 엄격 검증 또는 제거 | `auth.service.ts:258-265, 271-278` |
| 1-2-3 | **S-4** CSP 프로덕션 헤더 삭제 | 적절한 CSP 정책 주입으로 교체 | `frontend/src/main/index.ts:28-58` |
| 1-2-4 | **S-5** IPC 하드웨어 sender 미검증 | sender origin 검증 추가 | `frontend/src/main/index.ts:170-271` |
| 1-2-5 | **S-18** accessToken ref 직접 노출 | getter만 노출, localStorage → sessionStorage 또는 httpOnly 검토 | `frontend/src/renderer/src/stores/auth.ts:130` |

### 1-3. 안정성 이슈 (P0 2개)

| # | 이슈 | 작업 | 파일 |
|---|------|------|------|
| 1-3-1 | **R-1** 주문번호 Race Condition | DB 시퀀스 또는 `SELECT ... FOR UPDATE` | `backend/src/routes/orders.ts:151-154` |
| 1-3-2 | **R-2** Idempotency in-memory | Redis 기반으로 전환 | `backend/src/services/idempotency.service.ts:9` |

**Phase 1 완료 기준**: P0 취약점 11개 수정 + 각 수정 항목별 테스트 존재

---

## Phase 2: 코드 정리 + 테스트 확장 (1주)

> Dead Code 제거, DRY 위반 해소, 핵심 비즈니스 테스트 추가.

### 2-1. Orphan/Dead Code 정리

| # | 작업 | 파일 | 조치 |
|---|------|------|------|
| 2-1-1 | AdminView.vue 삭제 | `frontend/.../views/admin/AdminView.vue` (733줄) | 삭제 |
| 2-1-2 | CartView.vue 삭제 | `frontend/.../views/kiosk/CartView.vue` (103줄) | 삭제 |
| 2-1-3 | LanguageSelectView.vue 삭제 | `frontend/.../views/kiosk/LanguageSelectView.vue` (43줄) | 삭제 |
| 2-1-4 | OrdersView.vue 처리 | `frontend/.../views/admin/OrdersView.vue` (645줄) | 라우터 등록 또는 삭제 |
| 2-1-5 | `frontend/src/shared/` 빈 디렉토리 삭제 | - | 삭제 |

### 2-2. DRY 위반 해소

| # | 작업 | 범위 | 설명 |
|---|------|------|------|
| 2-2-1 | `formatPrice` 18개 로컬 정의 제거 | 18개 파일 | `utils/format.ts` import로 통일 (₩ 포함) |
| 2-2-2 | `VITE_API_URL` 단일화 | 5개 파일 | `config.ts` 또는 환경 상수 모듈로 통합 |
| 2-2-3 | 이중 API 클라이언트 통합 | `services/api/client.ts` | `HttpApiClient` + `apiClient` → 단일 클라이언트 |

### 2-3. 더미 데이터 제거

| # | 작업 | 파일 |
|---|------|------|
| 2-3-1 | `getDefaultProducts()` 9개 더미 상품 제거 | `stores/products.ts:135-237` |
| 2-3-2 | Dexie.js 캐시 우선 로드 + 에러 메시지 표시로 교체 | 동일 파일 |

### 2-4. 핵심 테스트 작성

| # | 대상 | 종류 | 우선순위 |
|---|------|------|----------|
| 2-4-1 | `payment.service.ts` | 단위 테스트 | Tier 1 |
| 2-4-2 | `auth.service.ts` | 단위 테스트 | Tier 1 |
| 2-4-3 | `circuit-breaker.ts` | 단위 테스트 | Tier 1 |
| 2-4-4 | `idempotency.service.ts` | 단위 테스트 | Tier 1 |
| 2-4-5 | `cart` Store | 단위 테스트 | Tier 2 |
| 2-4-6 | `productMatcher.ts` | 단위 테스트 | Tier 2 |

**Phase 2 완료 기준**: Orphan 0개, formatPrice 단일 소스, 핵심 서비스 테스트 커버리지 존재

---

## Phase 3: 구조 리팩토링 (2주)

> Service Layer 도입, 거대 파일 분해, 성능 개선.

### 3-1. Backend Service Layer 추가

| # | 라우트 | 신규 서비스 | 줄 수 |
|---|--------|-------------|-------|
| 3-1-1 | `orders.ts` (656줄) | `OrderService` | 최우선 |
| 3-1-2 | `products.ts` (611줄) | `ProductService` | 최우선 |
| 3-1-3 | `categories.ts` | `CategoryService` | 중간 |
| 3-1-4 | `devices.ts` + `settings.ts` | `DeviceService`, `SettingService` | 중간 |
| 3-1-5 | `purchases.ts` | `PurchaseService` (R-4 트랜잭션 통합 포함) | 중간 |
| 3-1-6 | 나머지 7개 | 각각 서비스 분리 | 낮음 |

**패턴**: `Route → Service → Prisma` (비즈니스 로직을 Service로 이동)

### 3-2. Frontend 거대 파일 분해

| # | 파일 | 줄 수 | 분해 전략 |
|---|------|-------|-----------|
| 3-2-1 | `DevicesView.vue` | 2,276줄 | 탭별 하위 컴포넌트 (PosSettings, KioskSettings, KitchenSettings) |
| 3-2-2 | `SettingsView.vue` | 1,372줄 | 탭별 컴포넌트 (SaleTab, PaymentTab, ...) |
| 3-2-3 | `ProductsView.vue` | 1,364줄 | `ProductForm` + `ProductList` + `ProductModal` |
| 3-2-4 | `CategoriesView.vue` | 1,069줄 | `CategoryForm` 분리 |

### 3-3. 공통 컴포넌트 추출

| # | 컴포넌트 | 용도 |
|---|----------|------|
| 3-3-1 | `DataTable` | Admin 목록 뷰 공통 테이블 |
| 3-3-2 | `FormModal` | CRUD 폼 모달 공통 |
| 3-3-3 | `ConfirmDialog` | 삭제/취소 확인 대화상자 |

### 3-4. Electron Main Process 분리

| # | 모듈 | 현재 위치 |
|---|------|-----------|
| 3-4-1 | `ipc-handlers.ts` | `main/index.ts` 내 IPC 핸들러 |
| 3-4-2 | `window-manager.ts` | 윈도우 생성/관리 |
| 3-4-3 | `hardware-manager.ts` | 프린터/스캐너/단말기 |
| 3-4-4 | `stt-daemon.ts` | STT 데몬 관리 |

### 3-5. 성능 개선

| # | 이슈 | 작업 |
|---|------|------|
| 3-5-1 | **R-3** Redis `KEYS` → `SCAN` | `cache.ts:141-158, 210` |
| 3-5-2 | Levenshtein 디바운싱 | `productMatcher.ts` |
| 3-5-3 | `useSTT.ts` 모듈 레벨 싱글톤 누수 | `onUnmounted` 정리 + 타이머 관리 |

### 3-6. P1 보안/안정성 잔여

| # | 이슈 | 작업 |
|---|------|------|
| 3-6-1 | **S-14** 입력 검증 Zod 확대 | 주요 라우트에 Zod 스키마 적용 |
| 3-6-2 | **S-16** Rate Limiter 세분화 | 엔드포인트별 rate limit 설정 |
| 3-6-3 | **R-4** 매입 수정 트랜잭션 통합 | `purchases.ts:360-434` |
| 3-6-4 | 접근성: `role="radiogroup"` 추가 | `OrderConfirmView.vue` |

**Phase 3 완료 기준**: Service Layer 12개 중 최소 5개 구축, 거대 파일 4개 분해 완료

---

## Phase 4: 기능 완성 (3주)

> 하드웨어 연동, 실제 VAN API, 주방 디스플레이 등.

| # | 기능 | 설명 | TODO 수 |
|---|------|------|---------|
| 4-1 | 시리얼 포트 하드웨어 연동 | 프린터, 스캐너, VAN 단말기 | 11개 |
| 4-2 | NICE VAN API 실제 연동 | 현재 모의(mock) 상태 | 2개 |
| 4-3 | 주방 디스플레이 WebSocket | 실시간 주문 연동 | 신규 |
| 4-4 | 영수증 프린트 구현 | ESC/POS 실제 출력 | 연관 |
| 4-5 | STT Whisper 연동 완성 | Python 스크립트 존재, 연동만 | 1개 |
| 4-6 | E2E 테스트 | 키오스크 전체 플로우 | 신규 |

**Phase 4 완료 기준**: 하드웨어 11개 TODO 해소, E2E 테스트 주요 플로우 커버

---

## 의존성 그래프

```
Phase 0 ─────────────────────────────────────────┐
  0-1 테스트 인프라 ──┐                           │
  0-2 FE 테스트 ──────┤                           │
  0-3 CI 검증 ────────┘                           │
                      │                           │
Phase 1 ◄─────────────┘                           │
  1-1 P0 Critical (S-7,8,10,11,1,3) ──┐          │
  1-2 P0 High (S-2,6,4,5,18) ─────────┤          │
  1-3 안정성 (R-1,2) ─────────────────┘          │
                      │                           │
Phase 2 ◄─────────────┘                           │
  2-1 Orphan 정리 ─────── (독립)                  │
  2-2 DRY 해소 ────────── (독립)                  │
  2-3 더미 데이터 ─────── (독립)                  │
  2-4 테스트 확장 ─────── (1-1, 1-2 이후)         │
                      │                           │
Phase 3 ◄─────────────┘                           │
  3-1 Service Layer ───── (2-4 테스트 존재 후)     │
  3-2 파일 분해 ───────── (독립)                  │
  3-3 공통 컴포넌트 ───── (3-2 이후)              │
  3-4 Electron 분리 ───── (독립)                  │
  3-5 성능 개선 ───────── (독립)                  │
                      │                           │
Phase 4 ◄─────────────┘                           │
  4-1~4-6 기능 완성 ──────────────────────────────┘
```

---

## 예상 목표 점수 (Phase별)

| Phase | 보안 | 테스트 | 종합 |
|-------|------|--------|------|
| 현재 | 65 (D) | 0 (F) | 64.5 (D+) |
| Phase 0 완료 | 65 | 5 | 65 |
| Phase 1 완료 | **85 (A-)** | 20 | **75 (C+)** |
| Phase 2 완료 | 88 | 40 | **80 (B-)** |
| Phase 3 완료 | 90 | 55 | **85 (B+)** |
| Phase 4 완료 | 92 | 70 | **88 (A-)** |

---

## 체크리스트 요약

- [ ] **Phase 0**: 테스트 인프라 + asyncHandler (0.5일)
- [ ] **Phase 1**: P0 보안 11개 수정 + 테스트 (3~5일)
- [ ] **Phase 2**: Orphan 정리 + DRY + 핵심 테스트 (1주)
- [ ] **Phase 3**: Service Layer + 파일 분해 + 성능 (2주)
- [ ] **Phase 4**: 하드웨어 연동 + E2E (3주)
