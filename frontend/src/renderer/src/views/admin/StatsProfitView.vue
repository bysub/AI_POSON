<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import '@/utils/chart-setup'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { useProfitStats } from '@/composables/useProfitStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsCard from '@/components/stats/StatsCard.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'

const { activePeriod, startDate, endDate, selectPeriod } = useStatsDateRange()
const { CHART_COLORS } = useChartOptions()
const { isLoading, summary, daily, loadStats } = useProfitStats()

const lineRef = ref<InstanceType<typeof Line> | null>(null)

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const hasData = computed(() => daily.value.length > 0)

const lineChartData = computed(() => ({
  labels: daily.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      label: '매출',
      data: daily.value.map((d) => d.sales),
      borderColor: CHART_COLORS.primary,
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.3,
    },
    {
      label: '매입',
      data: daily.value.map((d) => d.purchases),
      borderColor: CHART_COLORS.danger,
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.3,
    },
    {
      label: '이익',
      data: daily.value.map((d) => d.profit),
      borderColor: CHART_COLORS.success,
      backgroundColor: CHART_COLORS.success + '20',
      fill: true,
      borderWidth: 2,
      tension: 0.3,
    },
  ],
}))

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      ticks: {
        callback: (value: string | number) => formatNumber(Number(value)) + '원',
      },
    },
  },
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}원`,
      },
    },
    legend: {
      position: 'bottom' as const,
      labels: { usePointStyle: true, padding: 16 },
    },
  },
  animation: { duration: 600 },
}

async function handleLoad() {
  await loadStats(startDate.value, endDate.value)
}

function handlePeriodUpdate(period: 'week' | 'month' | 'year') {
  selectPeriod(period, handleLoad)
}

onMounted(() => handleLoad())

onUnmounted(() => {
  lineRef.value?.chart?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">손익분석</h2>
        <p class="mt-1 text-sm text-slate-500">매출과 매입을 비교하여 손익을 분석합니다</p>
      </div>
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
        <StatsCard label="총 매출" :value="`${formatNumber(summary.totalSales)}원`" color="text-indigo-600" />
        <StatsCard label="총 매입" :value="`${formatNumber(summary.totalPurchases)}원`" color="text-red-500" />
        <StatsCard
          label="순이익"
          :value="`${formatNumber(summary.grossProfit)}원`"
          :color="summary.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'"
        />
        <StatsCard label="이익률" :value="`${summary.profitRate}%`" color="text-orange-600" />
      </div>

      <StatsEmptyState v-if="!hasData" message="해당 기간의 손익 데이터가 없습니다" />

      <template v-else>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="매출 매입 이익 추이 차트">
          <h3 class="mb-3 font-semibold text-slate-800">매출 / 매입 / 이익 추이</h3>
          <div class="h-72">
            <Line ref="lineRef" :data="lineChartData" :options="lineOptions" />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">일별 손익 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">날짜</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">매출</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">매입</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">이익</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">이익률</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="d in [...daily].reverse()"
                :key="d.date"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ formatDate(d.date) }}</td>
                <td class="px-6 py-4 text-right text-sm text-indigo-600">{{ formatNumber(d.sales) }}원</td>
                <td class="px-6 py-4 text-right text-sm text-red-500">{{ formatNumber(d.purchases) }}원</td>
                <td
                  class="px-6 py-4 text-right text-sm font-medium"
                  :class="d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'"
                >
                  {{ formatNumber(d.profit) }}원
                </td>
                <td class="px-6 py-4 text-right text-sm text-slate-600">{{ d.rate }}%</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td class="px-6 py-4 text-slate-700">합계</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(summary.totalSales) }}원</td>
                <td class="px-6 py-4 text-right text-red-500">{{ formatNumber(summary.totalPurchases) }}원</td>
                <td
                  class="px-6 py-4 text-right"
                  :class="summary.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'"
                >
                  {{ formatNumber(summary.grossProfit) }}원
                </td>
                <td class="px-6 py-4 text-right text-slate-600">{{ summary.profitRate }}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
