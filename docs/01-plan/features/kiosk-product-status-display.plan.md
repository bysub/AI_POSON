# Plan: 키오스크 상품 판매상태 표시

## 개요

키오스크 메뉴 화면에서 품절(SOLD_OUT)/판매대기(PENDING) 상품이 현재 완전히 숨겨지는 문제 수정.
해당 상품들도 화면에 보이되, 판매상태를 시각적으로 표시하고 장바구니 추가를 차단한다.

## 현재 동작 (AS-IS)

### 백엔드

- `GET /api/v1/products/kiosk` (라인 83-86): `status: "SELLING"` 필터 → 판매중 상품만 반환
- `GET /api/v1/products/kiosk/category/:id` (라인 83-86): 동일 필터
- HIDDEN 상태 상품은 계속 숨겨야 함 (의도적 비노출)

### 프론트엔드

- `MenuGrid.vue`: `isSoldOut()` 함수가 SOLD_OUT + 재고 0만 체크
- `MenuView.vue`: 동일한 `isSoldOut()` 로직
- PENDING(판매대기) 상태는 프론트엔드에서 별도 처리 없음 (API에서 이미 필터됨)

### ProductStatus enum

```
SELLING   - 판매중 (정상 판매)
SOLD_OUT  - 품절 (재고 소진)
PENDING   - 판매대기 (아직 판매 시작 전)
HIDDEN    - 숨김 (의도적 비노출, 키오스크에서 계속 숨김)
```

## 요구사항 (TO-BE)

### 기능 요구사항

1. **SOLD_OUT/PENDING 상품 표시**: 키오스크 메뉴에 보이되, 판매상태를 시각적으로 표시
2. **장바구니 추가 차단**: SOLD_OUT/PENDING 상품은 클릭해도 장바구니에 추가 불가
3. **HIDDEN 유지**: HIDDEN 상태 상품은 이전과 동일하게 키오스크에서 미노출
4. **상태별 시각 피드백**:
   - SOLD_OUT: "품절" 오버레이 (기존 디자인 유지)
   - PENDING: "준비중" 오버레이 (신규)
5. **관리자 화면 무관**: 관리자 상품 목록은 현재 동작 유지

### 비기능 요구사항

- 캐시 키가 변경되므로 기존 캐시 무효화 필요
- 상품 상태 변경 시 캐시 갱신은 기존 `invalidateProductCache()` 로직 유지

## 영향 범위

### 백엔드 (1개 파일)

| 파일                             | 변경 내용                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `backend/src/routes/products.ts` | 키오스크 API 필터: `status: "SELLING"` → `status: { in: ["SELLING", "SOLD_OUT", "PENDING"] }` |

### 프론트엔드 (2개 파일)

| 파일                                                     | 변경 내용                                          |
| -------------------------------------------------------- | -------------------------------------------------- |
| `frontend/src/renderer/src/components/menu/MenuGrid.vue` | `isUnavailable()` 함수 추가, PENDING 오버레이 추가 |
| `frontend/src/renderer/src/views/MenuView.vue`           | `isSoldOut()` → `isUnavailable()` 로 로직 확장     |

### 변경하지 않는 파일

- `backend/prisma/schema.prisma` - 스키마 변경 없음
- 관리자 뷰 - 기존 동작 유지
- CartPanel, CartView, PaymentView - 장바구니 추가 자체가 차단되므로 변경 불필요

## 구현 계획

### Step 1: 백엔드 API 수정

- `products.ts` 키오스크 엔드포인트의 `status: "SELLING"` → `status: { in: ["SELLING", "SOLD_OUT", "PENDING"] }` 변경
- HIDDEN은 여전히 제외

### Step 2: 프론트엔드 MenuGrid.vue 수정

- `isSoldOut()` → `isUnavailable()` 확장 (SOLD_OUT + PENDING + 재고 0)
- PENDING 상태 전용 오버레이 추가 ("준비중" 텍스트)
- 기존 SOLD_OUT 오버레이 유지

### Step 3: 프론트엔드 MenuView.vue 수정

- `isSoldOut()` → `isUnavailable()` 로 동일하게 확장
- `handleAddToCart()`에서 PENDING 상태도 차단

## 예상 작업량

- 백엔드: 1줄 변경
- 프론트엔드: ~20줄 변경
- 총 예상: 소규모 변경

## 리스크

- 캐시: 기존 키오스크 상품 캐시에 SELLING 상품만 있으므로, 배포 후 캐시 자동 갱신(TTL 만료) 또는 수동 무효화 필요
- 카테고리별 캐시도 동일하게 영향받음
