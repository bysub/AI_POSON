# 통계관리 차트 구현 워크플로우

> 기준 문서: `.doc/stats-chart-analysis.md` (섹션 8 + 섹션 16 우선순위 매트릭스)

---

## 전체 구조

```
Sprint 1 (Must Have)
  Step 1: 기반 설정 ──────────────────────────────┐
  Step 2: 공통 컴포넌트 ─────────────────────────┐ │
  Step 3: 백엔드 API (주문 통계) ──────────────┐ │ │
  Step 4: 백엔드 API (매입 통계) ────────────┐ │ │ │
  Step 5: 매출통계 차트 ◄────────────────────┤ ├─┤ │
  Step 6: 상품통계 차트 ◄────────────────────┤ ├─┘ │
  Step 7: 매입통계 차트 ◄────────────────────┘ │   │
  Step 8: 테마/i18n/접근성 ◄───────────────────┘   │
                                                    │
Sprint 2 (Should Have)                              │
  Step 9:  손익분석 API + 화면 ◄────────────────────┘
  Step 10: 기간 비교 (증감률)
  Step 11: CSV 내보내기
  Step 12: 대시보드 위젯

Sprint 3 (Could Have)
  Step 13: 결제수단 통계
  Step 14: 회원/포인트 통계
```

---

## 의존성 맵

```
Step 1 ─► Step 2 ─► Step 5, 6, 7, 8
Step 1 ─► Step 3 ─► Step 5, 6
Step 1 ─► Step 4 ─► Step 7
Step 5 ─► Step 10
Step 1 ─► Step 9
Step 5,6,7 ─► Step 11
Step 5 ─► Step 12

* Step 3 + Step 4 는 병렬 가능
* Step 5 + Step 6 + Step 7 은 Step 2,3,4 완료 후 병렬 가능
* Step 13 + Step 14 는 독립적, Sprint 3에서 병렬 가능
```

---

## Sprint 1: Must Have

### Step 1. 기반 설정

**선행 조건:** 없음
**작업 디렉토리:** `frontend/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 1-1 | `npm install chart.js vue-chartjs` | `package.json` |
| 1-2 | Chart.js tree-shaking 등록 파일 생성 | `src/renderer/src/utils/chart-setup.ts` |

**1-2 상세 — `chart-setup.ts`:**

```typescript
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, TimeScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, TimeScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
)

// 차트 색상 팔레트 (Tailwind 테마 연동)
export const CHART_COLORS = {
  primary: '#6366f1',    // indigo-500
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#3b82f6',       // blue-500
  purple: '#8b5cf6',     // violet-500
  orange: '#f97316',     // orange-500
  teal: '#14b8a6',       // teal-500
  slate: '#64748b',      // slate-500
  pink: '#ec4899',       // pink-500
} as const

// 색맹 안전 팔레트 (Wong palette)
export const CHART_COLORS_ACCESSIBLE = [
  '#E69F00', '#56B4E9', '#009E73', '#F0E442',
  '#0072B2', '#D55E00', '#CC79A7',
]

// 공통 차트 옵션
export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
    },
    legend: {
      position: 'bottom' as const,
      labels: { usePointStyle: true, padding: 16 },
    },
  },
  animation: { duration: 600 },
}
```

**DoD:**
- [ ] `chart.js`, `vue-chartjs` 설치 완료
- [ ] `chart-setup.ts`에서 tree-shaking 등록 정상 동작
- [ ] `npm run build:win` 빌드 에러 없음

---

### Step 2. 공통 컴포넌트 + Composable

**선행 조건:** Step 1
**작업 디렉토리:** `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 2-1 | `useStatsDateRange` composable 추출 | `composables/useStatsDateRange.ts` |
| 2-2 | `useChartOptions` composable 생성 | `composables/useChartOptions.ts` |
| 2-3 | `StatsPeriodSelector.vue` 공통 컴포넌트 | `components/stats/StatsPeriodSelector.vue` |
| 2-4 | `StatsCard.vue` 요약 카드 컴포넌트 | `components/stats/StatsCard.vue` |
| 2-5 | `StatsEmptyState.vue` 빈 상태 UI | `components/stats/StatsEmptyState.vue` |
| 2-6 | `StatsExportButton.vue` 내보내기 버튼 | `components/stats/StatsExportButton.vue` |
| 2-7 | `components/index.ts`에 export 추가 | `components/index.ts` |

**2-1 상세 — `useStatsDateRange.ts`:**

```typescript
import { ref } from 'vue'

export type Period = 'week' | 'month' | 'year'

export function useStatsDateRange() {
  const activePeriod = ref<Period>('month')
  const startDate = ref('')
  const endDate = ref('')

  function formatDateISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function calcDateRange(period: Period): void {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start: Date
    switch (period) {
      case 'week':
        start = new Date(end); start.setDate(start.getDate() - 6); break
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1); break
      case 'year':
        start = new Date(end.getFullYear(), 0, 1); break
    }
    startDate.value = formatDateISO(start)
    endDate.value = formatDateISO(end)
  }

  function selectPeriod(period: Period, onLoad: () => void): void {
    activePeriod.value = period
    calcDateRange(period)
    onLoad()
  }

  // 초기 계산
  calcDateRange(activePeriod.value)

  return { activePeriod, startDate, endDate, calcDateRange, selectPeriod }
}
```

**2-3 상세 — `StatsPeriodSelector.vue` (3개 뷰에서 공유):**

기존 3개 뷰에서 반복되는 기간 선택 UI (주간/월간/연간 버튼 + 날짜 입력 + 조회)를 단일 컴포넌트로 추출.
Props: `activePeriod`, `startDate`, `endDate`
Emits: `update:activePeriod`, `update:startDate`, `update:endDate`, `search`

**DoD:**
- [ ] 3개 Stats 뷰의 기간 선택 코드가 `StatsPeriodSelector.vue`로 교체 가능
- [ ] `useStatsDateRange` 반환값으로 기간 계산 정상 동작
- [ ] 기존 3개 뷰 기능 회귀 없음 (날짜 계산 동일 결과)

---

### Step 3. 백엔드 API — 주문 통계

**선행 조건:** 없음 (Step 1과 병렬 가능)
**작업 디렉토리:** `backend/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 3-1 | `orders/stats/daily` 파라미터를 `startDate&endDate`로 변경 | `routes/orders.ts`, `services/order.service.ts` |
| 3-2 | `orders/stats/hourly` 엔드포인트 신규 | `routes/orders.ts`, `services/order.service.ts` |
| 3-3 | `orders/stats/products` 서버사이드 집계 엔드포인트 신규 | `routes/orders.ts`, `services/order.service.ts` |
| 3-4 | 신규 API에 Redis 캐싱 적용 (TTL 5분) | `services/order.service.ts` |

**3-1 상세 — daily API 변경:**

현재: `GET /orders/stats/daily?days=7` (상대값)
변경: `GET /orders/stats/daily?startDate=2026-03-01&endDate=2026-03-31` (절대값)
하위 호환: `days` 파라미터도 유지, `startDate`가 있으면 우선 사용

**3-2 상세 — hourly API 응답:**

```typescript
// GET /api/v1/orders/stats/hourly?startDate=...&endDate=...
// → 0~23시 각 시간대의 주문 건수 + 매출액
[{ hour: 0, count: 2, revenue: 15000 }, ..., { hour: 23, count: 1, revenue: 8500 }]
```

**3-3 상세 — products API 응답:**

```typescript
// GET /api/v1/orders/stats/products?startDate=...&endDate=...&limit=10
// → 판매수량 기준 정렬된 상품별 집계
[{ productId: 1, name: '아메리카노', categoryName: '커피', totalQuantity: 230, totalAmount: 920000 }]
```

**타임존 처리 (모든 stats API 공통):**

```typescript
const startOfDay = new Date(`${startDate}T00:00:00+09:00`)
const endOfDay = new Date(`${endDate}T23:59:59.999+09:00`)
```

**DoD:**
- [ ] `GET /orders/stats/daily?startDate&endDate` 정상 응답
- [ ] `GET /orders/stats/hourly?startDate&endDate` → 24개 항목 배열 반환
- [ ] `GET /orders/stats/products?startDate&endDate&limit=10` → 정렬된 집계 반환
- [ ] 기존 `days` 파라미터 하위 호환 유지
- [ ] API 응답 시간 < 500ms (30일 기준)

---

### Step 4. 백엔드 API — 매입 통계

**선행 조건:** 없음 (Step 3과 병렬 가능)
**작업 디렉토리:** `backend/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 4-1 | `purchases/stats/daily` 일별 매입 집계 | `routes/purchases.ts`, 관련 service |
| 4-2 | `purchases/stats/by-supplier` 거래처별 집계 | `routes/purchases.ts`, 관련 service |
| 4-3 | 신규 API에 Redis 캐싱 적용 | 관련 service |

**4-1 응답:**

```typescript
[{ date: '2026-03-01', count: 3, totalAmount: 450000 }, ...]
```

**4-2 응답:**

```typescript
[{ supplierId: 1, supplierName: '신선식품', count: 12, totalAmount: 2800000 }, ...]
```

**DoD:**
- [ ] `GET /purchases/stats/daily?startDate&endDate` 정상 응답
- [ ] `GET /purchases/stats/by-supplier?startDate&endDate` 정상 응답
- [ ] 취소(CANCELLED) 매입은 집계에서 제외

---

### Step 5. 매출통계 차트 (StatsSalesView.vue)

**선행 조건:** Step 2 + Step 3
**작업 디렉토리:** `frontend/src/renderer/src/views/admin/`

| # | 작업 | 설명 |
|---|------|------|
| 5-1 | 뷰 리팩토링 | 기존 코드를 `useStatsDateRange` + `StatsPeriodSelector`로 교체 |
| 5-2 | `useSalesStats.ts` composable 생성 | 데이터 fetch + 차트 데이터 변환 로직 분리 |
| 5-3 | Line Chart — 일별 매출 추이 | `orders/stats/daily` → Line 차트, X: 날짜, Y: 매출(주축) + 건수(보조축) |
| 5-4 | Bar Chart — 시간대별 매출 | `orders/stats/hourly` → Bar 차트, X: 0~23시, Y: 매출액 |
| 5-5 | Doughnut Chart — 주문 상태 비율 | `stats/summary.statusBreakdown` → Doughnut |
| 5-6 | 레이아웃 조정 | 차트 2열 (Line 65% + Doughnut 35%), Bar 전폭, 테이블 하단 |

**레이아웃 (와이어프레임 기준):**

```
[StatsPeriodSelector]
[StatsCard x 4: 총매출, 주문수, 평균단가, 일평균]
[Line Chart (65%)      ] [Doughnut (35%)]
[Bar Chart (시간대별) — 전폭               ]
[Table (일별 매출 현황)                     ]
```

**DoD:**
- [ ] Line Chart: 30일 데이터 500ms 이내 렌더링
- [ ] Bar Chart: 24개 시간대 막대 정상 표시
- [ ] Doughnut: COMPLETED/CANCELLED/PENDING 3색 구분
- [ ] 호버 시 툴팁에 금액(원 포맷) + 건수 표시
- [ ] 기간 변경 시 차트 자동 업데이트
- [ ] 데이터 0건 시 `StatsEmptyState` 표시
- [ ] `onUnmounted`에서 차트 인스턴스 destroy (메모리 누수 방지)

---

### Step 6. 상품통계 차트 (StatsProductsView.vue)

**선행 조건:** Step 2 + Step 3 (3-3)
**작업 디렉토리:** `frontend/src/renderer/src/views/admin/`

| # | 작업 | 설명 |
|---|------|------|
| 6-1 | 뷰 리팩토링 | 기존 코드를 composable + 공통 컴포넌트로 교체 |
| 6-2 | `useProductStats.ts` composable 생성 | `orders/stats/products` API 연동 (프론트 집계 제거) |
| 6-3 | Horizontal Bar — 베스트셀러 TOP 10 | 판매수량 기준, 상품명 Y축 |
| 6-4 | Pie Chart — 카테고리별 매출 비율 | 카테고리 그룹핑 → 점유율 |
| 6-5 | 레이아웃 조정 | Horizontal Bar (60%) + Pie (40%), 테이블 하단 |

**핵심 변경: 프론트 집계 → 서버 집계**

기존에 `orders` 전체를 fetch하여 프론트에서 `productSalesMap`을 계산하던 로직을 제거하고,
`GET /orders/stats/products?startDate&endDate&limit=10` API 사용으로 전환.

**DoD:**
- [ ] Horizontal Bar: TOP 10 상품 정상 표시, 수량 기준 내림차순
- [ ] Pie Chart: 카테고리별 비율 정상 표시, 5% 미만은 "기타"로 그룹
- [ ] 서버사이드 집계로 전환 완료 (프론트 `productSalesMap` computed 제거)
- [ ] 기존 베스트셀러 리스트 + 테이블 기능 유지

---

### Step 7. 매입통계 차트 (StatsPurchaseView.vue)

**선행 조건:** Step 2 + Step 4
**작업 디렉토리:** `frontend/src/renderer/src/views/admin/`

| # | 작업 | 설명 |
|---|------|------|
| 7-1 | 뷰 리팩토링 | 기존 코드를 composable + 공통 컴포넌트로 교체 |
| 7-2 | `usePurchaseStats.ts` composable 생성 | daily + by-supplier API 연동 |
| 7-3 | Bar Chart — 기간별 매입 추이 | `purchases/stats/daily` → Bar, X: 날짜, Y: 매입액 |
| 7-4 | Doughnut — 거래처별 매입 비율 | `purchases/stats/by-supplier` → Doughnut |
| 7-5 | 레이아웃 조정 | 요약 카드 3개, Bar (60%) + Doughnut (40%), 테이블 하단 |

**DoD:**
- [ ] Bar Chart: 기간별 매입액 정상 표시
- [ ] Doughnut: 거래처별 비율 정상 표시 (거래처 5개 이상 시 상위 5 + 기타)
- [ ] 기존 매입 내역 테이블 + 상태 배지 기능 유지

---

### Step 8. 테마/i18n/접근성

**선행 조건:** Step 5, 6, 7 (차트가 있어야 적용 가능)
**작업 디렉토리:** `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 8-1 | 고대비/반전대비 테마 차트 색상 연동 | `utils/chart-setup.ts`, 각 composable |
| 8-2 | i18n 차트 라벨 적용 | `locales/ko.json`, `en.json`, `ja.json`, `zh.json` |
| 8-3 | 빈 상태 UI 적용 (데이터 0건) | 각 Stats 뷰 |
| 8-4 | aria-label 추가 | 각 차트 컨테이너 div |
| 8-5 | 새로고침 버튼 추가 | 각 Stats 뷰 헤더 영역 |

**8-2 i18n 키 추가 예시:**

```json
{
  "stats": {
    "totalSales": "총 매출액",
    "orderCount": "주문 건수",
    "avgOrderAmount": "평균 주문 금액",
    "dailyAvg": "일평균 매출",
    "hourlyLabel": "{hour}시",
    "noData": "해당 기간의 데이터가 없습니다"
  }
}
```

**DoD:**
- [ ] 고대비 테마에서 차트 색상 가독성 확인
- [ ] 4개 언어로 전환 시 차트 라벨/툴팁 정상 표시
- [ ] 빈 상태 UI에 아이콘 + 메시지 + 안내 표시
- [ ] 각 차트에 `aria-label` 속성 존재

---

## Sprint 2: Should Have

### Step 9. 손익분석 (신규 화면)

**선행 조건:** Step 1 (chart.js 설치)
**작업 디렉토리:** `backend/src/` + `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 9-1 | `GET /stats/profit-loss` 백엔드 API | `routes/stats.ts` (신규), service 신규 |
| 9-2 | 라우터 등록 | `backend/src/index.ts` (라우트 마운트) |
| 9-3 | `StatsProfitView.vue` 신규 화면 | `views/admin/StatsProfitView.vue` |
| 9-4 | `useProfitStats.ts` composable | `composables/useProfitStats.ts` |
| 9-5 | Dual Axis Line Chart (매출 vs 매입 vs 이익) | 매출(실선) + 매입(점선) + 이익(영역 fill) |
| 9-6 | 요약 카드 4개 (총매출, 총매입, 순이익, 이익률%) | `StatsCard.vue` 활용 |
| 9-7 | 프론트엔드 라우터 등록 | `router/index.ts` |
| 9-8 | AdminLayout 사이드바 메뉴 추가 | `layouts/AdminLayout.vue` |

**9-1 API 상세:**

```typescript
// GET /api/v1/stats/profit-loss?startDate=...&endDate=...
// 매출(orders) + 매입(purchases) 교차 집계
{
  summary: { totalSales, totalPurchases, grossProfit, profitRate },
  daily: [{ date, sales, purchases, profit, rate }]
}
```

**DoD:**
- [ ] 손익분석 페이지 접근 가능 (사이드바 메뉴 + 라우트)
- [ ] Dual Line Chart에 매출/매입/이익 3개 데이터셋 표시
- [ ] 이익 영역이 fill 색상으로 강조
- [ ] 요약 카드에 이익률% 표시

---

### Step 10. 기간 비교 (증감률)

**선행 조건:** Step 5 (매출통계 완료)
**작업 디렉토리:** `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 10-1 | `useStatsDateRange`에 전기 날짜 계산 추가 | `composables/useStatsDateRange.ts` |
| 10-2 | `StatsCard.vue`에 증감률 표시 기능 추가 | `components/stats/StatsCard.vue` |
| 10-3 | 매출통계 요약 카드에 증감률 적용 | `views/admin/StatsSalesView.vue` |

**10-1 전기 계산 로직:**

```typescript
// 이번 달 → 지난 달, 이번 주 → 지난 주, 올해 → 작년
function getPreviousPeriod(period: Period, start: string, end: string) {
  // period에 따라 동일 길이의 이전 기간 반환
}
```

**10-2 StatsCard 증감률:**

```
┌──────────┐
│ 총매출액  │
│ 5,230,000│
│ +12.5% ↑ │  ← 녹색 화살표 (증가)
└──────────┘
```

**DoD:**
- [ ] 요약 카드에 전기 대비 증감률 (%) + 화살표 표시
- [ ] 증가 시 녹색 ↑, 감소 시 빨간색 ↓, 변화 없으면 회색 —
- [ ] 전기 데이터 없으면 증감률 숨김

---

### Step 11. CSV 내보내기

**선행 조건:** Step 5, 6, 7 (차트 데이터 존재)
**작업 디렉토리:** `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 11-1 | `useExportCsv` composable | `composables/useExportCsv.ts` |
| 11-2 | `StatsExportButton.vue` 구현 | `components/stats/StatsExportButton.vue` |
| 11-3 | 매출/상품/매입 통계에 내보내기 버튼 배치 | 각 Stats 뷰 |

**11-1 CSV 생성 로직 (라이브러리 불필요):**

```typescript
export function useExportCsv() {
  function exportToCsv(filename: string, headers: string[], rows: string[][]) {
    const bom = '\uFEFF'  // Excel 한글 깨짐 방지
    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }
  return { exportToCsv }
}
```

**DoD:**
- [ ] 각 통계 화면에 "CSV 다운로드" 버튼 존재
- [ ] 다운로드된 CSV가 Excel에서 한글 정상 표시 (BOM 포함)
- [ ] 파일명에 기간 포함: `매출통계_2026-03-01_2026-03-31.csv`

---

### Step 12. 대시보드 차트 위젯

**선행 조건:** Step 5 (차트 기반 + API 동작)
**작업 디렉토리:** `frontend/src/renderer/src/views/admin/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 12-1 | Mini Line Chart — 최근 7일 매출 추이 | `DashboardView.vue` |
| 12-2 | Mini Bar Chart — 베스트셀러 TOP 5 | `DashboardView.vue` |

**제약:** 대시보드 차트는 간결하게. 범례 숨김, 툴팁만 표시, 높이 150px 고정.

**DoD:**
- [ ] 대시보드에 7일 매출 추이 미니 Line 차트 표시
- [ ] 대시보드에 베스트셀러 TOP 5 미니 Bar 차트 표시
- [ ] 차트 클릭 시 해당 통계 상세 페이지로 이동

---

## Sprint 3: Could Have

### Step 13. 결제수단 통계 (신규 화면)

**선행 조건:** Step 1
**작업 디렉토리:** `backend/src/` + `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 13-1 | `payments/stats/summary` 백엔드 API | `routes/payments.ts` |
| 13-2 | `payments/stats/by-type` 백엔드 API | `routes/payments.ts` |
| 13-3 | `StatsPaymentView.vue` 신규 화면 | `views/admin/StatsPaymentView.vue` |
| 13-4 | Doughnut (결제수단별 비율) + Bar (성공/실패율) | 차트 구현 |
| 13-5 | 라우터 + 사이드바 등록 | `router/index.ts`, `AdminLayout.vue` |

---

### Step 14. 회원/포인트 통계 (신규 화면)

**선행 조건:** Step 1
**작업 디렉토리:** `backend/src/` + `frontend/src/renderer/src/`

| # | 작업 | 대상 파일 |
|---|------|----------|
| 14-1 | `members/stats/summary` 백엔드 API | `routes/members.ts` |
| 14-2 | `members/stats/points` 백엔드 API | `routes/members.ts` |
| 14-3 | `StatsMemberView.vue` 신규 화면 | `views/admin/StatsMemberView.vue` |
| 14-4 | Pie (등급 분포) + Dual Bar (포인트 적립/사용 추이) | 차트 구현 |
| 14-5 | 라우터 + 사이드바 등록 | `router/index.ts`, `AdminLayout.vue` |

---

## 파일 변경 요약

### 신규 파일 (frontend)

```
frontend/src/renderer/src/
  utils/
    chart-setup.ts                      ← Step 1
  composables/
    useStatsDateRange.ts                ← Step 2
    useChartOptions.ts                  ← Step 2
    useSalesStats.ts                    ← Step 5
    useProductStats.ts                  ← Step 6
    usePurchaseStats.ts                 ← Step 7
    useProfitStats.ts                   ← Step 9
    useExportCsv.ts                     ← Step 11
  components/stats/
    StatsPeriodSelector.vue             ← Step 2
    StatsCard.vue                       ← Step 2
    StatsEmptyState.vue                 ← Step 2
    StatsExportButton.vue               ← Step 11
  views/admin/
    StatsProfitView.vue                 ← Step 9
    StatsPaymentView.vue                ← Step 13
    StatsMemberView.vue                 ← Step 14
```

### 수정 파일 (frontend)

```
frontend/
  package.json                          ← Step 1 (chart.js, vue-chartjs 추가)
  src/renderer/src/
    views/admin/
      StatsSalesView.vue                ← Step 5 (차트 추가 + 리팩토링)
      StatsProductsView.vue             ← Step 6 (차트 추가 + 서버 집계 전환)
      StatsPurchaseView.vue             ← Step 7 (차트 추가 + 리팩토링)
      DashboardView.vue                 ← Step 12 (미니 차트 추가)
    router/index.ts                     ← Step 9, 13, 14 (라우트 추가)
    layouts/AdminLayout.vue             ← Step 9, 13, 14 (사이드바 메뉴 추가)
    components/index.ts                 ← Step 2 (export 추가)
    locales/ko.json                     ← Step 8 (stats 키 추가)
    locales/en.json                     ← Step 8
    locales/ja.json                     ← Step 8
    locales/zh.json                     ← Step 8
```

### 신규 파일 (backend)

```
backend/src/
  routes/stats.ts                       ← Step 9 (손익 API)
```

### 수정 파일 (backend)

```
backend/src/
  index.ts                              ← Step 9 (stats 라우트 마운트)
  routes/orders.ts                      ← Step 3 (hourly, products, daily 변경)
  routes/purchases.ts                   ← Step 4 (daily, by-supplier)
  routes/payments.ts                    ← Step 13 (stats 엔드포인트)
  routes/members.ts                     ← Step 14 (stats 엔드포인트)
  services/order.service.ts             ← Step 3 (집계 메서드 추가)
```

---

## 병렬 작업 가이드

```
병렬 그룹 A (백엔드): Step 3 + Step 4  ← 동시 작업 가능
병렬 그룹 B (프론트): Step 5 + Step 6 + Step 7  ← 그룹 A 완료 후 동시 작업 가능
병렬 그룹 C (확장):  Step 13 + Step 14  ← Sprint 3에서 동시 작업 가능
순차 필수: Step 1 → Step 2 → Step 5,6,7 → Step 8
순차 필수: Step 5 → Step 10 (증감률은 매출통계 완료 후)
순차 필수: Step 5,6,7 → Step 11 (내보내기는 데이터 있어야)
```