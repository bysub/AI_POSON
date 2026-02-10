# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

POSON POS Self-Service Kiosk - VB6 레거시 키오스크 시스템(300K+ LOC, 152 폼, 12개 VAN)을 Electron + Vue 3로 마이그레이션하는 프로젝트.

- **Backend**: Express + TypeScript + Prisma + PostgreSQL + Redis (port 3000)
- **Frontend**: Electron + Vue 3 + Pinia + Tailwind CSS + Dexie.js
- **레거시 참조**: `prev_kiosk/POSON_SELF21` (VB6 원본), `.doc/` (분석 문서)

## 주요 명령어

### Backend (`cd backend`)

```bash
npm run dev                 # tsx watch (port 3000)
npm run build               # tsc 컴파일
npm run lint                # ESLint --fix
npm run test                # Vitest
npm run db:generate         # Prisma 클라이언트 생성
npm run db:push             # 스키마 변경 적용 (개발용)
npm run db:migrate          # 마이그레이션 생성/적용 (prisma migrate dev)
npm run db:studio           # Prisma Studio GUI
```

### Frontend (`cd frontend`)

```bash
npm run dev                 # Electron 개발 모드 (electron-vite)
npm run build:win           # Windows 패키징
npm run lint                # ESLint --fix
npm run type-check          # vue-tsc --noEmit
npm run test:unit           # Vitest
npm run test:e2e            # Playwright
```

## 아키텍처

### 모노레포 구조

```
backend/                    # Express API 서버
  src/
    routes/                 # 리소스별 라우트 (14개 모듈)
    middleware/              # auth, errorHandler
    services/               # payment/ (Strategy Pattern)
    utils/                  # cache, db, logger
  prisma/
    schema.prisma           # DB 스키마
    seed.ts                 # 시드 데이터
frontend/
  src/
    main/                   # Electron Main Process (하드웨어 접근)
    preload/                # contextBridge API 노출
    renderer/src/
      views/admin/          # 관리자 뷰 (~20개)
      views/kiosk/          # 키오스크 고객 뷰
      stores/               # Pinia (auth, cart, products, network, locale)
      services/api/         # apiClient (Axios + 토큰 자동 갱신)
      types/                # 백엔드 Prisma 스키마 미러링
      locales/              # i18n (ko, en, ja, zh)
```

### API 엔드포인트 (모두 `/api` 프리픽스)

| 경로                                 | 설명                           |
| ------------------------------------ | ------------------------------ |
| `/health`                            | 헬스체크                       |
| `/v1/auth`                           | login, refresh, logout, me     |
| `/v1/categories`                     | 카테고리 CRUD                  |
| `/v1/products`                       | 상품 CRUD + 옵션               |
| `/v1/orders`                         | 주문 CRUD + 통계               |
| `/v1/payments`                       | 결제 처리                      |
| `/v1/suppliers`                      | 거래처 관리                    |
| `/v1/purchases`                      | 매입 관리 (재고 자동 증감)     |
| `/v1/purchase-products`              | 매입상품 카탈로그 + sync-stock |
| `/v1/branches`                       | L/M/S 분류코드                 |
| `/v1/settings/:category`             | 매장 공통 설정 (SystemSetting) |
| `/v1/devices`                        | 기기 CRUD                      |
| `/v1/devices/:id/settings/:category` | 기기별 설정 (DeviceSetting)    |
| `/v1/admins`                         | 관리자 계정 관리               |
| `/v1/members`                        | 회원 관리                      |
| `/v1/uploads`                        | 파일 업로드                    |

### 인증

- JWT: accessToken(8h) + refreshToken(7d), in-memory 저장(서버 재시작 시 소멸)
- 미들웨어: `authenticate` (토큰 검증), `authorize(...roles)` (역할 체크)
- 역할: SUPER_ADMIN > ADMIN > MANAGER > STAFF
- 테스트 계정: `admin`/`admin123`, `manager`/`manager123`
- 프론트엔드 `apiClient`: 401 시 자동 토큰 갱신 후 재시도, 갱신 실패 시 로그아웃

### 2계층 설정 시스템

**매장 공통** (SettingsView → `SystemSetting` 테이블):

- 6개 카테고리: SALE, PAYMENT, PRINT, POINT, BARCODE, SYSTEM
- 키 포맷: `{prefix}.{key}` (예: `sale.maxPrice`, `point.selfSoundGuide`)
- API: `GET/PUT /api/v1/settings/:category`

**기기별** (DevicesView → `DeviceSetting` 테이블):

- 기기 유형: POS(2탭), KIOSK(8탭), KITCHEN(2탭)
- 키 포맷 동일: `{prefix}.{key}` (예: `terminal.posNo`, `van.vanSelect`)
- API: `GET/PUT /api/v1/devices/:id/settings/:category`
- `POSON_DEVICE_ID` 환경변수로 현재 기기 자동 식별

### 매입/재고 시스템

- 매입 생성 시 `PurchaseProduct.stock` 자동 증가 (`prisma.$transaction` + `increment`)
- 매입 취소 시 재고 자동 감소 (`decrement`)
- `POST /purchase-products/sync-stock`: 전체 재고 재계산 (매입 이력 기반)
- 매입 코드 자동 생성: `P{YYYYMMDD}{supplierId}-{seq}` 패턴

### VAN 결제 (Strategy Pattern)

```
PaymentService → NicePaymentStrategy | KiccPaymentStrategy | KisPaymentStrategy | SmartroPaymentStrategy
```

- CircuitBreaker: VAN 장애 시 자동 차단/복구
- IdempotencyService: 중복 결제 방지

## DB 스키마 핵심

- **Admin**: role(ADMIN|MANAGER|STAFF)
- **Product/Category**: 다국어 필드 (name, nameEn, nameJa, nameZh)
- **PurchaseProduct**: 매입상품 카탈로그 (stock, safeStock, L/M/S 분류코드)
- **Purchase/PurchaseItem**: 매입 주문 (status: DRAFT→CONFIRMED→CANCELLED)
- **Order/OrderItem**: 판매 주문 (PENDING→PAID→PREPARING→COMPLETED|CANCELLED)
- **Device/DeviceSetting**: 기기별 설정 (composite key: deviceId+key, cascade delete)
- **SystemSetting**: 매장 공통 설정 (key-value, category별 그룹)
- **LBranch/MBranch/SBranch**: 3단계 상품 분류 체계

## 코드 컨벤션

- **API 응답**: `{ success: boolean, data?: T, message?: string }` 일관된 포맷
- **에러 처리**: `AppError(statusCode, message, code)` → `next(new AppError(...))`
- **캐시**: Redis 기반, CUD 시 `invalidate*Cache()` 호출 필수, Redis 미연결 시 graceful fallback
- **캐시 키**: `CACHE_KEYS` 상수 사용 (`PRODUCTS`, `SUPPLIERS`, `BRANCHES_LARGE` 등)
- **Vue**: Composition API + `<script setup>`, Pinia 조합 패턴
- **DB 트랜잭션**: 재고 변경 등 다단계 작업은 `prisma.$transaction()` 필수
- **Validation**: Zod 스키마 (인증 라우트), 나머지는 수동 검증
- **환경변수**: backend `.env` (DB, Redis, JWT, CORS), frontend `.env` (VITE_API_URL 등)

## 관리자 페이지 접근

Welcome 화면에서 로고 5회 탭 → 로그인 → AdminLayout 대시보드

### Frontend 상태 관리 (Pinia)

- `useAuthStore`: 관리자 인증 상태
- `useCartStore`: 장바구니 + 주문 생성
- `useProductsStore`: 상품/카테고리 조회
- `useNetworkStore`: 온/오프라인 상태
- `useLocaleStore`: 다국어 (ko, en, ja, zh)

### 오프라인 우선 아키텍처

- Dexie.js + IndexedDB로 로컬 데이터 저장
- `SyncManager`: 온라인 복귀 시 자동 동기화
- 오프라인 시 현금 결제만 가능

### Electron IPC

- Main Process: 하드웨어 접근 (프린터, 스캐너, 카드 리더)
- Preload: contextBridge로 안전한 API 노출
- Renderer: Vue 앱 (nodeIntegration: false)

## DB 스키마 (Prisma)

핵심 모델: Category, Product, ProductOption, Order, OrderItem, Payment, Admin, Member, Kiosk

주문 상태: PENDING → PAID → PREPARING → COMPLETED | CANCELLED

## 캐싱 전략

Redis 기반 캐싱 (`cacheService`):

- 상품/카테고리: 5분 TTL
- 캐시 키: `CACHE_KEYS.PRODUCTS`, `CACHE_KEYS.CATEGORY(id)`
- CUD 작업 시 `invalidateProductCache()` 호출 필수

## 다국어 (i18n)

파일 위치: `frontend/src/renderer/src/locales/{ko,en,ja,zh}.json`

상품 테이블 다국어 필드: `name`, `nameEn`, `nameJa`, `nameZh`

## 관리자 페이지 접근

Welcome 화면에서 로고 5회 탭 → 로그인 → 관리자 대시보드

## 레거시 참조

`prev_kiosk/POSON_SELF21` - VB6 원본 코드 (마이그레이션 참조용)
`.doc/migration-plan-v2.md` - 전체 마이그레이션 계획
`.doc/asis/` - 레거시 시스템 분석 문서
