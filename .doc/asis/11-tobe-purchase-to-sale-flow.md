# TOBE 매입~판매 비즈니스 플로우 분석

> **분석 기준**: 현재 개발된 Express + Vue 3 + Electron 시스템
> **분석일**: 2026-02-19
> **참조 포맷**: migration-plan-v2.md UC-001 Main Flow
> **ASIS 대조**: `.doc/asis/10-purchase-to-sale-flow.md`

---

## 1. 전체 비즈니스 사이클 개요

```
[거래처등록] → [매입상품등록] → [매입주문] → [상품등록] → [판매(키오스크)] → [결제] → [주문완료]
     │              │              │             │              │              │           │
     ▼              ▼              ▼             ▼              ▼              ▼           ▼
  Supplier    PurchaseProduct   Purchase     Product        CartStore    PaymentService  CompleteView
  (DB)        (카탈로그+재고)   (트랜잭션)   (다국어)       (Pinia)      (Strategy)     (30초복귀)
  S001~       stock±           StockMovement M:N Category   MenuView     VAN Failover   영수증출력
```

### 핵심 DB 모델 (PostgreSQL + Prisma)

| 모델              | 용도                     | PK        | 주요 관계                                                       |
| ----------------- | ------------------------ | --------- | --------------------------------------------------------------- |
| `Supplier`        | 거래처                   | id (auto) | → PurchaseProduct[], Purchase[]                                 |
| `PurchaseProduct` | 매입상품 카탈로그 + 재고 | id (auto) | → Supplier, Product[], PurchaseItem[], StockMovement[]          |
| `Purchase`        | 매입 주문                | id (auto) | → Supplier, PurchaseItem[]                                      |
| `PurchaseItem`    | 매입 상세                | id (auto) | → Purchase (CASCADE), PurchaseProduct                           |
| `Category`        | 카테고리                 | id (auto) | ↔ Product[] (M:N)                                               |
| `Product`         | 판매 상품                | id (auto) | → PurchaseProduct, ↔ Category[], → ProductOption[], OrderItem[] |
| `Order`           | 판매 주문                | id (UUID) | → OrderItem[], Payment[], Member                                |
| `OrderItem`       | 판매 상세                | id (auto) | → Order (CASCADE), Product                                      |
| `Payment`         | 결제                     | id (UUID) | → Order                                                         |
| `StockMovement`   | 재고 이동 이력           | id (auto) | → PurchaseProduct, Purchase?, Order?                            |
| `Member`          | 회원                     | id (auto) | → Order[]                                                       |

### ASIS vs TOBE 테이블 매핑

| ASIS (VB6)        | TOBE (Prisma)                 | 비고                             |
| ----------------- | ----------------------------- | -------------------------------- |
| `Office_Manage`   | `Supplier`                    | 거래처 코드 자동생성 (S001~)     |
| `Goods`           | `PurchaseProduct` + `Product` | 매입/판매 2계층 분리             |
| `InD_{YYYYMM}`    | `PurchaseItem`                | 월별 동적 → 단일 테이블          |
| `InT_{YYYYMM}`    | `Purchase`                    | 월별 동적 → 단일 테이블          |
| `LastSt_{YYYYMM}` | `PurchaseProduct.stock`       | 이월재고 → 실시간 재고           |
| `SaD_{YYYYMM}`    | `OrderItem`                   | 월별 동적 → 단일 테이블          |
| `SaT_{YYYYMM}`    | `Order`                       | 월별 동적 → 단일 테이블, UUID PK |
| `StSetD_{YYYYMM}` | `StockMovement`               | 재고조정 → 통합 이력             |
| `HOT_KEY`         | `Category` ↔ `Product` (M:N)  | 단축키 → 카테고리 기반           |
| N/A               | `StockMovement`               | **신규** - 모든 재고 변동 추적   |

---

## 2. 관리자 모드 (Admin Views)

### UC-T01: 거래처 등록 (Supplier Registration)

| 항목              | 내용                                   |
| ----------------- | -------------------------------------- |
| **Actor**         | 관리자 (ADMIN 이상)                    |
| **Precondition**  | 관리자 로그인 완료                     |
| **Postcondition** | 거래처 데이터 저장, 캐시 무효화        |
| **관련 View**     | `SuppliersView.vue` (/admin/suppliers) |
| **관련 API**      | `backend/src/routes/suppliers.ts`      |

**Main Flow:**

1. 관리자가 거래처 관리 화면(`SuppliersView`)을 연다
2. "거래처 추가" 버튼을 클릭한다
3. 등록 폼에 거래처 정보를 입력한다
   - 필수: 거래처명(name)
   - 선택: 유형(FOOD/BEVERAGE/SUPPLIES/PACKAGING/ETC), 사업자번호, 담당자, 연락처, 할인율
4. "저장" 버튼을 클릭한다
5. 프론트엔드가 `POST /api/v1/suppliers`를 호출한다
6. 백엔드가 사업자번호 중복을 확인한다 (`prisma.supplier.findUnique`)
7. 백엔드가 거래처 코드를 자동 생성한다 (`generateSupplierCode()` → S001, S002, ...)
8. 백엔드가 `prisma.supplier.create()`로 저장한다
9. Redis 캐시를 무효화한다 (`invalidateSupplierCache()`)
10. 프론트엔드 목록이 갱신된다

**Alternative Flow:**

| 단계 | 조건             | 대체 흐름                                        |
| ---- | ---------------- | ------------------------------------------------ |
| 6a   | 사업자번호 중복  | 409 Conflict, "이미 존재하는 사업자번호" 메시지  |
| 3a   | 거래처명 미입력  | 400 Bad Request, 필수 필드 안내                  |
| 10a  | 거래처 삭제 요청 | Soft Delete (isActive=false), 연관 매입상품 확인 |

---

### UC-T02: 매입상품 등록 (Purchase Product Catalog)

| 항목              | 내용                                                  |
| ----------------- | ----------------------------------------------------- |
| **Actor**         | 관리자 (ADMIN 이상)                                   |
| **Precondition**  | 거래처 등록 완료                                      |
| **Postcondition** | 매입상품 카탈로그 등록 (stock=0)                      |
| **관련 View**     | `PurchaseProductsView.vue` (/admin/purchase/products) |
| **관련 API**      | `backend/src/routes/purchase-products.ts`             |

**Main Flow:**

1. 관리자가 매입상품 관리 화면(`PurchaseProductsView`)을 연다
2. "상품 추가" 버튼을 클릭한다
3. 바코드를 스캔하거나 "다음 바코드" 버튼으로 자동 생성한다
   - `GET /api/v1/purchase-products/next-barcode`
   - 설정값: `barcode.barCodeLen`(기본 "95"), `barcode.scaleStartChar`, `barcode.scaleLen`
   - 일반상품: 12자리, 중량상품: 6자리
4. 상품 정보를 입력한다
   - 필수: 바코드, 상품명, 판매가, 상품구분(GENERAL/WEIGHT/ETC), 대분류코드(lCode), 세목(taxType)
   - 선택: 규격(spec), 매입원가, 부가세, 중분류(mCode), 소분류(sCode), 안전재고(safeStock)
   - 플래그: 매입사용, 주문사용, 판매사용, 재고관리
5. 거래처를 선택한다 (supplierId)
6. "저장" 버튼을 클릭한다
7. 프론트엔드가 `POST /api/v1/purchase-products`를 호출한다
8. 백엔드가 바코드 중복을 확인한다
9. 백엔드가 `prisma.purchaseProduct.create()`로 저장한다 (stock=0, safeStock=지정값)
10. 캐시를 무효화한다

**Alternative Flow:**

| 단계 | 조건             | 대체 흐름                                     |
| ---- | ---------------- | --------------------------------------------- |
| 3a   | 기존 바코드 존재 | 바코드 스캔 시 기존 상품 정보 표시, 수정 가능 |
| 8a   | 바코드 중복      | 400 Bad Request, "이미 등록된 바코드"         |

---

### UC-T03: 매입 주문 (Purchase Order)

| 항목              | 내용                                                     |
| ----------------- | -------------------------------------------------------- |
| **Actor**         | 관리자 (ADMIN 이상)                                      |
| **Precondition**  | 거래처 및 매입상품 등록 완료                             |
| **Postcondition** | 매입 데이터 저장, **재고 자동 증가**, StockMovement 기록 |
| **관련 View**     | `PurchaseRegisterView.vue` (/admin/purchase/register)    |
| **관련 API**      | `backend/src/routes/purchases.ts`                        |

**Main Flow:**

1. 관리자가 매입 등록 화면(`PurchaseRegisterView`)을 연다
2. 거래처를 선택한다 (드롭다운, `GET /api/v1/suppliers`)
3. 매입일자를 선택한다 (DatePicker, 기본값: 오늘)
4. 상품을 검색하여 추가한다 (이름/바코드 검색, computed 필터링)
   - 이미 추가된 상품이면 수량만 증가
5. 각 상품의 수량(quantity)과 단가(unitPrice)를 입력한다
   - 기본 단가: 매입상품의 costPrice
   - 금액 자동 계산: `amount = quantity × unitPrice`
6. 수량/단가 변경 시 합계가 실시간 업데이트된다
7. (선택) 메모를 입력한다
8. "저장" 버튼을 클릭한다
9. 프론트엔드가 `POST /api/v1/purchases`를 호출한다
10. 백엔드가 **트랜잭션 시작** (`prisma.$transaction()`):
    - a. 매입 코드를 자동 생성한다 (`P{YYYYMMDD}-{NNN}`, 예: P20260219-001)
    - b. `Purchase` 레코드를 생성한다 (status: CONFIRMED)
    - c. `PurchaseItem[]` 레코드를 생성한다
    - d. 각 항목에 대해 `PurchaseProduct.stock += quantity` (재고 증가)
    - e. 각 항목에 대해 `StockMovement` 기록 (type: PURCHASE_IN)
    - f. 부가세 계산 (포함: totalAmount/11, 별도: totalAmount×0.1)
11. 트랜잭션 커밋
12. 캐시를 무효화한다 (PURCHASES, PURCHASE_PRODUCTS)

**Alternative Flow:**

| 단계 | 조건                | 대체 흐름                                                                           |
| ---- | ------------------- | ----------------------------------------------------------------------------------- |
| 2a   | 거래처 미선택       | 저장 버튼 비활성화                                                                  |
| 4a   | 상품 검색 결과 없음 | "등록된 상품이 없습니다" 안내                                                       |
| 10a  | 매입 수정 (PATCH)   | 기존 항목 재고 차감(PURCHASE_CANCEL) → 삭제 → 새 항목 생성 → 재고 증가(PURCHASE_IN) |
| 10b  | 매입 취소 (DELETE)  | status→CANCELLED, 모든 항목 stock -= quantity, StockMovement(PURCHASE_CANCEL)       |

---

### UC-T04: 판매 상품 등록 (Product Registration)

| 항목              | 내용                                          |
| ----------------- | --------------------------------------------- |
| **Actor**         | 관리자 (ADMIN 이상)                           |
| **Precondition**  | 카테고리 생성 완료, (선택) 매입상품 등록 완료 |
| **Postcondition** | 판매 가능 상품 등록, 키오스크에 노출          |
| **관련 View**     | `ProductsView.vue` (/admin/products)          |
| **관련 API**      | `backend/src/routes/products.ts`              |

**Main Flow:**

1. 관리자가 상품 관리 화면(`ProductsView`)을 연다
2. "상품 추가" 버튼을 클릭한다
3. 매입상품 연결 여부를 선택한다
   - 연결: purchaseProductId 선택 → 바코드 자동 상속
   - 미연결: 바코드 수동 입력
4. 상품 정보를 입력한다
   - 필수: 상품명(name), 판매가(sellPrice), 카테고리(categoryIds[])
   - 다국어: nameEn, nameJa, nameZh
   - 선택: 할인가(discountPrice), 이미지(imageUrl), 설명(description)
   - 상태: SELLING(기본), SOLD_OUT, PENDING, HIDDEN
5. (선택) 상품 옵션을 추가한다 (예: 사이즈, 토핑)
   - 각 옵션: name, choices[{name, price}]
6. "저장" 버튼을 클릭한다
7. 프론트엔드가 `POST /api/v1/products`를 호출한다
8. 백엔드가 purchaseProductId 유효성을 확인한다
9. 백엔드가 카테고리 존재를 확인한다
10. 백엔드가 `prisma.product.create()`로 저장한다
    - categories M:N 연결
    - options 1:N 생성
11. 캐시를 무효화한다 (PRODUCTS, PRODUCTS_BY_CATEGORY)

**Alternative Flow:**

| 단계 | 조건                | 대체 흐름                                                      |
| ---- | ------------------- | -------------------------------------------------------------- |
| 3a   | 매입상품 미연결     | 재고 추적 불가, 바코드 수동 입력 필수                          |
| 4a   | 상품 상태 변경      | `PATCH /products/:id/status` → SELLING/SOLD_OUT/PENDING/HIDDEN |
| 5a   | 옵션 추가/수정/삭제 | `POST/PATCH/DELETE /products/:id/options/:optionId`            |

---

### UC-T05: 재고 현황 확인 (Inventory Status)

| 항목              | 내용                                                           |
| ----------------- | -------------------------------------------------------------- |
| **Actor**         | 관리자                                                         |
| **Precondition**  | 매입상품 및 매입 이력 존재                                     |
| **Postcondition** | N/A (조회 전용)                                                |
| **관련 View**     | `InventoryStatusView.vue` (/admin/inventory/status)            |
| **관련 API**      | `GET /api/v1/purchase-products`, `GET /api/v1/stock-movements` |

**Main Flow:**

1. 관리자가 재고 현황 화면(`InventoryStatusView`)을 연다
2. 시스템이 모든 매입상품을 조회한다 (`GET /api/v1/purchase-products`)
3. 요약 카드를 표시한다
   - 전체 상품 개수
   - 정상 재고 (stock > safeStock)
   - 낮은 재고 (0 < stock ≤ safeStock)
   - 품절 (stock ≤ 0)
   - 총 재고 가치 (sum: stock × costPrice)
4. 상품 테이블을 표시한다 (바코드, 상품명, 판매가, 매입가, 현재재고, 안전재고, 상태)
5. 관리자가 필터로 검색한다 (이름/바코드, 재고 상태: ALL/NORMAL/LOW/OUT)

**Alternative Flow:**

| 단계 | 조건           | 대체 흐름                                                          |
| ---- | -------------- | ------------------------------------------------------------------ |
| 5a   | 재고 수동 조정 | `POST /api/v1/stock-movements/adjust` → 일괄 조정 (트랜잭션)       |
| 5b   | 재고 동기화    | `POST /api/v1/purchase-products/sync-stock` → 매입이력 기반 재계산 |

**재고 상태 판단 로직:**

```typescript
function getStockStatus(product) {
  if (product.stock <= 0) return { label: "품절", class: "bg-red-100" };
  if (product.stock <= product.safeStock) return { label: "부족", class: "bg-amber-100" };
  return { label: "정상", class: "bg-green-100" };
}
```

---

### UC-T06: 매입 내역 조회 (Purchase History)

| 항목              | 내용                                                |
| ----------------- | --------------------------------------------------- |
| **Actor**         | 관리자                                              |
| **Precondition**  | 매입 이력 존재                                      |
| **Postcondition** | N/A (조회 전용)                                     |
| **관련 View**     | `PurchaseHistoryView.vue` (/admin/purchase/history) |
| **관련 API**      | `GET /api/v1/purchases`                             |

**Main Flow:**

1. 관리자가 매입 내역 화면(`PurchaseHistoryView`)을 연다
2. 기본 탭(날짜별)에서 매입 목록을 조회한다
3. 필터를 적용한다 (거래처, 상태: DRAFT/CONFIRMED/CANCELLED, 날짜 범위)
4. 매입 건을 클릭하면 상세 모달이 열린다 (항목 목록)
5. (선택) 거래처별 탭에서 거래처별 그룹핑 조회
6. (선택) 결제 탭에서 미결제/기결제 구분 조회

**Alternative Flow:**

| 단계 | 조건      | 대체 흐름                                       |
| ---- | --------- | ----------------------------------------------- |
| 4a   | 매입 취소 | `DELETE /api/v1/purchases/:id` → 재고 자동 감소 |

---

## 3. 키오스크 모드 (Kiosk Customer Flow)

### UC-K01: 키오스크 주문 (Kiosk Order)

| 항목              | 내용                                                            |
| ----------------- | --------------------------------------------------------------- |
| **Actor**         | 고객                                                            |
| **Precondition**  | 키오스크 메인 화면(WelcomeView) 표시, 상품/카테고리 등록 완료   |
| **Postcondition** | 주문 완료, **재고 자동 감소**, 30초 후 홈 자동 복귀             |
| **관련 View**     | WelcomeView → MenuView → PaymentView → CompleteView             |
| **관련 Store**    | useCartStore, useProductsStore, useNetworkStore, useLocaleStore |

**Main Flow:**

1. 고객이 WelcomeView에서 시작 버튼을 터치한다
2. (선택) 고객이 언어를 선택한다 (ko/en/ja/zh → `useLocaleStore`)
3. MenuView가 표시된다
   - `productsStore.initialize()` → `fetchCategories()` + `fetchProducts()`
   - `GET /api/v1/categories` + `GET /api/v1/products`
4. 고객이 좌측 사이드바에서 카테고리를 선택한다 (전체/개별)
   - `productsStore.selectCategory(categoryId)` → filteredProducts 업데이트
5. 고객이 상품을 터치한다
   - 품절/준비중(`SOLD_OUT`/`PENDING`) 상품은 오버레이 표시, 선택 불가
   - 재고 부족(stock ≤ 0) 상품도 선택 불가
6. (옵션 있는 경우) 옵션 선택 모달이 표시된다
   - 옵션 선택 후 가격 합산: `sellPrice + sum(option.price)`
7. 장바구니에 추가된다 (`cartStore.addItem()`)
   - 토스트 알림: "상품명이 장바구니에 추가되었습니다" (2.5초)
8. (반복) 3-7단계를 추가 상품에 대해 반복
   - 하단 푸터에 장바구니 요약 표시 (상품명, 수량 ±, 삭제, 합계)
9. 고객이 "결제하기" 버튼을 터치한다
   - 장바구니 비어있으면 버튼 비활성화
10. PaymentView가 표시된다
    - 주문 요약 카드 (상품 이미지, 명, 수량, 옵션)
    - 소계(subtotal) / 세금(10%) / 합계(total) 표시
11. 고객이 결제 수단을 선택한다
    - 신용카드 / 모바일 페이 / 현금 / 스캐너(준비중)
12. 고객이 "지금 결제하기" 버튼을 터치한다
13. 시스템이 **주문을 생성**한다 (`POST /api/v1/orders`)
    - **트랜잭션**: 주문번호 자동 생성 (YYMMDD-NNNN)
    - Order(status: PENDING) + OrderItem[] 생성
14. (카드 결제인 경우) 결제를 처리한다 (`POST /api/v1/payments`)
    - PaymentService → VAN 전략 선택 (NICE/KICC/KIS/SMARTRO)
    - 멱등성 체크 (idempotencyKey)
    - CircuitBreaker 상태 확인
    - Failover: 주 VAN 실패 시 차순위 VAN 자동 전환
15. (현금 결제인 경우) 현금 투입 후 거스름돈 계산
16. 결제 성공 시 **주문 상태 변경** (`PATCH /api/v1/orders/:id/status`)
    - status: PENDING → PAID
    - **트랜잭션**: `deductStockForOrder()` 호출
      - 각 OrderItem의 product.purchaseProductId 조회
      - `PurchaseProduct.stock -= quantity` (재고 감소)
      - `StockMovement` 기록 (type: SALE_OUT)
17. 장바구니를 초기화한다 (`cartStore.clear()`)
18. CompleteView가 표시된다
    - 주문번호 (큰 텍스트)
    - 카드: 승인번호 / 현금: 거스름돈
    - 영수증 출력 중 표시
    - 30초 카운트다운
19. 30초 후 자동으로 WelcomeView로 복귀한다
    - `localeStore.resetLocale()` → 언어 초기화

**Alternative Flow:**

| 단계 | 조건                   | 대체 흐름                                                            |
| ---- | ---------------------- | -------------------------------------------------------------------- |
| 5a   | 상품 품절 (SOLD_OUT)   | 반투명 오버레이 + "품절" 텍스트, 터치 무반응                         |
| 5b   | 상품 준비중 (PENDING)  | 반투명 오버레이 + "준비중" 텍스트, 터치 무반응                       |
| 5c   | 재고 0 (stock ≤ 0)     | 선택 불가 처리                                                       |
| 6a   | 옵션 없는 상품         | 모달 없이 바로 장바구니 추가                                         |
| 8a   | 장바구니에서 수량 변경 | 수량 ± 버튼, 0이면 자동 삭제                                         |
| 8b   | 주문 취소              | `cartStore.clear()` → WelcomeView 복귀                               |
| 11a  | 카드/모바일 + 오프라인 | "오프라인 상태입니다" 경고 토스트                                    |
| 11b  | 스캐너 결제 선택       | "준비 중입니다" 안내 토스트                                          |
| 14a  | VAN 타임아웃           | Failover → 차순위 VAN 자동 시도 (NICE→KICC→KIS)                      |
| 14b  | CircuitBreaker OPEN    | 해당 VAN 차단, 다른 VAN으로 자동 전환                                |
| 14c  | 결제 실패              | 에러 메시지 표시, 결제 수단 선택으로 복귀                            |
| 14d  | 중복 결제 요청         | idempotencyKey 체크 → 기존 결과 반환                                 |
| 16a  | 주문 취소 (결제 후)    | status→CANCELLED, `restoreStockForOrder()` → 재고 복구 (SALE_CANCEL) |
| 19a  | 수동 홈 복귀           | "홈으로 돌아가기" 버튼 터치                                          |

---

## 4. 상태 머신 (State Machines)

### 주문 상태 (Order Status)

```
PENDING (주문 생성)
   │
   ├──→ PAID (결제 완료)
   │       │  [재고 차감: deductStockForOrder()]
   │       │  [StockMovement: SALE_OUT]
   │       │
   │       ├──→ PREPARING (준비중)
   │       │       │
   │       │       ├──→ COMPLETED (완료)
   │       │       │       [completedAt 설정]
   │       │       │
   │       │       └──→ CANCELLED (취소)
   │       │               [재고 복구: restoreStockForOrder()]
   │       │               [StockMovement: SALE_CANCEL]
   │       │
   │       └──→ CANCELLED (취소)
   │               [재고 복구: restoreStockForOrder()]
   │               [StockMovement: SALE_CANCEL]
   │
   └──→ CANCELLED (취소)
           [재고 변동 없음 - PENDING에서는 재고 미차감]
```

### 매입 상태 (Purchase Status)

```
DRAFT (임시저장) ──┐
                   ├──→ CONFIRMED (확정)
                   │       [재고 증가: stock += quantity]
                   │       [StockMovement: PURCHASE_IN]
                   │       │
                   │       └──→ CANCELLED (취소)
                   │               [재고 감소: stock -= quantity]
                   │               [StockMovement: PURCHASE_CANCEL]
                   │
                   └──→ CANCELLED (취소)
                           [재고 변동 없음 - DRAFT에서는 재고 미증가]
```

### 결제 상태 (Payment Status)

```
PENDING ──→ APPROVED ──→ CANCELLED
                    └──→ REFUNDED
         └──→ FAILED
```

---

## 5. 재고 이동 추적 (StockMovement)

### 이동 유형별 흐름

| Type              | 트리거          | 수량 부호 | 호출 위치                          |
| ----------------- | --------------- | --------- | ---------------------------------- |
| `PURCHASE_IN`     | 매입 확정       | + (증가)  | `purchases.ts` POST/PATCH          |
| `PURCHASE_CANCEL` | 매입 취소/수정  | - (감소)  | `purchases.ts` DELETE/PATCH        |
| `SALE_OUT`        | 주문 결제(PAID) | - (감소)  | `orders.ts` deductStockForOrder()  |
| `SALE_CANCEL`     | 주문 취소       | + (증가)  | `orders.ts` restoreStockForOrder() |
| `ADJUSTMENT`      | 재고 수동 조정  | ±         | `stock-movements.ts` adjust        |
| `SYNC`            | 재고 동기화     | ±         | `purchase-products.ts` sync-stock  |

### StockMovement 기록 형식

```typescript
{
  purchaseProductId: number,    // 대상 매입상품
  type: "PURCHASE_IN" | "PURCHASE_CANCEL" | "SALE_OUT" | "SALE_CANCEL" | "ADJUSTMENT" | "SYNC",
  quantity: number,              // signed: +입고, -출고
  stockBefore: number,           // 변경 전 재고
  stockAfter: number,            // 변경 후 재고
  purchaseId?: number,           // 매입 관련 시
  orderId?: string,              // 판매 관련 시
  adjustmentCode?: string,       // 일괄 조정 시 (ADJ-YYYYMMDD-NNNN)
  reason?: string,               // 사유 (inventory_check, damage, gift, ...)
  memo?: string,
  createdBy?: string,
  createdAt: Date
}
```

---

## 6. 결제 시스템 (Payment Service)

### 아키텍처: Strategy Pattern + CircuitBreaker + Idempotency

```
클라이언트 (PaymentView)
    │
    ▼
POST /api/v1/payments
    │
    ▼
PaymentService
    ├── IdempotencyService (중복 결제 방지)
    │     └── idempotencyKey 체크 → 기존 결과 or 신규 처리
    │
    ├── processCardPayment()
    │     ├── NicePaymentStrategy   (NICE VAN)
    │     ├── KiccPaymentStrategy   (KICC)
    │     ├── KisPaymentStrategy    (KIS)
    │     └── SmartroPaymentStrategy (SMARTRO)
    │           └── CircuitBreaker (CLOSED → OPEN → HALF_OPEN)
    │
    └── processCashPayment() (로컬 처리)
```

### Failover 순서

```
Primary: NICE → Backup: KICC → KIS
  ├── SUCCESS → 결과 반환
  ├── RETRYABLE_ERROR → 다음 VAN 시도
  └── FAILURE → 즉시 에러 반환
```

### ASIS vs TOBE 결제 비교

| 항목       | ASIS (VB6)         | TOBE (Express)                |
| ---------- | ------------------ | ----------------------------- |
| VAN 수     | 12사 DLL 직접 호출 | 4사 Strategy Pattern          |
| 장애 대응  | 수동 VAN 변경      | CircuitBreaker 자동 차단/복구 |
| 중복 방지  | N/A                | idempotencyKey                |
| Failover   | N/A                | 자동 VAN 전환 (3단계)         |
| 현금영수증 | VAN DLL 호출       | (미구현)                      |

---

## 7. 캐싱 전략 (Redis)

### 캐시 키 맵핑

| 캐시 키                       | TTL  | 무효화 시점             |
| ----------------------------- | ---- | ----------------------- |
| `CATEGORIES`                  | 300s | 카테고리 CRUD           |
| `PRODUCTS`                    | 300s | 상품 CRUD, 상태변경     |
| `PRODUCTS_BY_CATEGORY(id)`    | 300s | 상품 CRUD               |
| `PRODUCT_BY_BARCODE(barcode)` | 300s | 상품 CRUD               |
| `SUPPLIERS`                   | 300s | 거래처 CRUD             |
| `PURCHASE_PRODUCTS`           | 300s | 매입상품 CRUD, 재고변동 |
| `PURCHASES`                   | 300s | 매입 CRUD               |
| `STOCK_MOVEMENTS`             | 300s | 재고 조정/동기화        |

### 캐시 무효화 규칙

```
매입 생성/수정/취소 → PURCHASES + PURCHASE_PRODUCTS + STOCK_MOVEMENTS
주문 결제(PAID)     → PURCHASE_PRODUCTS + STOCK_MOVEMENTS
주문 취소           → PURCHASE_PRODUCTS + STOCK_MOVEMENTS
상품 CRUD           → PRODUCTS + PRODUCTS_BY_CATEGORY + PRODUCT_BY_BARCODE
거래처 CRUD         → SUPPLIERS
재고 조정/동기화    → PURCHASE_PRODUCTS + STOCK_MOVEMENTS
```

---

## 8. 통합 시나리오: 완전한 Purchase-to-Sale Flow

### 시나리오: 거래처 등록 → 매입 → 상품 등록 → 키오스크 판매

```
┌─ 1단계: 거래처 등록 ─────────────────────────────────────────────┐
│ POST /api/v1/suppliers                                            │
│ Body: { name: "A식품", type: "FOOD" }                             │
│ Result: { id: 1, code: "S001" }                                   │
│ Cache: invalidateSupplierCache()                                  │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 2단계: 매입상품 등록 ───────────────────────────────────────────┐
│ GET /api/v1/purchase-products/next-barcode                        │
│ Result: { barcode: "950001" }                                     │
│                                                                   │
│ POST /api/v1/purchase-products                                    │
│ Body: { barcode: "950001", name: "불고기", sellPrice: 10000,      │
│         costPrice: 5000, supplierId: 1, lCode: "01",              │
│         productType: "GENERAL", taxType: "TAXABLE" }              │
│ Result: { id: 100, stock: 0, safeStock: 10 }                     │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 3단계: 매입 주문 ──────────────────────────────────── [트랜잭션] ┐
│ POST /api/v1/purchases                                            │
│ Body: { supplierId: 1, purchaseDate: "2026-02-19",                │
│         items: [{ purchaseProductId: 100, quantity: 50,            │
│                   unitPrice: 5000, sellPrice: 10000 }],            │
│         taxIncluded: true }                                       │
│                                                                   │
│ Transaction:                                                      │
│   ① Purchase 생성 (purchaseCode: "P20260219-001", CONFIRMED)      │
│   ② PurchaseItem 생성                                              │
│   ③ PurchaseProduct.stock: 0 → 50                                 │
│   ④ StockMovement: { type: PURCHASE_IN, qty: +50,                 │
│                       stockBefore: 0, stockAfter: 50 }            │
│                                                                   │
│ Result: { id: 1, purchaseCode: "P20260219-001",                   │
│           totalAmount: 250000, taxAmount: 22727 }                 │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 4단계: 카테고리 + 판매상품 등록 ────────────────────────────────┐
│ POST /api/v1/categories                                           │
│ Body: { name: "메인메뉴", nameEn: "Main" }                        │
│ Result: { id: 50 }                                                │
│                                                                   │
│ POST /api/v1/products                                             │
│ Body: { purchaseProductId: 100, name: "불고기버거",                │
│         nameEn: "Bulgogi Burger", sellPrice: 10000,                │
│         categoryIds: [50], status: "SELLING" }                    │
│ Result: { id: 1, barcode: "950001" (매입상품에서 자동 상속) }      │
│ Cache: invalidateProductCache()                                   │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 5단계: 키오스크 주문 ──────────────────────────────── [트랜잭션] ┐
│ POST /api/v1/orders                                               │
│ Body: { items: [{ productId: 1, name: "불고기버거",                │
│                   price: 10000, quantity: 3 }],                    │
│         kioskId: "KIOSK-01", orderType: "TAKEOUT" }               │
│                                                                   │
│ Transaction:                                                      │
│   ① 주문번호 생성: "260219-0001"                                   │
│   ② Order 생성 (id: uuid-xxx, status: PENDING)                    │
│   ③ OrderItem 생성 (productId: 1, qty: 3)                         │
│   ※ 재고 아직 미차감 (PENDING 상태)                                │
│                                                                   │
│ Result: { id: "uuid-xxx", orderNumber: "260219-0001",             │
│           totalAmount: 30000, status: "PENDING" }                 │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 6단계: 결제 처리 ───────────────────────────────────────────────┐
│ POST /api/v1/payments                                             │
│ Body: { orderId: "uuid-xxx", amount: 30000,                       │
│         paymentType: "CARD", vanCode: "NICE",                     │
│         idempotencyKey: "key-001" }                               │
│                                                                   │
│ PaymentService:                                                   │
│   ① 멱등성 체크: key-001 → 신규                                    │
│   ② NicePaymentStrategy → CircuitBreaker: CLOSED                 │
│   ③ VAN authorize() → 성공                                        │
│   ④ Payment 생성 (status: APPROVED, approvalNumber: "123456")     │
│   ⑤ 멱등성 결과 저장                                              │
│                                                                   │
│ Result: { transactionId: "NICE-xxx", approvalNumber: "123456" }   │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 7단계: 주문 상태 변경 (결제 완료) ──────────────────── [트랜잭션] ┐
│ PATCH /api/v1/orders/uuid-xxx/status                               │
│ Body: { status: "PAID" }                                           │
│                                                                    │
│ Transaction:                                                       │
│   ① deductStockForOrder():                                         │
│      - OrderItem 조회 (product.purchaseProductId: 100)             │
│      - PurchaseProduct.stock: 50 → 47                              │
│      - StockMovement: { type: SALE_OUT, qty: -3,                   │
│                          stockBefore: 50, stockAfter: 47 }         │
│   ② order.status: PENDING → PAID                                  │
│                                                                    │
│ Cache: invalidate(PURCHASE_PRODUCTS, STOCK_MOVEMENTS)              │
│ Result: { status: "PAID" }                                         │
└────────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 8단계: 주문 완료 ───────────────────────────────────────────────┐
│ PATCH /api/v1/orders/uuid-xxx/status                              │
│ Body: { status: "COMPLETED" }                                     │
│                                                                   │
│ Result: { status: "COMPLETED", completedAt: "2026-02-19T..." }    │
│ ※ 재고 추가 처리 없음 (PAID에서 이미 차감됨)                      │
└───────────────────────────────────────────────────────────────────┘
                               ▼
┌─ 확인: 최종 재고 상태 ──────────────────────────────────────────┐
│ GET /api/v1/stock-movements?productId=100                         │
│                                                                   │
│ Result:                                                           │
│ ┌──────────────────┬───────┬──────────┬───────────┐              │
│ │ type             │ qty   │ before   │ after     │              │
│ ├──────────────────┼───────┼──────────┼───────────┤              │
│ │ PURCHASE_IN      │ +50   │ 0        │ 50        │              │
│ │ SALE_OUT         │ -3    │ 50       │ 47        │              │
│ └──────────────────┴───────┴──────────┴───────────┘              │
│                                                                   │
│ 현재 재고: 47 / 안전재고: 10 → 상태: 정상 ✅                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 9. 다국어 지원 (i18n)

### 지원 언어

| 코드 | 언어          | 파일              |
| ---- | ------------- | ----------------- |
| `ko` | 한국어 (기본) | `locales/ko.json` |
| `en` | 영어          | `locales/en.json` |
| `ja` | 일본어        | `locales/ja.json` |
| `zh` | 중국어        | `locales/zh.json` |

### 다국어 필드 (Product, Category)

```typescript
// DB 모델: 4개 언어 필드
Product: {
  (name, nameEn, nameJa, nameZh);
}
Category: {
  (name, nameEn, nameJa, nameZh);
}

// 프론트엔드: 현재 로캘 기반 이름 반환
function getLocalizedName(item): string {
  switch (locale.value) {
    case "en":
      return item.nameEn || item.name;
    case "ja":
      return item.nameJa || item.name;
    case "zh":
      return item.nameZh || item.name;
    default:
      return item.name;
  }
}
```

---

## 10. 오프라인 지원

### 온라인 vs 오프라인 동작

| 기능        | 온라인           | 오프라인                               |
| ----------- | ---------------- | -------------------------------------- |
| 상품 조회   | API + Redis 캐시 | IndexedDB (Dexie.js)                   |
| 카드 결제   | VAN 전략 패턴    | **불가** (경고 표시)                   |
| 모바일 결제 | VAN 전략 패턴    | **불가** (경고 표시)                   |
| 현금 결제   | API → Order 생성 | **가능** (로컬 저장)                   |
| 주문 동기화 | 실시간           | 온라인 복귀 시 SyncManager 자동 동기화 |
| 재고 확인   | 실시간           | 마지막 동기화 데이터                   |

---

## 11. 핵심 API 엔드포인트 요약

| HTTP       | 경로                                     | 설명                    | 재고 영향              | 트랜잭션 |
| ---------- | ---------------------------------------- | ----------------------- | ---------------------- | -------- |
| POST       | `/api/v1/suppliers`                      | 거래처 등록             | -                      | -        |
| POST       | `/api/v1/purchase-products`              | 매입상품 등록           | stock=0 초기화         | -        |
| GET        | `/api/v1/purchase-products/next-barcode` | 다음 바코드 생성        | -                      | -        |
| **POST**   | **`/api/v1/purchases`**                  | **매입 생성**           | **stock += qty**       | **O**    |
| **PATCH**  | **`/api/v1/purchases/:id`**              | **매입 수정**           | **stock -/+ (재조정)** | **O**    |
| **DELETE** | **`/api/v1/purchases/:id`**              | **매입 취소**           | **stock -= qty**       | **O**    |
| POST       | `/api/v1/purchase-products/sync-stock`   | 재고 동기화             | stock 재계산           | **O**    |
| POST       | `/api/v1/products`                       | 판매 상품 등록          | -                      | -        |
| PATCH      | `/api/v1/products/:id/status`            | 상품 상태 변경          | -                      | -        |
| **POST**   | **`/api/v1/orders`**                     | **주문 생성**           | - (PENDING)            | **O**    |
| **PATCH**  | **`/api/v1/orders/:id/status`**          | **주문 상태→PAID**      | **stock -= qty**       | **O**    |
| **PATCH**  | **`/api/v1/orders/:id/status`**          | **주문 상태→CANCELLED** | **stock += qty**       | **O**    |
| POST       | `/api/v1/payments`                       | 결제 처리               | -                      | -        |
| POST       | `/api/v1/stock-movements/adjust`         | 재고 수동 조정          | stock ±                | **O**    |

---

## 12. ASIS vs TOBE 아키텍처 비교

| 항목          | ASIS (VB6)                                   | TOBE (Express + Vue 3)                                                           |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| **DB**        | MS-SQL, 월별 동적 테이블 (SaT/InD\_{YYYYMM}) | PostgreSQL, 단일 테이블 + Prisma ORM                                             |
| **재고**      | 이월재고 테이블 (LastSt\_{YYYYMM})           | PurchaseProduct.stock 실시간 + StockMovement 이력                                |
| **코드 생성** | 사용자 수동 입력                             | 자동 생성 (S001, P20260219-001, 260219-0001, ADJ-...)                            |
| **VAN**       | 12사 DLL 직접 호출                           | 4사 Strategy + CircuitBreaker + Failover                                         |
| **결제 안전** | N/A                                          | idempotencyKey 멱등성 보장                                                       |
| **모드 전환** | C_Config.Self_YN ("0"=POS, "1"=셀프)         | Device 모델 + 기기 유형 (POS/KIOSK/KITCHEN)                                      |
| **다국어**    | N/A                                          | 4개 언어 (ko/en/ja/zh), DB 필드 + i18n                                           |
| **캐시**      | N/A                                          | Redis 5분 TTL + CUD 무효화                                                       |
| **오프라인**  | N/A                                          | IndexedDB + SyncManager                                                          |
| **트랜잭션**  | ADO 수동 관리                                | Prisma $transaction() 자동 관리                                                  |
| **상태 추적** | 단순 플래그                                  | 상태 머신 (PENDING→PAID→PREPARING→COMPLETED)                                     |
| **재고 추적** | 단순 증감                                    | StockMovement 6가지 타입 (PURCHASE_IN/CANCEL, SALE_OUT/CANCEL, ADJUSTMENT, SYNC) |
| **인증**      | 관리자 레벨 (Admin_Gubun)                    | JWT + 역할 (SUPER_ADMIN/ADMIN/MANAGER/STAFF)                                     |
| **API 구조**  | 폼 직접 DB 접근                              | RESTful API + 표준 응답 포맷                                                     |
| **설정**      | INI 파일 + DB POS_Set                        | 2계층: SystemSetting(공통) + DeviceSetting(기기별)                               |

---

> **파일 참조**
>
> | 컴포넌트       | 파일 경로                                                        |
> | -------------- | ---------------------------------------------------------------- |
> | 거래처 API     | `backend/src/routes/suppliers.ts`                                |
> | 매입상품 API   | `backend/src/routes/purchase-products.ts`                        |
> | 매입 API       | `backend/src/routes/purchases.ts`                                |
> | 상품 API       | `backend/src/routes/products.ts`                                 |
> | 카테고리 API   | `backend/src/routes/categories.ts`                               |
> | 주문 API       | `backend/src/routes/orders.ts`                                   |
> | 결제 API       | `backend/src/routes/payments.ts`                                 |
> | 재고 이동 API  | `backend/src/routes/stock-movements.ts`                          |
> | 회원 API       | `backend/src/routes/members.ts`                                  |
> | DB 스키마      | `backend/prisma/schema.prisma`                                   |
> | 거래처 View    | `frontend/src/renderer/src/views/admin/SuppliersView.vue`        |
> | 매입상품 View  | `frontend/src/renderer/src/views/admin/PurchaseProductsView.vue` |
> | 매입등록 View  | `frontend/src/renderer/src/views/admin/PurchaseRegisterView.vue` |
> | 매입내역 View  | `frontend/src/renderer/src/views/admin/PurchaseHistoryView.vue`  |
> | 재고현황 View  | `frontend/src/renderer/src/views/admin/InventoryStatusView.vue`  |
> | 상품관리 View  | `frontend/src/renderer/src/views/admin/ProductsView.vue`         |
> | 메뉴 View      | `frontend/src/renderer/src/views/MenuView.vue`                   |
> | 결제 View      | `frontend/src/renderer/src/views/PaymentView.vue`                |
> | 완료 View      | `frontend/src/renderer/src/views/CompleteView.vue`               |
> | Cart Store     | `frontend/src/renderer/src/stores/cart.ts`                       |
> | Products Store | `frontend/src/renderer/src/stores/products.ts`                   |
