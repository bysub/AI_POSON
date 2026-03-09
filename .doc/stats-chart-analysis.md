# 관리자 통계관리 차트 도입 분석

## 1. 현재 상태 (AS-IS)

### 통계관리 메뉴 구조 (3개)

| 메뉴 | 파일 | 줄 수 | 현재 상태 |
|------|------|-------|----------|
| 매입통계 | `StatsPurchaseView.vue` | 323줄 | 요약카드 3개 + 테이블 |
| 매출통계 | `StatsSalesView.vue` | 306줄 | 요약카드 4개 + 테이블 |
| 상품통계 | `StatsProductsView.vue` | 376줄 | 베스트셀러 TOP10 + 테이블 |

### 공통 특징

- 기간 선택: 주간/월간/연간 버튼 + 커스텀 날짜 입력
- 차트 없음 — 전부 테이블/리스트 기반
- 차트 라이브러리 미설치 (package.json에 chart 관련 패키지 없음)

### 백엔드 API 현황

| API | 용도 | 반환 데이터 |
|-----|------|------------|
| `GET /orders?startDate&endDate&status` | 주문 목록 | 주문 배열 |
| `GET /orders/stats/summary` | 매출 요약 | totalOrders, completedOrders, totalRevenue, statusBreakdown |
| `GET /orders/stats/daily?days` | 일별 매출 | [{date, count, revenue}] |
| `GET /purchases?startDate&endDate` | 매입 목록 | 매입 배열 |
| `GET /purchases/stats/summary` | 매입 요약 | totalAmount, count, avgAmount |
| `GET /products?admin=true` | 상품 목록 | 상품 배열 (카테고리 포함) |

---

## 2. 차트 라이브러리 선택

| 후보 | 장점 | 단점 |
|------|------|------|
| **Chart.js + vue-chartjs** | 가볍고 (45KB), Vue 전용 래퍼 있음, 학습곡선 낮음 | 복잡한 인터랙션 제한 |
| **ECharts + vue-echarts** | 풍부한 차트 종류, 대시보드에 강함 | 번들 크기 큼 (~1MB) |
| **ApexCharts + vue3-apexcharts** | 반응형 우수, 다크모드 지원 | 중간 크기 (~250KB) |

**추천: `Chart.js + vue-chartjs`** — POS 키오스크 특성상 가벼운 번들이 중요하고, 필요한 차트 종류(Bar, Line, Pie, Doughnut)가 모두 지원됨.

---

## 3. 메뉴별 차트 구성 계획

### A. 매출통계 (StatsSalesView.vue)

| 영역 | 차트 타입 | 데이터 소스 | 설명 |
|------|----------|------------|------|
| 일별 매출 추이 | **Line Chart** | `orders/stats/daily` | X축: 날짜, Y축: 매출액, 보조축: 주문건수 |
| 시간대별 매출 | **Bar Chart** | 주문 목록 `createdAt` 시간 그룹핑 | 피크타임 분석 (0~23시) |
| 주문 상태 비율 | **Doughnut Chart** | `stats/summary.statusBreakdown` | COMPLETED/CANCELLED/PENDING 비율 |
| 요약 카드 | 유지 | 현재 동일 | 총매출, 주문건수, 평균단가, 일평균 |
| 일별 매출 테이블 | 유지 | 현재 동일 | 차트 하단 상세 데이터 |

**신규 백엔드 API 필요:**

- `GET /orders/stats/hourly?startDate&endDate` — 시간대별 집계

### B. 상품통계 (StatsProductsView.vue)

| 영역 | 차트 타입 | 데이터 소스 | 설명 |
|------|----------|------------|------|
| 베스트셀러 TOP 10 | **Horizontal Bar Chart** | 기존 `productSalesMap` | 판매수량 기준 상위 10개 |
| 카테고리별 매출 비율 | **Pie Chart** | `productSalesMap` 카테고리 그룹핑 | 카테고리별 매출 점유율 |
| 상품 매출 vs 수량 | **Mixed Chart (Bar+Line)** | `productSalesMap` | 매출액(Bar) + 수량(Line) 비교 |
| 베스트셀러 리스트 | 유지(개선) | 기존 동일 | 차트와 연동된 하이라이트 |
| 전체 상품 테이블 | 유지 | 기존 동일 | 하단 상세 데이터 |

**신규 백엔드 API 필요:**

- `GET /orders/stats/products?startDate&endDate` — 서버사이드 상품별 집계 (현재 프론트에서 계산 중, 비효율)

### C. 매입통계 (StatsPurchaseView.vue)

| 영역 | 차트 타입 | 데이터 소스 | 설명 |
|------|----------|------------|------|
| 월별/일별 매입 추이 | **Bar Chart** | 매입 목록 날짜 그룹핑 | 기간별 매입액 변화 |
| 거래처별 매입 비율 | **Doughnut Chart** | 매입 목록 supplier 그룹핑 | 주요 거래처 점유율 |
| 매입 상태 분포 | **Pie Chart** | 매입 목록 status 그룹핑 | DRAFT/CONFIRMED/CANCELLED |
| 요약 카드 | 유지 | 현재 동일 | 총매입액, 건수, 평균단가 |
| 매입 내역 테이블 | 유지 | 현재 동일 | 차트 하단 상세 데이터 |

**신규 백엔드 API (선택적):**

- `GET /purchases/stats/by-supplier?startDate&endDate` — 거래처별 집계 (프론트 계산도 가능)

---

## 4. 작업 목록

### Phase 1: 기반 작업

| # | 작업 | 예상 영향 |
|---|------|----------|
| 1-1 | `npm install chart.js vue-chartjs` (frontend) | package.json |
| 1-2 | 차트 공통 컴포넌트 래퍼 생성 (`BaseChart.vue`) | 테마/반응형 통합 |
| 1-3 | 차트 색상 팔레트 정의 (기존 Tailwind 테마 기반) | 일관된 디자인 |

### Phase 2: 백엔드 API 추가

| # | 작업 | 파일 |
|---|------|------|
| 2-1 | `orders/stats/hourly` 엔드포인트 | `routes/orders.ts`, `order.service.ts` |
| 2-2 | `orders/stats/products` 엔드포인트 (서버 집계) | `routes/orders.ts`, `order.service.ts` |
| 2-3 | (선택) `purchases/stats/by-supplier` 엔드포인트 | `routes/purchases.ts` |

### Phase 3: 매출통계 차트 추가

| # | 작업 |
|---|------|
| 3-1 | Line Chart — 일별 매출 추이 |
| 3-2 | Bar Chart — 시간대별 매출 |
| 3-3 | Doughnut Chart — 주문 상태 비율 |
| 3-4 | 기존 테이블과 레이아웃 조정 |

### Phase 4: 상품통계 차트 추가

| # | 작업 |
|---|------|
| 4-1 | Horizontal Bar — 베스트셀러 TOP 10 |
| 4-2 | Pie Chart — 카테고리별 매출 비율 |
| 4-3 | Mixed Chart — 매출 vs 수량 |
| 4-4 | 서버사이드 집계 연동 |

### Phase 5: 매입통계 차트 추가

| # | 작업 |
|---|------|
| 5-1 | Bar Chart — 기간별 매입 추이 |
| 5-2 | Doughnut — 거래처별 매입 비율 |
| 5-3 | Pie Chart — 매입 상태 분포 |

### Phase 6: 마무리

| # | 작업 |
|---|------|
| 6-1 | 반응형 처리 (모바일/태블릿 대응) |
| 6-2 | 다크모드/고대비 테마 대응 |
| 6-3 | i18n 적용 (차트 라벨) |
| 6-4 | 데이터 없을 때 빈 상태 UI |

---

## 5. 주요 설계 고려사항

1. **성능**: 상품통계에서 프론트엔드가 모든 주문의 items를 순회하여 집계 중 → 서버사이드 집계 API로 전환 필요
2. **반응형**: 차트는 `responsive: true`, `maintainAspectRatio: false` 설정 필수
3. **테마 통합**: 기존 고대비/반전대비 테마와 차트 색상 연동
4. **데이터 캐싱**: 통계 데이터는 빈번히 변하지 않으므로 Redis TTL 5분 캐싱 적용
5. **레이아웃**: 차트는 테이블 상단에 배치, "차트 영역 + 테이블 상세" 2단 구성

---

## 6. 화면 레이아웃 와이어프레임

### 매출통계 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 매출통계                                          │
│ 기간별 매출 현황을 조회합니다                        │
├──────────────────────────────────────────────────┤
│ [주간] [월간] [연간]  [시작일] ~ [종료일]  [조회]    │
├──────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│ │총매출│ │주문수│ │평균단가│ │일평균│              │
│ └──────┘ └──────┘ └──────┘ └──────┘              │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌──────────────────┐  │
│ │  일별 매출 추이         │ │ 주문 상태 비율    │  │
│ │  (Line Chart)          │ │ (Doughnut Chart) │  │
│ │                        │ │                  │  │
│ └────────────────────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │  시간대별 매출 (Bar Chart)                  │   │
│ │  0시 1시 2시 ... 22시 23시                  │   │
│ └────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │  일별 매출 현황 (Table)                     │   │
│ │  날짜 | 주문건수 | 매출액                    │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 상품통계 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 상품통계                                          │
│ 상품별 판매 현황을 확인합니다                        │
├──────────────────────────────────────────────────┤
│ [주간] [월간] [연간]  [시작일] ~ [종료일]  [조회]    │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌──────────────────┐  │
│ │ 베스트셀러 TOP 10       │ │ 카테고리별 매출  │  │
│ │ (Horizontal Bar)       │ │ (Pie Chart)      │  │
│ │                        │ │                  │  │
│ └────────────────────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ 상품 매출 vs 수량 (Mixed Bar+Line Chart)    │   │
│ └────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ 상품별 판매 현황 (Table)                    │   │
│ │ 상품명 | 카테고리 | 판매수량 | 매출액        │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 매입통계 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 매입통계                                          │
│ 기간별 매입 현황을 조회합니다                        │
├──────────────────────────────────────────────────┤
│ [주간] [월간] [연간]  [시작일] ~ [종료일]  [조회]    │
├──────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ 총매입액  │ │ 매입건수  │ │ 평균단가  │           │
│ └──────────┘ └──────────┘ └──────────┘           │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌──────────────────┐  │
│ │ 기간별 매입 추이        │ │ 거래처별 매입비율 │  │
│ │ (Bar Chart)            │ │ (Doughnut Chart) │  │
│ │                        │ │                  │  │
│ └────────────────────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ 매입 내역 (Table)                          │   │
│ │ 매입코드 | 거래처 | 매입일 | 금액 | 상태    │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 7. 브레인스토밍: 개선사항

### 7-1. 누락된 통계 메뉴 (신규 추가 검토)

현재 3개 통계 메뉴는 매출/상품/매입만 다루고 있으나, DB 스키마에 이미 존재하는 데이터를 활용한 추가 통계가 가능하다.

#### A. 결제수단 통계 (신규)

DB에 `Payment` 모델이 존재하며 `PaymentType`(CARD, CASH, SIMPLE_PAY, POINT, MIXED)별 데이터가 쌓이고 있으나 통계 화면이 없음.

| 차트 | 타입 | 설명 |
|------|------|------|
| 결제수단별 비율 | Doughnut | 카드/현금/간편결제/포인트/복합 점유율 |
| 결제수단별 추이 | Stacked Bar | 일별 결제수단 구성 변화 |
| 결제 성공/실패율 | Bar | PaymentStatus별 건수 (APPROVED/FAILED/CANCELLED) |

**백엔드 API:** `GET /payments/stats/summary?startDate&endDate`, `GET /payments/stats/by-type?startDate&endDate`

#### B. 회원/포인트 통계 (신규)

DB에 `Member`, `PointHistory` 모델 존재. 회원등급(NORMAL/SILVER/GOLD/VIP/VVIP), 포인트 적립/사용 이력 활용.

| 차트 | 타입 | 설명 |
|------|------|------|
| 등급별 회원 분포 | Pie | 등급별 회원 수 비율 |
| 포인트 적립/사용 추이 | Dual Bar | 일별 적립량 vs 사용량 |
| 회원 vs 비회원 매출 비교 | Bar | 회원 주문 vs 비회원 주문 금액 |

**백엔드 API:** `GET /members/stats/summary`, `GET /members/stats/points?startDate&endDate`

#### C. 주문유형 통계 (매출통계에 추가)

`Order.orderType`(DINE_IN/TAKEOUT) 필드가 존재하나 통계에서 활용되지 않음.

| 차트 | 타입 | 설명 |
|------|------|------|
| 매장/포장 비율 | Doughnut | DINE_IN vs TAKEOUT 주문 비율 |
| 매장/포장 일별 추이 | Stacked Bar | 유형별 일별 변화 |

### 7-2. 기간 비교 기능

현재는 단일 기간 조회만 가능. **전기 대비 비교**가 없음.

- **이번 달 vs 지난 달**, **이번 주 vs 지난 주**, **올해 vs 작년** 비교
- 요약 카드에 증감률 표시: `+12.5%` / `-3.2%` (화살표 + 색상)
- Line Chart에 전기 데이터를 점선으로 오버레이

```
┌──────────┐
│ 총매출액  │
│ 5,230,000│
│ +12.5% ↑ │  ← 전기 대비 증감률
└──────────┘
```

### 7-3. 코드 중복 제거 (공통 Composable)

3개 통계 뷰가 동일한 로직을 중복 구현하고 있음:

| 중복 코드 | 발생 위치 | 해결 |
|-----------|----------|------|
| `calcDateRange()` | 3개 뷰 모두 | `useStatsDateRange()` composable |
| `formatDateISO()` | 3개 뷰 모두 | `@/utils/format` 으로 이동 |
| `formatNumber()` | 3개 뷰 모두 | 이미 `formatPrice` 존재, 통합 |
| 기간 선택 UI | 3개 뷰 모두 동일 | `StatsPeriodSelector.vue` 컴포넌트 |
| 로딩/빈상태 UI | 3개 뷰 유사 | `StatsEmptyState.vue` 컴포넌트 |

**추출 대상 composable:**

```typescript
// composables/useStatsDateRange.ts
export function useStatsDateRange() {
  // activePeriod, startDate, endDate, calcDateRange, selectPeriod
}
```

### 7-4. 데이터 내보내기 (Export)

통계 데이터를 외부로 내보내는 기능이 전혀 없음.

| 기능 | 구현 방식 | 비고 |
|------|----------|------|
| CSV 내보내기 | 프론트엔드 Blob 생성 | 라이브러리 불필요 |
| Excel 내보내기 | `xlsx` 라이브러리 (선택) | 서식 필요 시 |
| 차트 이미지 저장 | Chart.js `toBase64Image()` | PNG 다운로드 |
| PDF 보고서 | 차트 + 테이블 조합 인쇄 | `window.print()` CSS |

### 7-5. Chart.js Tree-shaking

Chart.js는 전체 import 시 ~200KB이나, 필요한 컴포넌트만 등록하면 크게 줄일 수 있음.

```typescript
// chart-setup.ts (tree-shaking 적용)
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
)
```

### 7-6. 대시보드 연동 강화

현재 `DashboardView.vue`는 오늘 주문수/매출만 표시. 통계 차트 미니 버전을 대시보드에 추가하면 활용도가 높아짐.

| 대시보드 위젯 | 차트 | 데이터 소스 |
|-------------|------|------------|
| 최근 7일 매출 추이 | Mini Line | `orders/stats/daily?days=7` |
| 오늘 결제수단 비율 | Mini Doughnut | 오늘 Payment 집계 |
| 베스트셀러 TOP 5 | Mini Bar | 오늘/이번주 상품 집계 |

### 7-7. 백엔드 API 일관성 문제

| 문제 | 현재 | 개선 |
|------|------|------|
| daily API 파라미터 불일치 | `days=7` (상대값) | `startDate&endDate` (절대값)로 통일 |
| 프론트 집계 비효율 | 상품통계: 전체 주문 fetch → 프론트 순회 | 서버사이드 `GROUP BY` 쿼리 |
| 매입 통계 API 부족 | summary만 존재 | daily, by-supplier, by-product 추가 |
| 캐싱 미적용 | 통계 API에 Redis 캐싱 없음 | TTL 5분 캐싱 적용 |

### 7-8. 차트 인터랙션 설계

단순히 차트를 보여주는 것을 넘어, 사용자와의 상호작용을 고려해야 함.

| 인터랙션 | 설명 |
|----------|------|
| 툴팁 | 호버 시 상세 수치 표시 (금액 + 건수 + 비율) |
| 클릭 드릴다운 | 일별 차트 막대 클릭 → 해당 일자 상세 주문 목록 표시 |
| 범례 토글 | 범례 클릭으로 특정 데이터셋 on/off |
| 줌/팬 | 연간 조회 시 특정 기간 확대 (chartjs-plugin-zoom) |
| 애니메이션 | 데이터 로드 시 부드러운 진입 애니메이션 |

### 7-9. 자동 새로고침

통계 화면이 열린 상태에서 새 주문이 들어와도 반영되지 않음.

- 옵션 1: 수동 새로고침 버튼 (최소 구현)
- 옵션 2: 30초~1분 주기 자동 polling
- 옵션 3: WebSocket 실시간 업데이트 (과도한 구현)

**추천: 옵션 1 + 2** — 새로고침 버튼 + 선택적 자동 갱신 토글

### 7-10. 접근성 (a11y)

차트는 시각 장애인에게 정보를 전달하기 어려움.

| 대응 | 구현 |
|------|------|
| `aria-label` | 차트 컨테이너에 요약 텍스트 제공 |
| 대체 텍스트 | 차트 하단 테이블이 대체 역할 (현재 구조 적합) |
| 색상 대비 | 고대비 테마 시 차트 색상도 변경 |
| 키보드 탐색 | Chart.js `a11y` 플러그인 활용 |

---

## 8. 개선된 작업 목록 (수정본)

### Phase 1: 기반 작업

| # | 작업 | 예상 영향 |
|---|------|----------|
| 1-1 | `npm install chart.js vue-chartjs` (frontend) | package.json |
| 1-2 | Chart.js tree-shaking 설정 (`chart-setup.ts`) | 번들 최적화 |
| 1-3 | 차트 색상 팔레트 정의 (Tailwind 테마 연동 + 고대비 대응) | 일관된 디자인 |
| 1-4 | `useStatsDateRange()` composable 추출 | 3개 뷰 코드 중복 제거 |
| 1-5 | `StatsPeriodSelector.vue` 공통 컴포넌트 | 기간 선택 UI 통합 |

### Phase 2: 백엔드 API 추가/개선

| # | 작업 | 파일 |
|---|------|------|
| 2-1 | `orders/stats/hourly` 엔드포인트 | `routes/orders.ts`, `order.service.ts` |
| 2-2 | `orders/stats/products` 서버사이드 집계 | `routes/orders.ts`, `order.service.ts` |
| 2-3 | `orders/stats/daily` 파라미터 통일 (startDate&endDate) | `routes/orders.ts`, `order.service.ts` |
| 2-4 | `purchases/stats/daily` 일별 매입 집계 | `routes/purchases.ts` |
| 2-5 | `purchases/stats/by-supplier` 거래처별 집계 | `routes/purchases.ts` |
| 2-6 | 통계 API Redis 캐싱 적용 (TTL 5분) | 각 service |

### Phase 3: 매출통계 차트 추가

| # | 작업 |
|---|------|
| 3-1 | Line Chart — 일별 매출 추이 (전기 비교 점선 포함) |
| 3-2 | Bar Chart — 시간대별 매출 |
| 3-3 | Doughnut Chart — 주문 상태 비율 |
| 3-4 | 요약 카드에 전기 대비 증감률 추가 |
| 3-5 | CSV 내보내기 버튼 |
| 3-6 | 기존 테이블과 레이아웃 조정 |

### Phase 4: 상품통계 차트 추가

| # | 작업 |
|---|------|
| 4-1 | Horizontal Bar — 베스트셀러 TOP 10 |
| 4-2 | Pie Chart — 카테고리별 매출 비율 |
| 4-3 | Mixed Chart — 매출 vs 수량 |
| 4-4 | 서버사이드 집계 연동 |
| 4-5 | CSV 내보내기 |

### Phase 5: 매입통계 차트 추가

| # | 작업 |
|---|------|
| 5-1 | Bar Chart — 기간별 매입 추이 |
| 5-2 | Doughnut — 거래처별 매입 비율 |
| 5-3 | Pie Chart — 매입 상태 분포 |
| 5-4 | CSV 내보내기 |

### Phase 6: 대시보드 차트 위젯

| # | 작업 |
|---|------|
| 6-1 | Mini Line — 최근 7일 매출 추이 |
| 6-2 | Mini Doughnut — 오늘 결제수단 비율 |
| 6-3 | Mini Bar — 베스트셀러 TOP 5 |

### Phase 7: 마무리

| # | 작업 |
|---|------|
| 7-1 | 반응형 처리 (모바일/태블릿) |
| 7-2 | 다크모드/고대비 테마 차트 색상 |
| 7-3 | i18n 적용 (차트 라벨, 툴팁) |
| 7-4 | 빈 상태 UI + 새로고침 버튼 |
| 7-5 | 접근성 (aria-label, 키보드) |

### Phase 8: 추가 통계 (선택적 확장)

| # | 작업 | 우선순위 |
|---|------|---------|
| 8-1 | 결제수단 통계 화면 신규 | 중 |
| 8-2 | 회원/포인트 통계 화면 신규 | 중 |
| 8-3 | 매출통계에 주문유형(매장/포장) 차트 추가 | 하 |
| 8-4 | 차트 클릭 드릴다운 인터랙션 | 하 |
| 8-5 | 자동 새로고침 토글 | 하 |

---

## 9. 전문가 패널 리뷰 (Spec Panel)

### Karl Wiegers (요구사항 엔지니어링) - 수용 기준 부재

> "이 문서는 작업 목록은 있지만 **완료 기준(Definition of Done)** 이 없습니다.
> '차트를 추가한다'가 아니라, 어떤 상태가 되었을 때 완료인지 측정 가능해야 합니다."

**지적사항:**

| 문제 | 심각도 | 개선 |
|------|--------|------|
| 각 Phase에 수용 기준 없음 | 높음 | Phase별 DoD(Definition of Done) 추가 |
| 성능 목표치 미정의 | 높음 | 차트 렌더링 시간, API 응답 시간 SLA 정의 |
| "선택적" 표현이 과다 | 중간 | 명확히 필수/선택 구분, 선택 기준 명시 |

**추가해야 할 수용 기준 예시:**

```
Phase 3 DoD (매출통계):
- [ ] 일별 매출 Line Chart가 30일 데이터 기준 500ms 이내 렌더링
- [ ] 차트 호버 시 툴팁에 금액(원 단위 포맷) + 건수 표시
- [ ] 기간 변경 시 차트가 API 재호출 후 자동 업데이트
- [ ] 데이터 0건일 때 빈 상태 UI 표시 (차트 영역 포함)
- [ ] ko/en/ja/zh 4개 언어 차트 라벨 정상 표시
```

### Martin Fowler (소프트웨어 아키텍처) - 관심사 분리

> "섹션 4와 섹션 8에 작업 목록이 중복 존재합니다. 또한 차트 컴포넌트 설계에서
> 관심사 분리가 부족합니다. 데이터 가공 로직이 뷰에 묶여서는 안 됩니다."

**지적사항:**

| 문제 | 심각도 | 개선 |
|------|--------|------|
| 섹션 4 vs 8 작업목록 충돌 | 높음 | 섹션 4 제거, 섹션 8을 유일한 작업목록으로 |
| 차트 데이터 가공이 뷰에 결합 | 중간 | composable로 데이터 변환 로직 분리 |
| 차트 옵션이 각 뷰에 하드코딩 예상 | 중간 | 공통 옵션 팩토리 패턴 적용 |

**제안 아키텍처:**

```
composables/
  useStatsDateRange.ts      ← 기간 선택 (이미 제안됨)
  useChartOptions.ts         ← 차트 공통 옵션 생성 (색상, 반응형, 테마)
  useSalesStats.ts           ← 매출 데이터 fetch + 차트 데이터 변환
  useProductStats.ts         ← 상품 데이터 fetch + 차트 데이터 변환
  usePurchaseStats.ts        ← 매입 데이터 fetch + 차트 데이터 변환

components/stats/
  StatsPeriodSelector.vue    ← 기간 선택 UI (이미 제안됨)
  StatsCard.vue              ← 요약 카드 (증감률 포함)
  StatsEmptyState.vue        ← 빈 상태 UI
  StatsExportButton.vue      ← CSV/이미지 내보내기
```

### Michael Nygard (프로덕션 엔지니어링) - 장애 시나리오 부재

> "통계 API가 실패하면 차트 영역은 어떻게 되나요?
> 이 문서는 정상 경로만 기술하고 있습니다."

**누락된 장애 시나리오:**

| 시나리오 | 현재 | 개선 |
|----------|------|------|
| 통계 API 타임아웃 | 미정의 | 차트 영역에 에러 상태 + 재시도 버튼 |
| 부분 API 실패 | 미정의 | 성공한 차트만 표시, 실패 영역에 개별 에러 |
| 대량 데이터 (연간 조회) | 미정의 | Chart.js `decimation` 플러그인 적용 |
| Redis 캐시 미연결 | graceful fallback 존재 | 통계 API도 동일 패턴 적용 확인 |
| 오프라인 모드 | 미정의 | 통계는 온라인 전용으로 명시, 오프라인 시 안내 |

**대량 데이터 대응 (Chart.js Data Decimation):**

```typescript
// 연간 조회 시 365개 데이터 포인트 → decimation 적용
options: {
  plugins: {
    decimation: {
      enabled: true,
      algorithm: 'lttb',  // Largest-Triangle-Three-Buckets
      samples: 50          // 최대 50개 포인트로 축소
    }
  }
}
```

### Gojko Adzic (실행 가능 명세) - 구체적 예시 부재

> "차트가 실제로 어떻게 보일지 구체적 시나리오가 없습니다.
> Given/When/Then으로 동작을 명세해야 테스트 가능합니다."

**추가해야 할 시나리오 예시:**

```gherkin
Scenario: 월간 매출통계 차트 표시
  Given 2026년 3월 1일~31일 사이에 완료된 주문이 45건, 총 매출 2,350,000원
  When 관리자가 매출통계 페이지에서 "월간" 기간을 선택
  Then 요약 카드에 "총매출 2,350,000원", "주문 45건" 표시
  And Line Chart X축에 3/1~3/31 날짜, Y축에 일별 매출액
  And 데이터가 없는 날짜는 0으로 표시 (빈 구간 없이 연속)

Scenario: 시간대별 매출 피크타임 확인
  Given 점심시간(11~13시) 주문이 전체의 40%를 차지
  When 시간대별 Bar Chart를 조회
  Then 11시, 12시, 13시 막대가 가장 높게 표시
  And 툴팁에 "12시: 15건, 520,000원 (전체 대비 18%)" 형식으로 표시

Scenario: 데이터 없는 기간 조회
  Given 선택한 기간에 완료된 주문이 0건
  When 매출통계를 조회
  Then 요약 카드 모두 "0원", "0건" 표시
  And 차트 영역에 빈 상태 아이콘 + "해당 기간의 데이터가 없습니다" 메시지
  And 테이블도 빈 상태 표시
```

### Lisa Crispin (테스팅) - 테스트 전략 부재

> "차트 컴포넌트를 어떻게 테스트할 건가요?
> 시각적 요소는 단위 테스트만으로 검증하기 어렵습니다."

**추가해야 할 테스트 전략:**

| 테스트 유형 | 대상 | 방법 |
|------------|------|------|
| Unit Test | composable (데이터 변환) | Vitest — 입력 데이터 → 차트 데이터 변환 검증 |
| Unit Test | 백엔드 stats API | Vitest — 집계 쿼리 결과 검증 |
| Component Test | 차트 컴포넌트 렌더링 | Vitest + @vue/test-utils — mount 후 canvas 존재 확인 |
| E2E Test | 기간 선택 → 차트 업데이트 | Playwright — 기간 변경 후 차트 영역 스크린샷 비교 |
| Visual Regression | 차트 스타일 변경 감지 | Playwright screenshot comparison |
| API Integration | 통계 엔드포인트 응답 | Supertest — 응답 형식 + 집계 정확성 |

### Kelsey Hightower (Electron/런타임 고려) - 플랫폼 특성 미반영

> "이것은 Electron 앱입니다. 브라우저와 다른 렌더링 환경을 고려해야 합니다."

**누락된 Electron 고려사항:**

| 항목 | 내용 |
|------|------|
| 화면 크기 | 키오스크 디스플레이 고정 해상도 (1080x1920 세로형 또는 1920x1080 가로형) |
| 터치 인터랙션 | 키오스크는 마우스가 아닌 터치 — 차트 호버 대신 탭 인터랙션 |
| Canvas 렌더링 | Electron Chromium에서 Canvas 하드웨어 가속 확인 |
| 인쇄 | Electron `window.print()`는 브라우저와 동작 다름, BrowserWindow.webContents.print() 사용 |
| 메모리 | 차트 인스턴스 destroy 미처리 시 메모리 누수 — `onUnmounted`에서 정리 필수 |

---

## 10. 신규 백엔드 API 응답 명세

기존 문서에서 "신규 API 필요"라고만 기술하고 응답 형식이 없었음.

### GET /orders/stats/hourly

```typescript
// Request
GET /api/v1/orders/stats/hourly?startDate=2026-03-01&endDate=2026-03-31

// Response
{
  "success": true,
  "data": [
    { "hour": 0, "count": 2, "revenue": 15000 },
    { "hour": 1, "count": 0, "revenue": 0 },
    // ... 0~23시 전체
    { "hour": 23, "count": 1, "revenue": 8500 }
  ]
}
```

### GET /orders/stats/products

```typescript
// Request
GET /api/v1/orders/stats/products?startDate=2026-03-01&endDate=2026-03-31&limit=10

// Response
{
  "success": true,
  "data": [
    {
      "productId": 1,
      "name": "아메리카노",
      "categoryName": "커피",
      "totalQuantity": 230,
      "totalAmount": 920000
    },
    // ...
  ]
}
```

### GET /purchases/stats/daily

```typescript
// Request
GET /api/v1/purchases/stats/daily?startDate=2026-03-01&endDate=2026-03-31

// Response
{
  "success": true,
  "data": [
    { "date": "2026-03-01", "count": 3, "totalAmount": 450000 },
    { "date": "2026-03-02", "count": 0, "totalAmount": 0 },
    // ...
  ]
}
```

### GET /purchases/stats/by-supplier

```typescript
// Request
GET /api/v1/purchases/stats/by-supplier?startDate=2026-03-01&endDate=2026-03-31

// Response
{
  "success": true,
  "data": [
    { "supplierId": 1, "supplierName": "신선식품", "count": 12, "totalAmount": 2800000 },
    { "supplierId": 2, "supplierName": "음료공급", "count": 8, "totalAmount": 1500000 },
    // ...
  ]
}
```

---

## 11. 버전 및 호환성 명세

문서에서 라이브러리 버전이 명시되지 않아 추가.

| 패키지 | 버전 | 비고 |
|--------|------|------|
| `chart.js` | `^4.x` | v4가 현재 최신, tree-shaking 지원 |
| `vue-chartjs` | `^5.3.x` | Vue 3 + Chart.js v4 호환 버전 |
| `chartjs-plugin-datalabels` | `^2.x` | 선택적 — 차트 위 수치 직접 표시 시 |

**vue-chartjs v5 + Composition API 예시 (프로젝트 컨벤션에 맞춤):**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: '매출액',
    backgroundColor: '#6366f1',
    data: props.values
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          `${ctx.dataset.label}: ${new Intl.NumberFormat('ko-KR').format(ctx.raw)}원`
      }
    }
  }
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
```

---

## 12. 타임존 처리 명세

통계 날짜 집계 시 타임존 불일치 문제 가능성.

| 레이어 | 현재 | 개선 |
|--------|------|------|
| DB (PostgreSQL) | `createdAt` = UTC | 유지 |
| 백엔드 stats 쿼리 | `new Date(startDate)` → 로컬 타임존 의존 | 명시적 KST→UTC 변환 |
| 프론트엔드 | `toISOString()` → UTC | 날짜만 전송 (YYYY-MM-DD), 백엔드에서 KST 기준 변환 |

**권장 패턴:**

```typescript
// backend: startDate를 KST 기준 00:00:00으로 해석
const startOfDay = new Date(`${startDate}T00:00:00+09:00`)
const endOfDay = new Date(`${endDate}T23:59:59.999+09:00`)
```

---

## 13. 섹션 4 (구 작업목록) 정리 안내

> 섹션 4의 작업목록은 섹션 8의 개선된 작업목록으로 대체됨.
> 구현 시 **섹션 8만 참조**할 것.

---

## 14. 브레인스토밍 2차: 비즈니스 인텔리전스 관점

### 14-1. 손익/마진 분석 (VB6 레거시 기능 누락)

VB6 레거시 시스템(`DF_{YYYYMM}` 일계 테이블)에서는 매일 **마진 분석**을 수행했음:

```sql
-- VB6 레거시 정산 로직
TProfit_Pri  = 총판매액 - 총매입액    -- 마진 이익
TProfit_Rate = (TProfit_Pri / 총판매액) * 100  -- 마진 이율(%)
```

현재 통계 설계에서 **매출과 매입을 별도 화면에서만 보여주고, 교차 분석(이익률)이 완전히 누락**됨.
이것은 POS 시스템에서 가장 핵심적인 비즈니스 지표임.

#### 손익통계 화면 제안 (신규)

| 차트 | 타입 | 설명 |
|------|------|------|
| 일별 손익 추이 | **Dual Axis Line** | 매출(실선) vs 매입(점선) + 이익(영역 fill) |
| 월별 이익률 추이 | **Bar + Line Mixed** | 이익금액(Bar) + 이익률%(Line) |
| 카테고리별 이익률 | **Horizontal Bar** | 카테고리별 (매출-매입원가)/매출 |
| 손익 요약 카드 | - | 총매출, 총매입, 순이익, 이익률% |

```
┌──────────────────────────────────────────────────┐
│ 손익분석                                          │
├──────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│ │총매출│ │총매입│ │순이익│ │이익률│              │
│ │5.2M  │ │3.1M  │ │2.1M  │ │40.3%│              │
│ └──────┘ └──────┘ └──────┘ └──────┘              │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │  매출 vs 매입 vs 이익 추이 (Dual Line)     │   │
│ │  ──── 매출   ---- 매입   ████ 이익(영역)   │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**백엔드 API:** `GET /stats/profit-loss?startDate&endDate`

```typescript
// Response
{
  "success": true,
  "data": {
    "summary": {
      "totalSales": 5230000,
      "totalPurchases": 3120000,
      "grossProfit": 2110000,
      "profitRate": 40.3
    },
    "daily": [
      { "date": "2026-03-01", "sales": 180000, "purchases": 105000, "profit": 75000, "rate": 41.7 },
      // ...
    ]
  }
}
```

### 14-2. 정산 리포트 (VB6 Z-리포트 마이그레이션)

VB6에서 `Mdl_Printer`가 출력하던 Z-리포트 내용:

| 정산 항목 | VB6 있음 | 현재 있음 | 비고 |
|-----------|---------|----------|------|
| 상품별 판매 내역 | O | O | StatsProductsView |
| 분류별 판매 내역 | O | 부분 | 카테고리별 차트로 대체 가능 |
| 결제수단별 집계 | O | X | 7-1.A에서 제안됨 |
| 반품/폐기 집계 | O | X | CANCELLED 주문 분석 필요 |
| 마진 분석 | O | X | 14-1에서 제안됨 |
| 거래처별 정산 | O | 부분 | StatsPurchaseView의 거래처별 차트 |

### 14-3. 키오스크별 성과 비교

`Order.kioskId` 필드가 존재하나 통계에서 활용되지 않음.
다중 키오스크 운영 매장에서 **기기별 매출 비교**는 운영 의사결정에 중요.

| 차트 | 타입 | 설명 |
|------|------|------|
| 키오스크별 매출 비교 | Grouped Bar | 키오스크 A vs B vs C 일별 매출 |
| 키오스크별 점유율 | Pie | 전체 매출 중 키오스크별 비중 |

매출통계에 "키오스크별" 필터 또는 별도 탭으로 추가 가능.

### 14-4. 요일별 패턴 분석

매출 데이터에서 요일 패턴을 추출하면 인력/재고 운영에 활용 가능.

| 차트 | 타입 | 설명 |
|------|------|------|
| 요일별 평균 매출 | Radar Chart | 월~일 7각형 레이더 |
| 요일별 시간대 히트맵 | Custom (직접 구현) | 요일 x 시간대 매트릭스 |

```
         월   화   수   목   금   토   일
 9시     ░░   ░░   ░░   ░░   ░░   ██   ██
10시     ░░   ░░   ░░   ░░   ██   ██   ██
11시     ██   ██   ██   ██   ██   ██   ██
12시     ██   ██   ██   ██   ██   ██   ██
13시     ██   ██   ██   ██   ██   ██   ██
 ...
```

### 14-5. 취소/환불 분석

`CANCELLED` 주문이 통계에서 단순히 제외되고 있으나, 취소 패턴 분석도 중요.

| 지표 | 설명 |
|------|------|
| 취소율 | 전체 주문 대비 취소 비율 추이 |
| 취소 시점 | 주문 후 몇 분 만에 취소되는지 |
| 취소 상품 TOP 10 | 어떤 상품이 많이 취소되는지 |

---

## 15. 브레인스토밍 2차: UX/프론트엔드 관점

### 15-1. URL 상태 유지 (Query String Persistence)

현재 기간을 선택해도 페이지 새로고침 시 초기화됨.

```
/admin/stats/sales?period=month&start=2026-03-01&end=2026-03-31
```

- `vue-router`의 `query` 파라미터로 기간 상태 유지
- 브라우저 뒤로가기 시 이전 조회 조건 복원
- 다른 통계 페이지로 이동 시 기간 설정 공유 가능

### 15-2. 차트 스켈레톤 로딩

현재는 공통 스피너만 사용. 차트 형태의 스켈레톤이 UX에 더 좋음.

```
┌─────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░  │  ← 차트 스켈레톤
│  ░░░░    ░░░░    ░░░░      │
│  ░░░░░░  ░░░░░░  ░░░░░░   │
│  ████░░  ████░░  ████░░   │
│  ████░░  ████░░  ████░░   │
│  ████░░  ████░░  ████░░   │
└─────────────────────────────┘
```

CSS-only 또는 SVG로 구현, Chart.js 로드 전에 표시.

### 15-3. 차트/테이블 뷰 토글

일부 사용자(특히 경영진)는 차트보다 수치 테이블을 선호할 수 있음.

```
[차트 보기] [테이블 보기]  ← 토글 버튼
```

- 기본값: 차트 + 테이블 모두 표시
- 차트만 보기 / 테이블만 보기 옵션
- 선택 상태 localStorage 저장

### 15-4. 색맹 대응 팔레트

Chart.js 기본 색상은 색맹 사용자에게 구분이 어려울 수 있음.

**추천 접근법:**

| 방법 | 설명 |
|------|------|
| 패턴 채움 | `chartjs-plugin-style`로 빗금/점/격자 패턴 |
| 색맹 안전 팔레트 | Wong 팔레트: `#E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7` |
| 범례에 모양 추가 | 원형/사각형/삼각형으로 데이터셋 구분 |

### 15-5. 프론트엔드 데이터 캐싱

통계 탭 간 이동 시 매번 API를 호출하는 것은 비효율적.

```typescript
// composable에 간단한 메모리 캐시
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data
  return null
}
```

### 15-6. 사이드바 메뉴 확장 영향

현재 통계관리 하위 3개 → 최대 6개(+손익/결제/회원)로 증가 가능.

```
통계관리
  ├ 매출통계      (기존)
  ├ 상품통계      (기존)
  ├ 매입통계      (기존)
  ├ 손익분석      (신규 - 14-1)
  ├ 결제수단통계   (신규 - 7-1.A)
  └ 회원통계      (신규 - 7-1.B)
```

AdminLayout 사이드바의 `menuGroups` 배열에 항목 추가 + 라우터 등록 필요.
아이콘 추가: `chart-profit`, `chart-payment`, `chart-member`

---

## 16. 우선순위 매트릭스 (최종)

모든 개선사항을 비즈니스 가치 vs 구현 난이도로 정리.

### 필수 (Must Have) - 1차 스프린트

| 항목 | 비즈니스 가치 | 난이도 | 근거 |
|------|-------------|--------|------|
| Phase 1: 기반 (chart.js + composable) | - | 낮음 | 모든 차트의 전제 |
| Phase 2: 백엔드 API 추가 | - | 중간 | 프론트 차트의 전제 |
| Phase 3: 매출통계 차트 | 높음 | 중간 | 가장 많이 보는 화면 |
| Phase 4: 상품통계 차트 | 높음 | 중간 | 상품 의사결정 핵심 |
| Phase 5: 매입통계 차트 | 중간 | 중간 | 매입 관리 필수 |

### 중요 (Should Have) - 2차 스프린트

| 항목 | 비즈니스 가치 | 난이도 | 근거 |
|------|-------------|--------|------|
| 14-1: 손익 분석 | 높음 | 중간 | VB6에 있던 핵심 기능, 경영 판단 필수 |
| 7-2: 기간 비교 (증감률) | 높음 | 중간 | 경영 의사결정 핵심 지표 |
| 7-4: CSV 내보내기 | 중간 | 낮음 | 외부 보고/회계 연동 |
| Phase 6: 대시보드 위젯 | 중간 | 낮음 | 일일 운영 편의 |

### 선택 (Could Have) - 3차 스프린트

| 항목 | 비즈니스 가치 | 난이도 | 근거 |
|------|-------------|--------|------|
| 8-1: 결제수단 통계 | 중간 | 중간 | VAN사 정산 참고 |
| 8-2: 회원/포인트 통계 | 중간 | 중간 | 마케팅 분석 |
| 14-3: 키오스크별 비교 | 중간 | 낮음 | 다중 기기 매장만 해당 |
| 14-4: 요일 패턴 | 낮음 | 낮음 | 운영 최적화 참고 |

### 향후 (Won't Have Now)

| 항목 | 근거 |
|------|------|
| 14-4 히트맵 | Chart.js 기본 미지원, 커스텀 구현 필요 |
| 7-9 자동 새로고침 | 통계 화면 특성상 실시간 불필요 |
| 차트 줌/팬 | 데이터 규모가 줌 필요할 만큼 크지 않음 |
