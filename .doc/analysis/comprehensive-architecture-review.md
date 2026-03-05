# POSON POS Kiosk - 종합 아키텍처 분석 보고서

> 최초 분석일: 2026-03-03 | **검증 갱신일: 2026-03-03** | 분석 범위: Backend + Frontend 전체 | 심층 수준: Deep
>
> Expert Panel: Martin Fowler (Architecture Lead), Michael Nygard (Reliability), Sam Newman (Services), Gregor Hohpe (Integration)

---

## 1. 프로젝트 현황 요약

### 1.1 규모 지표

| 항목 | 수치 | 검증 상태 |
|------|------|-----------|
| Backend 라우트 모듈 | 16개 기능 모듈 + 1 index (17 파일) | **검증 완료** |
| Frontend 뷰 파일 | **32개** (Admin 22 + Kiosk dir 2 + Root 8) | **수정됨** (기존 30) |
| Pinia 스토어 | 8개 (accessibility, settings, voiceEvent 추가) | **검증 완료** |
| Backend 서비스 | **2개** (auth, payment) + 4 VAN 전략 | **수정됨** (기존 7) |
| Vue 컴포넌트 | 18개 | **검증 완료** |
| Composables | 5개 (모두 음성/접근성 신규) | **검증 완료** |
| Prisma 모델 | 19개 (+ 9 Enum) | **검증 완료** |
| 지원 언어 | 4개 (ko, en, ja, zh) | **검증 완료** |
| VAN 결제사 | 4개 (NICE, KICC, KIS, Smartro) | **검증 완료** |
| 하드웨어 인터페이스 | 3개 (프린터, 스캐너, 단말기) | **검증 완료** |
| Orphan 뷰 파일 | **4개** (AdminView, CartView, LanguageSelectView, OrdersView) | **수정됨** (기존 2~3) |
| 테스트 파일 | **0개** | **검증 완료** |

> **Expert Note (Martin Fowler)**: "Backend 서비스가 2개뿐이라는 사실은 원래 보고서의 '7개'라는 수치보다 심각한 상황을 의미합니다. 14개 라우트 중 12개가 서비스 레이어 없이 직접 Prisma를 호출하고 있습니다. 이는 비즈니스 로직의 테스트 가능성과 재사용성을 크게 저하시킵니다."

### 1.2 아키텍처 점수 (검증 후 재평가)

| 영역 | 점수 | 등급 | 변경 사유 |
|------|------|------|-----------|
| 아키텍처 | 82/100 | A- | 서비스 레이어 부재 범위가 예상보다 넓음 |
| 코드 품질 | 80/100 | A- | formatPrice 19곳 중복, VITE_API_URL 5곳 반복 확인 |
| 유지보수성 | 78/100 | B+ | orphan 4개, 이중 API 클라이언트 확인 |
| 성능 | 82/100 | A- | 변동 없음 |
| 보안 | **65/100** | **D** | **전체 17개 취약점 미수정 확인** |
| 테스트 | 0/100 | **F** | 변동 없음 |
| **종합** | **64.5/100** | **D+** | 보안 점수 대폭 하향 |

> **Expert Note (Michael Nygard)**: "보안 점수 78점(B+)은 과대평가였습니다. 결제 API 무인증(S-10), 주문 가격 클라이언트 신뢰(S-7), 주문 상태 무인증 변경(S-8)은 각각 단독으로도 시스템 전체를 위험에 빠뜨릴 수 있는 Critical 취약점입니다. POS 시스템에서 이 3가지가 동시에 존재한다는 것은 프로덕션 배포가 불가능한 수준입니다."

---

## 2. 아키텍처 강점 분석

### 2.1 잘 설계된 부분

**Strategy Pattern (결제 시스템)**
```
PaymentService → Interface → NICE | KICC | KIS | Smartro
                           + CircuitBreaker
                           + IdempotencyService
                           + RetryHandler
```
- VAN 전환이 용이한 전략 패턴 적용
- CircuitBreaker로 VAN 장애 시 자동 차단/복구
- 멱등성 보장으로 중복 결제 방지
- 4개 VAN 전략 구현 완료

> **Expert Note (Sam Newman)**: "결제 서비스의 Strategy Pattern은 이 코드베이스에서 가장 성숙한 부분입니다. 다만 IdempotencyService가 in-memory Map이라는 점(R-2)이 패턴의 실질적 효과를 무력화합니다. CircuitBreaker 역시 단일 프로세스 내에서만 유효하여, 수평 확장 시 각 인스턴스가 독립적으로 장애를 감지하게 됩니다."

**2계층 설정 시스템**
- SystemSetting (매장 공통) + DeviceSetting (기기별) 분리
- 6개 카테고리 체계 (SALE, PAYMENT, PRINT, POINT, BARCODE, SYSTEM)
- 기기 유형별 탭 구조 (POS 2탭, KIOSK 9탭, KITCHEN 2탭)
- POSON_DEVICE_ID 환경변수로 현재 기기 자동 식별
- IPC `env:get` 핸들러에 SAFE_ENV_KEYS 화이트리스트 적용 (부분 개선)

**오프라인 우선 아키텍처**
- Dexie.js + IndexedDB 로컬 저장
- SyncManager로 온라인 복귀 시 자동 동기화
- 오프라인 시 현금 결제만 허용하는 안전 설계

> **Expert Note (Gregor Hohpe)**: "오프라인 우선 설계는 POS 시스템의 핵심 요구사항을 정확히 충족합니다. 다만 `getDefaultProducts()`에서 하드코딩된 더미 상품 9개(불고기버거 세트 등)로 fallback하는 것은 설계 의도와 완전히 모순됩니다. 오프라인 시 Dexie.js 캐시를 사용해야지, 데모 데이터를 보여주면 안 됩니다."

**다국어 지원**
- Vue i18n 4개 언어 (ko, en, ja, zh)
- DB 필드 수준 다국어 (name, nameEn, nameJa, nameZh)
- 키오스크 진입 시 언어 선택 화면

**매입/재고 시스템**
- Prisma `$transaction` + `increment/decrement`로 원자적 재고 관리
- 매입 생성/취소 시 자동 재고 증감
- 전체 재고 재계산 API (sync-stock)

**Redis 캐싱**
- 5분 TTL 기반 상품/카테고리 캐싱
- CUD 작업 시 자동 캐시 무효화
- Redis 미연결 시 graceful fallback

### 2.2 코드 패턴 일관성

- API 응답: `{ success: boolean, data?: T, message?: string }` 통일
- 에러 처리: `AppError(statusCode, message, code)` 패턴
- Vue: Composition API + `<script setup>` 일관 사용
- 인증: JWT accessToken(15m) + refreshToken(7d)
- 역할 기반 접근 제어: SUPER_ADMIN > ADMIN > MANAGER > STAFF

---

## 3. 보안 취약점 (Critical) - 전수 검증 완료

> **검증 결과: 원본 보고서의 모든 보안 취약점이 미수정 상태로 확인됨**

### 3.1 즉시 수정 필요 (P0) - 전체 미수정

| # | 취약점 | 위치 | 위험도 | 검증 상태 |
|---|--------|------|--------|-----------|
| S-1 | JWT Secret 하드코딩 (2곳, 값 상이) | config/index.ts:18-19, auth.service.ts:28-30 | CRITICAL | **미수정** |
| S-2 | Refresh Token in-memory 저장 (서버 재시작 시 소멸) | auth.service.ts:15-16 | CRITICAL | **미수정** |
| S-3 | CORS else 브랜치에서 전체 허용 (`callback(null, true)`) | index.ts:24-42 | CRITICAL | **미수정** |
| S-4 | CSP: dev에서 `unsafe-eval`+`unsafe-inline`, **prod에서 CSP 헤더 제거** | main/index.ts:28-58 | HIGH | **악화됨** |
| S-5 | IPC 하드웨어 핸들러 인증 미적용 (env:get만 화이트리스트 적용) | main/index.ts:170-271 | HIGH | **부분 개선** |
| S-6 | 개발용 하드코딩 인증 정보 fallback (2곳) | auth.service.ts:258-265, 271-278 | HIGH | **미수정** |

**S-1 상세**: `config/index.ts`의 fallback은 `"access-secret-change-in-production"`, `auth.service.ts`의 fallback은 `"access-secret-key-change-in-production"` — 값이 상이하나, 실행 시 config.ts 값이 우선 사용되어 auth.service.ts의 fallback은 사실상 dead code.

**S-4 변경 사항**: 프로덕션 빌드에서 CSP 헤더를 주입하지 않고 오히려 기존 CSP 헤더를 **삭제**하는 방식으로 변경됨. 이전보다 악화된 상태.

**S-5 변경 사항**: `env:get` IPC 핸들러에 SAFE_ENV_KEYS 화이트리스트 추가됨 (POSON_DEVICE_ID, NODE_ENV 등 6개 키만 허용). 그러나 printer/terminal/scanner 등 하드웨어 IPC 핸들러는 여전히 sender 인증 없음.

### 3.2 긴급 추가 발견 (P0) - 백엔드 심층 리뷰 - 전체 미수정

| # | 취약점 | 위치 | 위험도 | 검증 상태 |
|---|--------|------|--------|-----------|
| S-7 | **주문 가격 클라이언트 신뢰** - 서버가 DB 가격 대신 `req.body.items[].price`로 합계 계산 | orders.ts:105,139-142 | CRITICAL | **미수정** |
| S-8 | **주문 상태 변경 인증 없음** - 누구나 PATCH /:id/status로 주문을 PAID로 변경 가능 | orders.ts:333 | CRITICAL | **미수정** |
| S-9 | **설정 API GET 인증 없음** - 전체 SystemSetting 무인증 노출 (PUT은 인증 필요) | settings.ts:7-17 | HIGH | **의도적 설계 (위험 인지 필요)** |
| S-10 | **결제 API 전체 인증 없음** - 결제/취소/환불/조회 4개 엔드포인트 | payments.ts:69,177,236,294 | HIGH | **미수정** |
| S-11 | **`?admin=true`로 상품 필터 우회** - 미인증 상태로 숨김/대기 상품 조회 | products.ts:27-29 | HIGH | **미수정** |

> **Expert Note (Michael Nygard)**: "S-7(가격 클라이언트 신뢰)과 S-10(결제 무인증)이 동시에 존재한다는 것은, 악의적 사용자가 아무 인증 없이 0원짜리 주문을 생성하고 결제를 완료시킬 수 있다는 뜻입니다. POS 시스템에서 이것은 재무적 손실로 직결됩니다."

### 3.3 단기 수정 필요 (P1)

| # | 취약점 | 위치 | 위험도 | 검증 상태 |
|---|--------|------|--------|-----------|
| S-12 | 결제 민감 정보 console.log 노출 | PaymentView.vue 등 | MEDIUM | **미확인** |
| S-13 | STT_MODEL 환경변수 미검증 | useSTT.ts | MEDIUM | **미확인** |
| S-14 | 대부분 라우트에서 수동 검증 (Zod는 auth/payment만) | routes/ 전반 | MEDIUM | **미수정** |
| S-15 | 결제 성공 후 DB 업데이트 실패 무시 | PaymentView.vue | MEDIUM | **미확인** |
| S-16 | Rate Limiter 과도하게 허용 (1000 req/15min, 단일 글로벌) | index.ts:44-52 | MEDIUM | **미수정** |
| S-17 | JWT Secret fallback 예측 가능 (시작 시 검증 없음) | config/index.ts:17-22 | MEDIUM | **미수정** |
| **S-18** | **[신규] Auth Store에서 accessToken ref 직접 노출 + localStorage 저장** | stores/auth.ts:130 | **MEDIUM** | **신규 발견** |

### 3.4 안정성 이슈

| # | 이슈 | 위치 | 영향 | 검증 상태 |
|---|------|------|------|-----------|
| R-1 | 주문번호 동시 생성 시 Race Condition | orders.ts:151-154 | 중복 번호 충돌 | **부분 완화** ($transaction 내부, 단 READ COMMITTED 격리 수준) |
| R-2 | Idempotency Store가 in-memory (클러스터 미지원) | idempotency.service.ts:9 | 중복 결제 가능 | **미수정** |
| R-3 | Redis `KEYS` 명령어 사용 (deletePattern + flushAll) | cache.ts:141-158, 210 | Redis 전체 차단 | **미수정** |
| R-4 | 매입 수정 시 재고 조정/매입 업데이트가 별도 트랜잭션 | purchases.ts:360-434 | 데이터 불일치 | **미수정** |
| R-5 | Express 4 async 핸들러에서 에러 미처리 (express-async-errors 미설치) | orders.ts:311, settings.ts:8-34, products.ts:27-100 등 | 500 무한대기 | **미수정** |

> **Expert Note (Sam Newman)**: "R-1의 주문번호 Race Condition은 `$transaction` 내부에서 실행되지만, PostgreSQL의 기본 READ COMMITTED 격리 수준에서는 여전히 두 트랜잭션이 동일한 count를 읽을 수 있습니다. DB 시퀀스나 `SELECT ... FOR UPDATE`가 필요합니다."

---

## 4. 구조적 개선사항

### 4.1 거대 파일 리팩토링 (P1)

| 파일 | 줄 수 | 문제점 | 제안 |
|------|-------|--------|------|
| DevicesView.vue | 2,276줄 | 기기 유형별 UI 반복 | 탭별 하위 컴포넌트 분리 |
| SettingsView.vue | 1,372줄 | 6개 탭 단일 파일 | 탭별 컴포넌트 분리 |
| ProductsView.vue | 1,364줄 | 폼+모달 로직 혼재 | ProductForm, ProductList 분리 |
| CategoriesView.vue | 1,069줄 | 폼 모달 로직 내장 | CategoryForm 분리 |
| AdminView.vue | 733줄 | **확인된 orphan** - 라우터 미등록, 참조 0건 | **삭제 권장** |
| OrdersView.vue (Admin) | 645줄 | **확인된 orphan** - 라우터 미등록, 참조 0건 | **삭제 또는 라우터 등록** |
| orders.ts (Backend) | 656줄 | 비즈니스 로직이 라우트에 혼재 | OrderService 분리 |
| products.ts (Backend) | 611줄 | 서비스 로직이 라우트에 혼재 | ProductService 분리 |
| main/index.ts (Electron) | 592줄 | IPC/하드웨어/윈도우 관리 혼재 | 모듈별 분리 |

> **Expert Note (Martin Fowler)**: "AdminView.vue(733줄)와 OrdersView.vue(645줄)가 라우터에 등록되지 않은 채 존재한다는 것은 코드 리뷰 프로세스의 부재를 의미합니다. 특히 OrdersView.vue는 최근에 추가된 파일인데도 라우터 등록 없이 커밋되었습니다. 이는 PR 리뷰나 CI 검증이 없다는 증거입니다."

### 4.2 아키텍처 패턴 개선

**백엔드: Service Layer 부재 (14개 라우트 중 12개)**
```
현재: Route → Prisma (직접 호출)  ← 12개 라우트
개선: Route → Service → Repository(Prisma)

서비스 있음: auth.ts → AuthService, payments.ts → PaymentService
서비스 없음: orders, products, categories, devices, settings,
            suppliers, purchases, purchase-products, branches,
            members, admins, uploads (12개)
```
- 비즈니스 로직이 라우트 핸들러에 직접 작성됨
- 단위 테스트 불가능 (HTTP 요청 없이 비즈니스 로직 테스트 불가)
- orders.ts(656줄), products.ts(611줄) 등 비대한 라우트 파일

> **Expert Note (Sam Newman)**: "서비스 레이어가 없다는 것은 단순히 코드 구조 문제가 아닙니다. 테스트 가능성, 트랜잭션 경계 관리, 에러 핸들링 일관성 모두에 영향을 미칩니다. Express 4의 async 핸들러 문제(R-5)도 서비스 레이어가 있었다면 자연스럽게 해결되었을 것입니다."

**프론트엔드: 컴포넌트 분리 부족**
- Admin 뷰들이 CRUD 전체를 단일 파일에 포함
- 폼/목록/모달을 하위 컴포넌트로 분리 필요
- 재사용 가능한 DataTable, FormModal 공통 컴포넌트 부재

### 4.3 Dead Code / Orphan 파일 (검증 완료)

| 파일 | 상태 | 검증 결과 |
|------|------|-----------|
| AdminView.vue (733줄) | **확인된 orphan** | 라우터 미등록, 소스 내 참조 0건 |
| CartView.vue (103줄) | **확인된 orphan** | `/cart` → `/menu` redirect만 존재, 컴포넌트 미로드 |
| LanguageSelectView.vue (43줄) | **확인된 orphan** | `/language` → `/` redirect만 존재, 컴포넌트 미로드 |
| OrdersView.vue (645줄) | **확인된 orphan (신규)** | 라우터 미등록, 소스 내 참조 0건 (최근 추가된 파일) |
| frontend/src/shared/ | **빈 디렉토리** | 파일 0개 확인 |

### 4.4 코드 중복 / DRY 위반 (검증 완료)

**`formatPrice` 19곳 중복 정의**

| 위치 | 형식 | 문제 |
|------|------|------|
| `utils/format.ts` (정규) | `"₩" + Intl.NumberFormat("ko-KR").format(price)` | 원화 기호 포함 |
| 18개 로컬 재정의 | `Intl.NumberFormat("ko-KR").format(price)` | **원화 기호 누락** |

로컬 재정의 위치: CartPanel, MenuGrid, OptionModal, CardPayment, CashPayment, PurchaseProductFormModal, DashboardView, InventoryAdjustView, OrdersView, ProductsView, PurchaseHistoryView, PurchaseProductsView, PurchaseRegisterView, SalesHistoryView, SalesRegisterView, StockMovementHistoryView, AdminView, CartView

**결과**: 정규 함수를 쓰는 뷰(CartSummary, CompleteView, OrderConfirmView, MenuView, PaymentView)에서는 `₩8,500`으로 표시되고, 로컬 재정의 뷰에서는 `8,500`으로 표시됨. **금액 표시 불일치**.

**`VITE_API_URL` 5곳 반복**

| 파일 | 용도 |
|------|------|
| services/api/client.ts:137 | HttpApiClient 팩토리 |
| services/api/client.ts:145 | apiClient 모듈 레벨 |
| stores/network.ts:4 | 네트워크 헬스체크 |
| utils/image.ts:1 | 이미지 URL 생성 |
| views/admin/ProductsView.vue:232 | 인라인 이미지 URL |

---

## 5. 테스트 인프라 (Critical Gap) - 변동 없음

### 5.1 현재 상태: **테스트 0건**

설치된 프레임워크:
- vitest@^1.4.0 (Backend & Frontend)
- @playwright/test@^1.42.1 (Frontend E2E)
- @vue/test-utils@^2.4.5 (Vue 컴포넌트)

**모두 설치만 되고 사용되지 않음**

> **Expert Note (Michael Nygard)**: "테스트 0건이라는 것은 모든 변경이 수동 검증에만 의존한다는 뜻입니다. OrdersView.vue가 라우터 등록 없이 커밋된 것도, formatPrice가 18곳에서 중복 정의된 것도, 자동화된 검증이 있었다면 방지할 수 있었습니다. 보안 취약점 수정 전에 테스트 인프라를 먼저 구축하는 것이 올바른 순서입니다."

### 5.2 권장 테스트 우선순위

**Tier 1: 즉시 필요 (결제/인증)**
1. `payment.service.ts` - 결제 처리 흐름
2. `auth.service.ts` - 토큰 생성/검증
3. `circuit-breaker.ts` - 장애 차단/복구 로직
4. `idempotency.service.ts` - 중복 결제 방지

**Tier 2: 핵심 비즈니스 (주문/상품)**
5. `orders.ts` - 주문 생성/상태 변경 + **가격 검증 로직 (S-7 수정 후)**
6. `products.ts` - 상품 CRUD + 캐시 무효화
7. `cart.ts` (Store) - 장바구니 로직
8. `productMatcher.ts` - 음성 주문 상품 매칭

**Tier 3: E2E (키오스크 플로우)**
9. 키오스크 전체 주문 플로우 (Welcome → Menu → Cart → Payment → Complete)
10. 오프라인 동기화 시나리오
11. 관리자 설정 변경 플로우

---

## 6. 성능 개선사항

### 6.1 N+1 쿼리 문제

```typescript
// 현재: 주문 목록 조회 시 각 주문의 아이템을 별도 쿼리
const orders = await prisma.order.findMany();
// N번 추가 쿼리 발생 가능

// 개선: include로 한번에 조회
const orders = await prisma.order.findMany({
  include: { orderItems: true, payment: true }
});
```

### 6.2 Redis `KEYS` 명령어 사용 (R-3)

```typescript
// 현재: KEYS 명령어로 전체 키스페이스 스캔 (O(N), 블로킹)
// cache.ts:141 - deletePattern()
const keys = await this.redis.keys(this.makeKey(pattern));
// cache.ts:210 - flushAll()
const keys = await this.redis.keys(`${this.prefix}*`);

// 개선: SCAN + DEL 커서 기반 비차단 삭제
async deletePattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;
  do {
    const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      deleted += await this.redis.del(...keys);
    }
  } while (cursor !== '0');
  return deleted;
}
```

### 6.3 Levenshtein 거리 계산

- `productMatcher.ts`에서 O(n*m) 동기 계산
- 상품 수 증가 시 UI 블로킹 가능
- Web Worker 또는 디바운싱 적용 권장

### 6.4 Electron Main Process 비대

- `main/index.ts`가 592줄로 과도하게 큼
- IPC 핸들러, STT 데몬 관리, 하드웨어 초기화, 윈도우 관리가 단일 파일에 혼재
- 모듈별 분리 필요 (ipc-handlers.ts, window-manager.ts, hardware-manager.ts, stt-daemon.ts)

---

## 7. TODO/미구현 항목

### 7.1 하드웨어 통합 (11개 TODO)

| 위치 | 내용 |
|------|------|
| van-terminal.ts:49 | 실제 시리얼 포트 연결 구현 |
| van-terminal.ts:87 | 실제 통신으로 교체 |
| van-terminal.ts:115 | 실제 취소 요청 구현 |
| escpos-printer.ts:81 | 실제 시리얼 포트 연결 |
| escpos-printer.ts:183 | 프린터 상태 조회 구현 |
| escpos-printer.ts:382 | EUC-KR 인코딩 처리 |
| escpos-printer.ts:410 | 시리얼 포트 데이터 전송 |
| usb-scanner.ts:171 | 실제 시리얼 포트 연결 |
| nice-payment.strategy.ts:45 | 실제 NICE VAN API 연동 |
| nice-payment.strategy.ts:144 | 실제 VAN API로 교체 |

### 7.2 기능 미구현

- 주방 디스플레이 실시간 연동 (WebSocket)
- 회원 포인트 적립/사용 완전 플로우
- 영수증 프린트 실제 동작
- 바코드 스캐너 실제 연동
- 재고 안전 수량 알림
- 통계 대시보드 차트
- 키오스크 음성주문 STT 실제 Whisper 연동 (Python 스크립트는 존재)

---

## 8. 프론트엔드 추가 발견사항 (검증 완료)

### 8.1 이중 API 클라이언트 (위험) - **검증: TRUE**

`services/api/client.ts`에 두 개의 독립 HTTP 구현이 공존:
1. `HttpApiClient` 클래스 (lines 27-130) - fetch 기반, **인증 헤더 없음**, 토큰 갱신 없음. `SyncManager`에서 사용.
2. `apiClient` 객체 (lines 312-332) - fetch 기반, 인증 헤더 있음, 401 자동 갱신. 모든 뷰/스토어에서 사용.

**실제 사용**: `services/index.ts`에서 `HttpApiClient`와 `createApiClient`만 re-export (apiClient는 re-export 안 됨).
**위험**: 두 클라이언트가 `VITE_API_URL`을 독립적으로 읽고, 타임아웃 등 설정이 상이.
**권장**: `HttpApiClient`에 인증 기능을 통합하거나, `apiClient`를 유일한 클라이언트로 통합.

### 8.2 `formatPrice` 19곳 중복 정의 - **검증: TRUE (상세 4.4절 참조)**

정규 함수와 로컬 재정의 간 **출력 불일치** 확인: `₩8,500` vs `8,500`

### 8.3 `VITE_API_URL` 5곳 반복 - **검증: TRUE (상세 4.4절 참조)**

### 8.4 하드코딩된 더미 상품 오프라인 fallback - **검증: TRUE**

`stores/products.ts`의 `getDefaultProducts()` (lines 135-237)가 **9개 하드코딩 더미 상품** + `getDefaultCategories()` (lines 122-130)가 **5개 더미 카테고리** 반환. API 실패 시 catch에서 호출됨.

**실제 영향**: 오프라인 또는 서버 오류 시 실제 매장 메뉴 대신 불고기버거/치킨버거 등 데모 메뉴가 키오스크에 표시됨.
**권장**: Dexie.js에서 캐시된 실제 상품 데이터를 우선 로드하고, 캐시도 없으면 "서버 연결 실패" 에러 메시지 표시.

### 8.5 접근성 누락: `role="radiogroup"` 미적용 - **검증: TRUE**

`OrderConfirmView.vue`에서 매장식사/포장 버튼이 `role="radio"` + `:aria-checked` 사용하나, 감싸는 `role="radiogroup"` 컨테이너 없음. WAI-ARIA 위반.

### 8.6 Auth Store에서 accessToken 공개 노출 - **검증: TRUE**

```typescript
// stores/auth.ts - return 객체
return {
  admin,
  accessToken,     // ref 직접 노출 - 읽기/쓰기 가능
  getAccessToken,  // getter 함수 - 읽기만 가능 (올바른 패턴)
};
```
추가 발견: `accessToken`과 `refreshToken`이 `localStorage`에도 저장됨 (lines 66-67). XSS 취약점과 결합 시 토큰 탈취 가능.

### 8.7 모듈 수준 싱글톤 composable 누수 - **검증: TRUE**

`useSTT.ts`에서:
- 모듈 수준에 8개 `ref` 선언 (lines 15-22) — 앱 생명주기 동안 영구 존재
- `setInterval(checkDaemonReady, 2000)` (line 70) — 모듈 로드 시 즉시 시작
- 타이머는 데몬 준비 완료 또는 90회(3분) 후에만 정리
- `onUnmounted` 훅 없음 — 컴포넌트 해제 시 정리 불가

---

## 9. 개선 로드맵 (Expert Panel 합의)

### Phase 0: 긴급 인프라 (선행 필수, 0.5일)

> **Expert Panel 합의**: "보안 패치를 하기 전에 테스트 인프라부터 구축해야 합니다. 보안 수정이 기존 기능을 깨뜨리지 않는지 검증할 방법이 없으면, 수정 자체가 새로운 위험이 됩니다."

1. Vitest 설정 파일 생성 (backend + frontend)
2. `express-async-errors` 패키지 설치 또는 `asyncHandler` 래퍼 작성 (R-5 해결)
3. 기본 CI 검증 스크립트 (lint + type-check)

### Phase 1: 보안 패치 + 테스트 (긴급, 3-5일)

**P0 Critical (즉시)**
1. 주문 가격 서버 검증 (S-7) + 단위 테스트
2. 주문 상태 변경에 `authenticate` 미들웨어 추가 (S-8)
3. 결제 API에 인증 미들웨어 추가 (S-10) — 키오스크 자체 토큰 발급 방식 검토
4. `?admin=true` 쿼리 파라미터를 `authenticate` + `authorize` 뒤에서만 허용 (S-11)
5. JWT Secret 환경변수 통합 + 시작 시 검증 (S-1, S-17)
6. CORS else 브랜치 수정 — `callback(new Error('Not allowed by CORS'))` (S-3)

**P0 High (1주 내)**
7. Refresh Token Redis 이전 (S-2)
8. 개발용 하드코딩 인증 제거 또는 `NODE_ENV=development` 엄격 검증 (S-6)
9. CSP 프로덕션 정책 수립 — 헤더 삭제 대신 적절한 CSP 주입 (S-4)
10. IPC 하드웨어 핸들러에 sender 검증 추가 (S-5)

### Phase 2: 코드 정리 + 테스트 확장 (1주)

1. Orphan 파일 정리: AdminView.vue, CartView.vue, LanguageSelectView.vue 삭제 / OrdersView.vue 라우터 등록 또는 삭제
2. `formatPrice` 18개 로컬 정의 제거 → `utils/format.ts` import 통일
3. `VITE_API_URL` → `config.ts` 단일 정의
4. `getDefaultProducts()` 더미 데이터 제거 → Dexie.js 캐시 우선 로드
5. 이중 API 클라이언트 통합
6. 핵심 서비스 단위 테스트 (payment, auth, circuit-breaker)

### Phase 3: 구조 리팩토링 (2주)

1. Backend Service Layer 추가 (orders → OrderService, products → ProductService)
2. DevicesView.vue 컴포넌트 분리 (2,276줄 → 탭별 컴포넌트)
3. ProductsView.vue 분리 (ProductForm + ProductList)
4. 공통 컴포넌트 추출 (DataTable, FormModal, ConfirmDialog)
5. Electron main/index.ts 모듈 분리
6. Redis KEYS → SCAN 전환 (R-3)
7. 주문번호 생성 DB 시퀀스 전환 (R-1)

### Phase 4: 기능 완성 (3주)

1. 하드웨어 인터페이스 실제 구현 (시리얼 포트)
2. VAN API 실제 연동 (NICE 우선)
3. 주방 디스플레이 WebSocket 연동
4. 영수증 프린트 구현
5. 음성 주문 STT 연동 완성
6. 통계 대시보드 차트 구현

---

## 10. 기술 부채 요약 (검증 후 업데이트)

| 카테고리 | 항목 수 | 심각도 | 변경 |
|----------|---------|--------|------|
| 보안 취약점 | **18개** (S-18 신규) | P0: 11, P1: 7 | **증가** (기존 10 → 18) |
| 안정성 이슈 | 5개 | P0: 2, P1: 3 | 변동 없음 |
| 거대 파일 | **9개** | P1 | **증가** (기존 7 → 9, main/index.ts + OrdersView 추가) |
| 테스트 부재 | 전체 | CRITICAL | 변동 없음 |
| Dead Code / Orphan | **5개** (뷰 4 + 빈 디렉토리 1) | P3 | **증가** (기존 4 → 5) |
| 코드 중복 (DRY 위반) | formatPrice 18곳 + VITE_API_URL 5곳 | P2 | **신규 항목** |
| 하드웨어 TODO | 11개 | P2 | 변동 없음 |
| N+1 쿼리 | 미확인 | P2 | 변동 없음 |
| 서비스 레이어 부재 | **12개 라우트** (14개 중) | P2 | **정확한 수치로 수정** |

---

## 11. Expert Panel 종합 평가

### Martin Fowler (Architecture Lead)
> "이 프로젝트의 아키텍처는 결제 시스템(Strategy Pattern)과 오프라인 우선 설계에서 매우 성숙한 판단을 보여줍니다. 그러나 그 외 영역은 '라우트에 모든 것을 넣는' 안티패턴에 빠져 있습니다. 가장 우려되는 것은 **코드가 계속 추가되고 있으나(OrdersView.vue 등) 구조적 부채는 축적만 되고 있다**는 점입니다. Phase 0(인프라)→Phase 1(보안)→Phase 3(리팩토링) 순서가 필수적입니다."

### Michael Nygard (Reliability)
> "POS 시스템은 **가용성과 데이터 무결성이 생명**입니다. 현재 상태에서 프로덕션 배포 시, 결제 무인증(S-10) + 가격 조작(S-7) + CORS 전체 허용(S-3)의 조합은 재무적 손실을 초래할 수 있습니다. 또한 Express 4 async 에러 미처리(R-5)는 프로세스 크래시로 이어질 수 있어, 키오스크가 '멈춤' 상태로 고객에게 노출될 위험이 있습니다."

### Sam Newman (Services)
> "서비스 레이어 부재는 이 코드베이스의 **확장성 천장**입니다. 현재 구조로는 단위 테스트가 사실상 불가능하고, 비즈니스 로직 재사용도 불가합니다. 예를 들어 주문 생성 로직을 키오스크와 POS에서 동시에 사용하려면, 현재는 orders.ts 라우트 핸들러를 호출해야 합니다. OrderService를 분리하면 두 진입점에서 동일 로직을 공유할 수 있습니다."

### Gregor Hohpe (Integration)
> "이중 API 클라이언트(HttpApiClient vs apiClient)는 전형적인 **우발적 복잡성**입니다. SyncManager용 클라이언트가 인증을 지원하지 않는다는 것은, 오프라인에서 온라인으로 동기화 시 인증 만료된 요청이 실패할 수 있다는 의미입니다. 단일 클라이언트로 통합하되, 인증 레이어를 옵셔널하게 설계하는 것이 바람직합니다."

---

## 12. 결론

POSON POS 키오스크 프로젝트는 **VB6 레거시(300K+ LOC)에서 현대적 스택(Electron + Vue 3 + Express)**으로의 마이그레이션이 상당히 진행된 상태입니다.

**강점**: Strategy Pattern, 오프라인 우선, 2계층 설정, 다국어, Redis 캐싱 등 아키텍처 설계가 우수합니다.

**최대 위험**: 보안 취약점 **18개 전체 미수정** (11개 Critical/High), 테스트 부재(0건), Express 4 async 에러 미처리가 프로덕션 배포의 가장 큰 장벽입니다.

**원본 대비 변경사항 요약**:
- 보안 점수: 78(B+) → **65(D)** — 전수 검증 결과 전체 미수정 확인
- 종합 점수: 69.7(C+) → **64.5(D+)**
- Frontend 뷰: 30개 → **32개** (Admin 22, Kiosk dir 2, Root 8)
- Backend 서비스: 7개 → **2개** (auth, payment만)
- Orphan 파일: 2~3개 → **4개** (OrdersView 신규 orphan 추가)
- 보안 취약점: 10개 → **18개** (P1 항목 재분류 + S-18 신규)
- S-4(CSP): 프로덕션에서 헤더 삭제로 **악화**
- S-5(IPC): env:get 화이트리스트 **부분 개선**
- 코드 중복 섹션 **신규 추가** (formatPrice 18곳, VITE_API_URL 5곳)

**권장 행동**: Phase 0(테스트 인프라) → Phase 1(보안 패치 + 테스트) → Phase 2(정리) → Phase 3(리팩토링) → Phase 4(기능 완성) 순서로 진행하는 것이 바람직합니다.
