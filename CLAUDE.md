# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

POSON POS Self-Service Kiosk - VB6 레거시 키오스크 시스템을 Electron + Vue 3로 마이그레이션하는 프로젝트.

**현재 시스템**: VB6 (300K+ LOC, 26 모듈, 152 폼, 12개 VAN 연동)
**목표 시스템**: Electron + Vue 3 + Node.js + TypeScript + Tailwind CSS + PostgreSQL

## 주요 명령어

### Backend

```bash
cd backend
npm run dev                 # 개발 서버 (tsx watch, port 3000)
npm run db:generate         # Prisma 클라이언트 생성
npm run db:push             # 스키마 변경 적용 (개발용)
npm run db:migrate          # 마이그레이션 생성/적용
npm run db:seed             # 시드 데이터 (npx tsx prisma/seed.ts)
npm run db:studio           # Prisma Studio (GUI)
```

### Frontend

```bash
cd frontend
npm run dev                 # Electron 개발 모드
npm run build:win           # Windows 패키징
npm run lint                # ESLint
npm run type-check          # TypeScript 검사
```

## 아키텍처

### Backend API 구조

```
/api/health              # 헬스체크
/api/v1/auth/*           # 인증 (login, refresh, logout, me)
/api/v1/categories/*     # 카테고리 CRUD
/api/v1/products/*       # 상품 CRUD + 옵션 + 재고
/api/v1/orders/*         # 주문 CRUD + 통계
/api/v1/payments/*       # 결제 처리
```

### 인증 흐름

- JWT 기반 (accessToken + refreshToken)
- `authenticate` 미들웨어: 토큰 검증
- `authorize(...roles)` 미들웨어: 역할 기반 권한 (SUPER_ADMIN, ADMIN, MANAGER, STAFF)
- 테스트 계정: `admin` / `admin123`, `manager` / `manager123`

### VAN 결제 통합 (Strategy Pattern)

```
PaymentService
├── NicePaymentStrategy
├── KiccPaymentStrategy
├── KisPaymentStrategy
└── SmartroPaymentStrategy
```

- `CircuitBreaker`: VAN 장애 시 자동 차단/복구
- `RetryHandler`: VAN별 재시도 설정
- `IdempotencyService`: 중복 결제 방지

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
