<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import '@/utils/chart-setup'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { usePaymentStats } from '@/composables/usePaymentStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsCard from '@/components/stats/StatsCard.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'
import StatsExportButton from '@/components/stats/StatsExportButton.vue'
import { useExportCsv } from '@/composables/useExportCsv'

const { activePeriod, startDate, endDate, selectPeriod } = useStatsDateRange()
const { barChartOptions, doughnutChartOptions, CHART_COLORS } = useChartOptions()
const { isLoading, summary, byType, dailyStats, loadStats } = usePaymentStats()

const barRef = ref<InstanceType<typeof Bar> | null>(null)
const doughnutRef = ref<InstanceType<typeof Doughnut> | null>(null)

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

const paymentTypeLabels: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  SIMPLE_PAY: '간편결제',
  POINT: '포인트',
  MIXED: '복합결제',
}

const chartColors = [
  CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning,
  CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.purple,
]

// 건수 전용 차트 옵션
const countBarOptions = barChartOptions({
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `${value}건`,
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}건`,
      },
    },
  },
})

const hasData = computed(() => (summary.value?.totalCount ?? 0) > 0)

// Doughnut - 결제수단별 비율
const doughnutChartData = computed(() => ({
  labels: byType.value.map((t) => paymentTypeLabels[t.type] ?? t.type),
  datasets: [{
    data: byType.value.map((t) => t.amount),
    backgroundColor: chartColors.slice(0, byType.value.length),
  }],
}))

// Bar - 결제수단별 성공/실패
const barTypeChartData = computed(() => ({
  labels: byType.value.map((t) => paymentTypeLabels[t.type] ?? t.type),
  datasets: [
    {
      label: '승인',
      data: byType.value.map((t) => t.approved),
      backgroundColor: CHART_COLORS.success + '80',
      borderColor: CHART_COLORS.success,
      borderWidth: 1,
    },
    {
      label: '실패',
      data: byType.value.map((t) => t.failed),
      backgroundColor: CHART_COLORS.danger + '80',
      borderColor: CHART_COLORS.danger,
      borderWidth: 1,
    },
  ],
}))

// Bar - 일별 결제 추이
const dailyBarData = computed(() => ({
  labels: dailyStats.value.map((d) => d.date.slice(5)),
  datasets: [{
    label: '결제액',
    data: dailyStats.value.map((d) => d.amount),
    backgroundColor: CHART_COLORS.primary + '80',
    borderColor: CHART_COLORS.primary,
    borderWidth: 1,
  }],
}))

const hasDailyData = computed(() => dailyStats.value.some((d) => d.amount > 0))

const { exportToCsv } = useExportCsv()
function handleExport() {
  exportToCsv(
    `결제통계_${startDate.value}_${endDate.value}.csv`,
    ['결제수단', '건수', '금액', '승인', '실패', '성공률'],
    byType.value.map((t) => [
      paymentTypeLabels[t.type] ?? t.type,
      String(t.count), String(t.amount),
      String(t.approved), String(t.failed), `${t.successRate}%`,
    ]),
  )
}

async function handleLoad() {
  await loadStats(startDate.value, endDate.value)
}

function handlePeriodUpdate(period: 'week' | 'month' | 'year') {
  selectPeriod(period, handleLoad)
}

onMounted(() => handleLoad())

onUnmounted(() => {
  barRef.value?.chart?.destroy()
  doughnutRef.value?.chart?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">결제수단 통계</h2>
        <p class="mt-1 text-sm text-slate-500">결제수단별 현황을 조회합니다</p>
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
        <StatsCard label="총 결제 건수" :value="`${formatNumber(summary?.totalCount ?? 0)}건`" />
        <StatsCard label="총 결제 금액" :value="`${formatNumber(summary?.totalAmount ?? 0)}원`" color="text-indigo-600" />
        <StatsCard label="성공률" :value="`${summary?.successRate ?? 0}%`" color="text-emerald-600" />
        <StatsCard label="취소 건수" :value="`${formatNumber(summary?.cancelledCount ?? 0)}건`" color="text-red-600" />
      </div>

      <StatsEmptyState v-if="!hasData" message="해당 기간의 결제 데이터가 없습니다" />

      <template v-else>
        <!-- Charts Row -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="결제수단별 성공/실패 차트">
            <h3 class="mb-3 font-semibold text-slate-800">결제수단별 성공/실패</h3>
            <div class="h-64">
              <Bar ref="barRef" :data="barTypeChartData" :options="countBarOptions" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-label="결제수단별 비율 차트">
            <h3 class="mb-3 font-semibold text-slate-800">결제수단별 비율</h3>
            <div class="h-64">
              <Doughnut ref="doughnutRef" :data="doughnutChartData" :options="doughnutChartOptions()" />
            </div>
          </div>
        </div>

        <!-- Daily Trend -->
        <div v-if="hasDailyData" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="일별 결제 추이 차트">
          <h3 class="mb-3 font-semibold text-slate-800">일별 결제 추이</h3>
          <div class="h-56">
            <Bar :data="dailyBarData" :options="barChartOptions()" />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">결제수단별 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">결제수단</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">건수</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">금액</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">승인</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">실패</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">성공률</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="item in byType"
                :key="item.type"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ paymentTypeLabels[item.type] ?? item.type }}</td>
                <td class="px-6 py-4 text-center text-sm text-slate-600">{{ formatNumber(item.count) }}건</td>
                <td class="px-6 py-4 text-right text-sm font-medium text-indigo-600">{{ formatNumber(item.amount) }}원</td>
                <td class="px-6 py-4 text-center text-sm text-emerald-600">{{ formatNumber(item.approved) }}</td>
                <td class="px-6 py-4 text-center text-sm text-red-600">{{ formatNumber(item.failed) }}</td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="item.successRate >= 95 ? 'bg-green-100 text-green-700' : item.successRate >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ item.successRate }}%
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="byType.length > 0">
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td class="px-6 py-4 text-slate-700">합계</td>
                <td class="px-6 py-4 text-center text-slate-700">{{ formatNumber(summary?.totalCount ?? 0) }}건</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(summary?.totalAmount ?? 0) }}원</td>
                <td class="px-6 py-4 text-center text-emerald-600">{{ formatNumber(summary?.approvedCount ?? 0) }}</td>
                <td class="px-6 py-4 text-center text-red-600">{{ formatNumber(summary?.failedCount ?? 0) }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {{ summary?.successRate ?? 0 }}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
