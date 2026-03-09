<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import '@/utils/chart-setup'
import { apiClient } from '@/services/api/client'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { useSalesStats } from '@/composables/useSalesStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsCard from '@/components/stats/StatsCard.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'
import StatsExportButton from '@/components/stats/StatsExportButton.vue'
import { useExportCsv } from '@/composables/useExportCsv'

const { activePeriod, startDate, endDate, selectPeriod, getPreviousPeriod, calcChangeRate } = useStatsDateRange()
const { lineChartOptions, barChartOptions, doughnutChartOptions, CHART_COLORS } = useChartOptions()
const {
  isLoading, dailyStats, hourlyStats, summary,
  totalSales, orderCount, avgOrderAmount, calcDailyAvg, loadStats,
} = useSalesStats()

// 전기 대비 증감률
const prevSummary = ref<{ totalRevenue: number; completedOrders: number } | null>(null)
const salesChangeRate = computed(() =>
  prevSummary.value ? calcChangeRate(totalSales.value, prevSummary.value.totalRevenue) : null,
)
const orderChangeRate = computed(() =>
  prevSummary.value ? calcChangeRate(orderCount.value, prevSummary.value.completedOrders) : null,
)

const lineRef = ref<InstanceType<typeof Line> | null>(null)
const barRef = ref<InstanceType<typeof Bar> | null>(null)
const doughnutRef = ref<InstanceType<typeof Doughnut> | null>(null)

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const dailyAvgSales = computed(() => calcDailyAvg(startDate.value, endDate.value))

// Chart data
const lineChartData = computed(() => ({
  labels: dailyStats.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      label: '매출액',
      data: dailyStats.value.map((d) => d.revenue),
      borderColor: CHART_COLORS.primary,
      backgroundColor: CHART_COLORS.primary + '20',
      fill: true,
      tension: 0.3,
      yAxisID: 'y',
    },
    {
      label: '주문건수',
      data: dailyStats.value.map((d) => d.count),
      borderColor: CHART_COLORS.success,
      backgroundColor: CHART_COLORS.success + '20',
      fill: false,
      tension: 0.3,
      yAxisID: 'y1',
    },
  ],
}))

const lineOptions = lineChartOptions({
  scales: {
    y: {
      beginAtZero: true,
      position: 'left',
      ticks: { callback: (value) => formatNumber(Number(value)) + '원' },
    },
    y1: {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { callback: (value) => value + '건' },
    },
  },
})

const barChartData = computed(() => ({
  labels: hourlyStats.value.map((h) => `${h.hour}시`),
  datasets: [
    {
      label: '시간대별 매출',
      data: hourlyStats.value.map((h) => h.revenue),
      backgroundColor: CHART_COLORS.info + '80',
      borderColor: CHART_COLORS.info,
      borderWidth: 1,
    },
  ],
}))

const doughnutChartData = computed(() => {
  const breakdown = summary.value?.statusBreakdown ?? {}
  const statusLabels: Record<string, string> = {
    COMPLETED: '완료',
    CANCELLED: '취소',
    PENDING: '대기',
    PAID: '결제완료',
    PREPARING: '준비중',
  }
  const statusColors: Record<string, string> = {
    COMPLETED: CHART_COLORS.success,
    CANCELLED: CHART_COLORS.danger,
    PENDING: CHART_COLORS.warning,
    PAID: CHART_COLORS.info,
    PREPARING: CHART_COLORS.purple,
  }
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0)
  return {
    labels: entries.map(([k]) => statusLabels[k] ?? k),
    datasets: [
      {
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([k]) => statusColors[k] ?? CHART_COLORS.slate),
      },
    ],
  }
})

const hasData = computed(() => dailyStats.value.length > 0)

const { exportToCsv } = useExportCsv()
function handleExport() {
  exportToCsv(
    `매출통계_${startDate.value}_${endDate.value}.csv`,
    ['날짜', '주문건수', '매출액'],
    dailyStats.value.map((d) => [d.date, String(d.count), String(d.revenue)]),
  )
}

async function handleLoad() {
  await loadStats(startDate.value, endDate.value)

  // 전기 데이터 로드
  try {
    const { prevStart, prevEnd } = getPreviousPeriod(activePeriod.value, startDate.value, endDate.value)
    const prevRes = await apiClient.get<{
      success: boolean
      data: { totalRevenue: number; completedOrders: number }
    }>(`/api/v1/orders/stats/summary?startDate=${prevStart}&endDate=${prevEnd}`)
    if (prevRes.data.success) {
      prevSummary.value = prevRes.data.data
    }
  } catch {
    prevSummary.value = null
  }
}

function handlePeriodUpdate(period: 'week' | 'month' | 'year') {
  selectPeriod(period, handleLoad)
}

onMounted(() => handleLoad())

onUnmounted(() => {
  lineRef.value?.chart?.destroy()
  barRef.value?.chart?.destroy()
  doughnutRef.value?.chart?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매출통계</h2>
        <p class="mt-1 text-sm text-slate-500">기간별 매출 현황을 조회합니다</p>
      </div>
      <div class="flex items-center gap-2">
        <StatsExportButton :disabled="!hasData" @export="handleExport" />
        <button
          class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="새로고침"
          @click="handleLoad"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <StatsPeriodSelector
      :active-period="activePeriod"
      :start-date="startDate"
      :end-date="endDate"
      @update:active-period="handlePeriodUpdate"
      @update:start-date="startDate = $event"
      @update:end-date="endDate = $event"
      @search="handleLoad"
    />

    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard label="총 매출액" :value="`${formatNumber(totalSales)}원`" color="text-indigo-600" :change-rate="salesChangeRate" />
        <StatsCard label="주문 건수" :value="`${formatNumber(orderCount)}건`" :change-rate="orderChangeRate" />
        <StatsCard label="평균 주문 금액" :value="`${formatNumber(avgOrderAmount)}원`" color="text-emerald-600" />
        <StatsCard label="일평균 매출" :value="`${formatNumber(dailyAvgSales)}원`" color="text-orange-600" />
      </div>

      <StatsEmptyState v-if="!hasData" message="해당 기간의 매출 데이터가 없습니다" />

      <template v-else>
        <!-- Charts Row -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="일별 매출 추이 차트">
            <h3 class="mb-3 font-semibold text-slate-800">일별 매출 추이</h3>
            <div class="h-64">
              <Line ref="lineRef" :data="lineChartData" :options="lineOptions" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-label="주문 상태 비율 차트">
            <h3 class="mb-3 font-semibold text-slate-800">주문 상태 비율</h3>
            <div class="h-64">
              <Doughnut ref="doughnutRef" :data="doughnutChartData" :options="doughnutChartOptions()" />
            </div>
          </div>
        </div>

        <!-- Hourly Bar -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="시간대별 매출 차트">
          <h3 class="mb-3 font-semibold text-slate-800">시간대별 매출</h3>
          <div class="h-56">
            <Bar ref="barRef" :data="barChartData" :options="barChartOptions()" />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">일별 매출 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">날짜</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">주문건수</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">매출액</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="day in [...dailyStats].reverse()"
                :key="day.date"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ formatDate(day.date) }}</td>
                <td class="px-6 py-4 text-center text-sm text-slate-600">{{ formatNumber(day.count) }}건</td>
                <td class="px-6 py-4 text-right text-sm font-medium text-indigo-600">{{ formatNumber(day.revenue) }}원</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td class="px-6 py-4 text-slate-700">합계</td>
                <td class="px-6 py-4 text-center text-slate-700">{{ formatNumber(orderCount) }}건</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(totalSales) }}원</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
