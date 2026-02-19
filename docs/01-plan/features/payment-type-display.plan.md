# Plan: 매출내역/주문상세에 결제유형 표시

## 개요

매출내역(SalesHistoryView) 테이블과 주문상세(OrdersView) 모달에 결제유형(카드/현금/복합)을 표시한다.
현재 결제 정보(Payment)는 DB/API에 이미 존재하지만, 프론트엔드에서 충분히 활용되지 않고 있다.

## 현재 동작 (AS-IS)

### DB 스키마

- `Payment` 모델: `paymentType` 필드 (PaymentType enum: CARD, CASH, MIXED)
- `Order` → `Payment` (1:N 관계)
- 백엔드 API(`GET /api/v1/orders`)에서 `include: { payments: true }` 로 결제 정보 포함하여 반환

### SalesHistoryView.vue (매출내역)

- **테이블 컬럼**: 주문번호, 일시, 유형(매장/포장), 상품수, 금액, 상태 — **결제유형 컬럼 없음**
- Payment 인터페이스에 `method` 필드로 정의 (DB의 `paymentType`에 매핑)
- 주문 상세 모달에서는 결제 정보(수단, 상태, 금액) 표시 중
- `getPaymentMethodLabel()` 함수 이미 존재 (CARD→카드, CASH→현금, MIXED→복합결제)

### OrdersView.vue (주문내역)

- Order 인터페이스에 `payments` 필드 **없음**
- 주문 상세 모달에 결제 정보 섹션 **없음** (상품 목록 + 총액만 표시)
- 상태 변경/취소 액션만 존재

### 백엔드 API (orders.ts)

- `GET /api/v1/orders` (목록): `include: { items, payments }` → 결제 데이터 이미 반환 중
- `GET /api/v1/orders/:id` (상세): `include: { items, payments }` → 결제 데이터 이미 반환 중
- **백엔드 수정 불필요** — 이미 `payments` 배열이 응답에 포함됨

## 변경 목표 (TO-BE)

### 1. SalesHistoryView.vue — 결제유형 컬럼 추가

- 테이블에 "결제유형" 컬럼 추가 (상품수 뒤, 금액 앞)
- 결제유형 표시: payments 배열의 첫번째 항목의 paymentType 기준
  - CARD → "카드" (파란 뱃지)
  - CASH → "현금" (초록 뱃지)
  - MIXED → "복합" (보라 뱃지)
  - 결제 없음 → "-"
- Payment 인터페이스의 `method` 필드명을 `paymentType`으로 수정 (DB 필드명 일치)

### 2. OrdersView.vue — 결제 정보 섹션 추가

- Order 인터페이스에 `payments` 필드 추가
- 주문 목록 카드에 결제유형 뱃지 표시
- 주문 상세 모달에 "결제 정보" 섹션 추가 (SalesHistoryView 모달과 동일 패턴)
  - 결제수단, 상태(승인/취소/대기), 금액 표시
  - 승인번호(approvalNumber) 표시 (있는 경우)

## 영향 범위

### 수정 파일 (프론트엔드만)

| 파일                   | 변경 내용                                               |
| ---------------------- | ------------------------------------------------------- |
| `SalesHistoryView.vue` | 테이블 컬럼 추가, Payment.method → paymentType          |
| `OrdersView.vue`       | Payment 인터페이스 추가, 목록 뱃지, 상세 모달 결제 섹션 |

### 수정 불필요

- **백엔드**: 이미 payments 포함하여 응답 중
- **DB 스키마**: 변경 없음
- **기타 뷰**: 영향 없음

## 구현 순서

1. SalesHistoryView.vue - Payment 인터페이스 필드명 수정 (`method` → `paymentType`)
2. SalesHistoryView.vue - 테이블에 결제유형 컬럼 + 뱃지 스타일 추가
3. OrdersView.vue - Order 인터페이스에 payments 추가 + Payment 인터페이스 정의
4. OrdersView.vue - 주문 카드에 결제유형 뱃지 표시
5. OrdersView.vue - 상세 모달에 결제 정보 섹션 추가

## 예상 작업량

- 프론트엔드 2개 파일 수정
- 백엔드 변경 없음
- 소규모 UI 변경 (약 50줄 추가/수정)
