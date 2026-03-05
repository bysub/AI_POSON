# POSON POS Kiosk - 종합 개선 작업흐름

> 기준 문서: `comprehensive-architecture-review.md`
> 작성일: 2026-03-04
> 최종 업데이트: 2026-03-04
> 현재 종합 점수: **~83/100 (B)** | 보안: 88 | 테스트: 40 | 구조: 75
> **진행 상태**: Phase 0 ✅ | Phase 1 ✅ | Phase 2 ✅ (부분) | **Phase 3 ✅** | Phase 4 ⬜

---

## Phase 0: 긴급 인프라 구축 (선행 필수, 0.5일)

> 모든 후속 Phase의 안전망. 이것 없이 코드 수정은 위험.

### 0-1. Backend 테스트 인프라

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 0-1-1 | Vitest 설정 파일 생성 | `backend/vitest.config.ts` | ✅ 완료 |
| 0-1-2 | 테스트 DB 환경 분리 | `backend/.env.test` | ✅ 완료 |
| 0-1-3 | `express-async-errors` 설치 또는 `asyncHandler` 래퍼 작성 | `backend/src/utils/asyncHandler.ts` | ✅ 완료 |
| 0-1-4 | 기존 라우트에 asyncHandler 적용 (R-5 해결) | `backend/src/routes/*.ts` (14개) | ✅ 완료 |

### 0-2. Frontend 테스트 인프라

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 0-2-1 | Vitest 설정 확인/수정 | `frontend/vitest.config.ts` | ✅ 완료 |
| 0-2-2 | Vue Test Utils 기본 설정 | `frontend/src/renderer/src/__tests__/setup.ts` | ✅ 완료 |

### 0-3. CI 기본 검증

| # | 작업 | 설명 | 상태 |
|---|------|------|------|
| 0-3-1 | lint + type-check 스크립트 확인 | `npm run lint && npm run type-check` 동작 검증 | ✅ 완료 |

**완료 기준**: ✅ `npm run test` 실행 시 테스트 정상 통과

---

## Phase 1: 보안 패치 + 테스트 (Critical, 3~5일)

> 18개 취약점 중 P0 11개 우선 해결. **각 수정마다 테스트 작성**.

### 1-1. P0 Critical 즉시 수정 (6개)

| # | 취약점 | 작업 | 파일 | 상태 |
|---|--------|------|------|------|
| 1-1-1 | **S-7** 주문 가격 클라이언트 신뢰 | 서버에서 DB 가격 조회 후 합계 재계산 | `backend/src/routes/orders.ts` | ✅ 완료 |
| 1-1-2 | **S-8** 주문 상태 무인증 변경 | `authenticate` 미들웨어 추가 | `backend/src/routes/orders.ts` | ✅ 완료 |
| 1-1-3 | **S-10** 결제 API 무인증 | 키오스크 전용 토큰 또는 `authenticate` 추가 | `backend/src/routes/payments.ts` | ✅ 완료 |
| 1-1-4 | **S-11** `?admin=true` 필터 우회 | `authenticate` + `authorize` 뒤에서만 허용 | `backend/src/routes/products.ts` | ✅ 완료 |
| 1-1-5 | **S-1/S-17** JWT Secret 하드코딩 | 환경변수 통합 + 시작 시 검증 | `backend/src/config/index.ts` | ✅ 완료 |
| 1-1-6 | **S-3** CORS else 전체 허용 | `callback(new Error('Not allowed by CORS'))` | `backend/src/index.ts` | ✅ 완료 |

**의존성**: Phase 0-1-3 (asyncHandler) 완료 후 진행

### 1-2. P0 High 수정 (5개)

| # | 취약점 | 작업 | 파일 | 상태 |
|---|--------|------|------|------|
| 1-2-1 | **S-2** Refresh Token in-memory | Redis로 이전 | `backend/src/services/auth.service.ts` | ✅ 완료 |
| 1-2-2 | **S-6** 개발용 하드코딩 인증 | `NODE_ENV=development` 엄격 검증 또는 제거 | `auth.service.ts` | ✅ 완료 |
| 1-2-3 | **S-4** CSP 프로덕션 헤더 삭제 | 적절한 CSP 정책 주입으로 교체 | `frontend/src/main/index.ts` | ✅ 완료 |
| 1-2-4 | **S-5** IPC 하드웨어 sender 미검증 | sender origin 검증 추가 | `frontend/src/main/index.ts` | ✅ 완료 |
| 1-2-5 | **S-18** accessToken ref 직접 노출 | getter만 노출 | `frontend/.../stores/auth.ts` | ✅ 완료 |

### 1-3. 안정성 이슈 (P0 2개)

| # | 이슈 | 작업 | 파일 | 상태 |
|---|------|------|------|------|
| 1-3-1 | **R-1** 주문번호 Race Condition | DB 시퀀스 또는 `SELECT ... FOR UPDATE` | `backend/src/routes/orders.ts` | ✅ 완료 |
| 1-3-2 | **R-2** Idempotency in-memory | Redis 기반으로 전환 | `backend/src/services/idempotency.service.ts` | ✅ 완료 |

**Phase 1 완료 기준**: ✅ P0 취약점 13개 수정 + 테스트 존재

---

## Phase 2: 코드 정리 + 테스트 확장 (1주)

> Dead Code 제거, DRY 위반 해소, 핵심 비즈니스 테스트 추가.

### 2-1. Orphan/Dead Code 정리

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 2-1-1 | AdminView.vue 삭제 | `frontend/.../views/admin/AdminView.vue` (733줄) | ✅ 삭제 완료 |
| 2-1-2 | CartView.vue 삭제 | `frontend/.../views/kiosk/CartView.vue` (103줄) | ✅ 삭제 완료 |
| 2-1-3 | LanguageSelectView.vue 삭제 | 이미 존재하지 않음 | ✅ N/A |
| 2-1-4 | OrdersView.vue 삭제 | `frontend/.../views/admin/OrdersView.vue` (645줄) | ✅ 삭제 완료 |
| 2-1-5 | `frontend/src/shared/` 빈 디렉토리 삭제 | - | ✅ 삭제 완료 |

### 2-2. DRY 위반 해소

| # | 작업 | 범위 | 상태 |
|---|------|------|------|
| 2-2-1 | `formatPrice` 로컬 정의 제거 | 15개 파일 통일 | ✅ `utils/format.ts`에서 `formatPrice`(₩포함) + `formatNumber`(숫자만) export. 키오스크=formatNumber(i18n), 관리자=formatPrice |
| 2-2-2 | `VITE_API_URL` 단일화 | 5개 파일 | ✅ `config.ts` 생성, `API_BASE_URL` 상수로 통합 |
| 2-2-3 | 이중 API 클라이언트 통합 | `services/api/client.ts` | ⬜ 미구현 (Phase 3에서 Service Layer 도입 시 함께 진행 권장) |

### 2-3. 더미 데이터 제거

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 2-3-1 | `getDefaultProducts()` 9개 더미 상품 + `getDefaultCategories()` 5개 더미 카테고리 제거 | `stores/products.ts` | ✅ 제거 완료 (~120줄 삭제). 에러 시 사용자 친화적 메시지 표시로 교체 |
| 2-3-2 | Dexie.js 캐시 우선 로드 | 동일 파일 | ⬜ 미구현 (Dexie.js 기반 오프라인 캐시는 별도 작업 필요) |

### 2-4. 핵심 테스트 작성

| # | 대상 | 종류 | 상태 |
|---|------|------|------|
| 2-4-1 | `payment.service.ts` | 단위 테스트 | ✅ 21개 테스트 (현금결제, 멱등성, 카드 Failover, 취소/환불, 헬스체크, CB상태) |
| 2-4-2 | `auth.service.ts` | 단위 테스트 | ✅ 10개 테스트 (login, verifyToken, hashPassword, refresh, logout) |
| 2-4-3 | `circuit-breaker.ts` | 단위 테스트 | ✅ 13개 테스트 (상태 전환, execute, reset, 기본값) |
| 2-4-4 | `idempotency.service.ts` | 단위 테스트 | ✅ 8개 테스트 (checkAndLock, complete, fail, unlock, TTL) |
| 2-4-5 | `cart` Store | 단위 테스트 | ✅ 19개 테스트 (초기상태, addItem, totalAmount, updateQuantity, removeItem, clear, submitOrder) |
| 2-4-6 | `productMatcher.ts` | 단위 테스트 | ✅ 19개 테스트 (getChosung, levenshtein, matchProducts 4단계 매칭) |

**Phase 2 완료 기준**: ✅ Orphan 0개, formatPrice 단일 소스, 핵심 서비스 테스트 커버리지 존재
- Backend: 73개 테스트 통과 (7 파일)
- Frontend: 38개 테스트 통과 (2 파일)
- 미완료 항목: 2-2-3 (이중 API 클라이언트), 2-3-2 (Dexie.js 캐시)

---

## Phase 3: 구조 리팩토링 (2주)

> Service Layer 도입, 거대 파일 분해, 성능 개선.

### 3-1. Backend Service Layer 추가

| # | 라우트 | 신규 서비스 | 상태 |
|---|--------|-------------|------|
| 3-1-1 | `orders.ts` (680→147줄) | `OrderService` (370줄) | ✅ 완료 |
| 3-1-2 | `products.ts` (619→190줄) | `ProductService` (454줄) | ✅ 완료 |
| 3-1-3 | `categories.ts` (205→90줄) | `CategoryService` | ✅ 완료 |
| 3-1-4 | `suppliers.ts` (328→90줄) | `SupplierService` | ✅ 완료 |
| 3-1-5 | `purchases.ts` (520→120줄) | `PurchaseService` (R-4 트랜잭션 통합) | ✅ 완료 |
| 3-1-6 | `purchase-products.ts` (397→120줄) | `PurchaseProductService` | ✅ 완료 |
| 3-1-7 | `devices.ts` (152→60줄) + `settings.ts` (71→30줄) | `DeviceService` (82줄), `SettingService` (42줄) | ✅ 완료 |
| 3-1-8 | `members.ts` (168→60줄) + `admins.ts` (106→35줄) | `MemberService` (96줄), `AdminService` (68줄) | ✅ 완료 |

**패턴**: `Route → Service → Prisma` (비즈니스 로직을 Service로 이동)

### 3-2. Frontend 거대 파일 분해

| # | 파일 | 줄 수 | 분해 전략 |
|---|------|-------|-----------|
| 3-2-1 | `DevicesView.vue` | 2,276→1,040줄 | `deviceSettingsData.ts` (693줄) + `ToggleGrid.vue` (37줄) 추출 | ✅ 완료 |
| 3-2-2 | `SettingsView.vue` | 1,372→889줄 | `settingsData.ts` (266줄) + `ToggleGrid.vue` 재사용 | ✅ 완료 |
| 3-2-3 | `ProductsView.vue` | 1,362→295줄 | `ProductFormModal.vue` 분리 (1,047줄) | ✅ 완료 |
| 3-2-4 | `CategoriesView.vue` | 1,069→450줄 | `CategoryFormModal.vue` 분리 | ✅ 완료 |

### 3-3. 공통 컴포넌트 추출

| # | 컴포넌트 | 용도 |
|---|----------|------|
| 3-3-1 | `DataTable` | ⏸️ 보류 (뷰별 컬럼 구조 상이, 과도한 추상화 위험) |
| 3-3-2 | `FormModal` | ⏸️ 보류 (ProductFormModal/CategoryFormModal 이미 분리됨) |
| 3-3-3 | `ConfirmDialog` | ✅ 이미 `showConfirm()` 유틸로 공통화됨 (AlertUtils) |

### 3-4. Electron Main Process 분리

| # | 모듈 | 현재 위치 | 상태 |
|---|------|-----------|------|
| 3-4-1 | `ipc-handlers.ts` | env/app/hardware IPC 핸들러 (155줄) | ✅ 완료 |
| 3-4-2 | `window-manager.ts` | CSP + BrowserWindow 생성 (113줄) | ✅ 완료 |
| 3-4-3 | `hardware-manager.ts` | 기존 `hardware/` 모듈 유지 | ✅ N/A (이미 분리) |
| 3-4-4 | `stt-daemon.ts` | STT 데몬 + IPC (252줄) | ✅ 완료 |

**결과**: `index.ts` 621줄 → 42줄 (orchestrator)

### 3-5. 성능 개선

| # | 이슈 | 작업 |
|---|------|------|
| 3-5-1 | **R-3** Redis `KEYS` → `SCAN` | ✅ `cache.ts` deletePattern+flushAll SCAN 전환 완료 |
| 3-5-2 | Levenshtein early-exit 최적화 | ✅ 길이 차이 기반 early-exit로 불필요한 O(m×n) 계산 스킵 |
| 3-5-3 | `useSTT.ts` 타이머 누수 수정 | ✅ lazy 초기화 + `destroy()` + `onUnmounted` cleanup |

### 3-6. P1 보안/안정성 잔여

| # | 이슈 | 작업 |
|---|------|------|
| 3-6-1 | **S-14** 입력 검증 Zod 확대 | ✅ orders.ts에 createOrderSchema + updateStatusSchema 적용 |
| 3-6-2 | **S-16** Rate Limiter 세분화 | ✅ auth(30/15m), payments(100/15m), global(1000/15m) |
| 3-6-3 | **R-4** 매입 수정 트랜잭션 통합 | ✅ PurchaseService로 이동 시 통합 완료 |
| 3-6-4 | 접근성: `role="radiogroup"` 추가 | ✅ OrderConfirmView.vue + 4개 언어 aria-label 추가 |

**Phase 3 완료 기준**: Service Layer 10개 구축 ✅ (Order, Product, Category, Supplier, Purchase, PurchaseProduct, Device, Setting, Member, Admin), 거대 파일 4개 모두 분해 ✅, 성능 개선 3건 ✅, 보안 잔여 4건 ✅

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

| Phase | 보안 | 테스트 | 종합 | 상태 |
|-------|------|--------|------|------|
| 초기 | 65 (D) | 0 (F) | 64.5 (D+) | - |
| Phase 0 완료 | 65 | 5 | 65 | ✅ |
| Phase 1 완료 | **85 (A-)** | 20 | **75 (C+)** | ✅ |
| **Phase 2 완료 (현재)** | **88** | **40** | **~80 (B-)** | ✅ |
| Phase 3 완료 | 90 | 55 | **85 (B+)** | ✅ |
| Phase 4 완료 | 92 | 70 | **88 (A-)** | ⬜ |

---

## 체크리스트 요약

- [x] **Phase 0**: 테스트 인프라 + asyncHandler ✅
- [x] **Phase 1**: P0 보안 13개 수정 + 테스트 ✅
- [x] **Phase 2**: Orphan 정리 + DRY + 핵심 테스트 ✅ (부분: 2-2-3, 2-3-2 미완료)
- [x] **Phase 3**: Service Layer 10개 구축 ✅ + Redis SCAN ✅ + R-4 트랜잭션 ✅ + 거대 파일 4개 분해 ✅ + 성능 개선 3건 ✅ + 보안 잔여 4건 ✅
- [ ] **Phase 4**: 하드웨어 연동 + E2E (3주)
