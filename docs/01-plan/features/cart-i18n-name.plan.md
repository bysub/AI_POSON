# Plan: 장바구니 상품명 다국어 미적용 버그 수정

## 개요

키오스크에서 영어/일어/중국어 로케일로 전환해도 장바구니에 추가된 상품명이 항상 한글(`name`)로 표시되는 버그 수정.

## 현재 동작 (AS-IS)

### 문제 증상 (스크린샷 기반)

- 로케일: 영어 (UI 텍스트, 카테고리, 오버레이 모두 영어로 정상 표시)
- 상품 그리드: "Cheesecake" (영어 정상)
- **장바구니**: "치즈케이크" (한글 - 버그)
- **토스트 알림**: 한글 상품명 표시 (버그)

### 근본 원인

1. **CartItem 타입** (`types/index.ts:80-88`): `name` 필드만 존재, 다국어 필드 없음
2. **cart.ts:35**: `name: product.name` → 항상 한글 `name`만 저장
3. **표시 레이어**: `item.name`을 직접 사용, 로케일별 분기 없음

### 영향 받는 화면 (키오스크)

| 파일                   | 위치                       | 현재 코드                      |
| ---------------------- | -------------------------- | ------------------------------ |
| `MenuView.vue`         | 하단 주문 요약 (L568)      | `{{ item.name }}`              |
| `MenuView.vue`         | 토스트 알림 (L126)         | `showAddedToast(product.name)` |
| `CartView.vue`         | 장바구니 목록 (L47,54)     | `item.name`                    |
| `CartPanel.vue`        | 장바구니 패널 (L91,98,106) | `item.name`                    |
| `OrderConfirmView.vue` | 주문 확인 (L165)           | `item.name`                    |
| `PaymentView.vue`      | 결제 화면 (L254,261,266)   | `item.name`                    |

### 영향 받지 않는 화면 (관리자 - 한글 유지)

- OrdersView, SalesRegisterView, SalesHistoryView, StatsProductsView 등 → 관리자 화면은 한글 고정

## 요구사항 (TO-BE)

1. 장바구니에 추가 시 다국어 이름(`nameEn`, `nameJa`, `nameZh`)도 함께 저장
2. 키오스크 화면에서 장바구니 상품명을 현재 로케일에 맞게 표시
3. 로케일 전환 시 장바구니 상품명도 즉시 반영
4. 관리자 화면은 기존대로 한글 `name` 유지
5. 주문 서버 전송 시 `name`(한글)은 기존대로 유지 (서버 DB에는 한글 저장)

## 구현 계획

### Step 1: CartItem 타입 확장

- `types/index.ts` CartItem에 `nameEn?`, `nameJa?`, `nameZh?` 옵셔널 필드 추가

### Step 2: cart.ts addItem에서 다국어 필드 저장

- `product.nameEn`, `product.nameJa`, `product.nameZh`도 함께 저장

### Step 3: 로케일 기반 이름 반환 유틸리티 함수

- `getLocalizedCartItemName(item: CartItem, locale: string): string` 함수 추가
- 기존 `getLocalizedName` 패턴과 동일한 로직 (locale별 분기 + 한글 폴백)
- 위치: `utils/i18n.ts` 또는 cart 스토어 내부 getter

### Step 4: 키오스크 뷰 6곳 업데이트

- `item.name` → `getLocalizedCartItemName(item)` 변경
- 대상: MenuView, CartView, CartPanel, OrderConfirmView, PaymentView
- 토스트 알림도 로케일 기반 이름 사용

### Step 5: 주문 전송 유지

- `submitOrder`의 `name: item.name`은 한글 그대로 유지 (서버 DB 호환)

## 영향 범위

### 변경 파일 (7개)

| 파일                               | 변경 내용                                       |
| ---------------------------------- | ----------------------------------------------- |
| `types/index.ts`                   | CartItem에 `nameEn?`, `nameJa?`, `nameZh?` 추가 |
| `stores/cart.ts`                   | addItem에서 다국어 필드 저장                    |
| `utils/i18n.ts`                    | `getLocalizedCartItemName` 유틸 함수 (신규)     |
| `views/MenuView.vue`               | 주문요약 + 토스트에서 로케일 이름 사용          |
| `components/cart/CartPanel.vue`    | `item.name` → 로케일 이름                       |
| `views/CartView.vue`               | `item.name` → 로케일 이름                       |
| `views/kiosk/OrderConfirmView.vue` | `item.name` → 로케일 이름                       |
| `views/PaymentView.vue`            | `item.name` → 로케일 이름                       |

### 변경하지 않는 파일

- `backend/` - 서버 변경 없음
- 관리자 뷰 (OrdersView, SalesView 등) - 한글 유지
- DB 스키마 - 변경 없음

## 예상 작업량

- 타입/스토어/유틸: ~15줄
- 뷰 6곳: ~20줄 (import + 치환)
- 총: 소규모 (~35줄)

## 리스크

- 기존 장바구니 아이템(로케일 전환 전 추가된 것)은 다국어 필드가 없으므로 한글 폴백 → 문제 없음
- 주문 API 전송은 한글 `name` 유지하므로 서버 호환성 영향 없음
