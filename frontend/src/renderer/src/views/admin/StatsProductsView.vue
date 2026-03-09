<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bar, Pie } from 'vue-chartjs'
import '@/utils/chart-setup'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { useProductStats } from '@/composables/useProductStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'
import StatsExportButton from '@/components/stats/StatsExportButton.vue'
import { useExportCsv } from '@/composables/useExportCsv'

const { activePeriod, startDate, endDate, selectPeriod } = useStatsDateRange()
const { horizontalBarOptions, doughnutChartOptions, CHART_COLORS } = useChartOptions()
const { isLoading, productStats, loadStats } = useProductStats()

const barRef = ref<InstanceType<typeof Bar> | null>(null)
const pieRef = ref<InstanceType<typeof Pie> | null>(null)

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

const bestSellers = computed(() => productStats.value.slice(0, 10))
const hasData = computed(() => productStats.value.length > 0)

function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-yellow-100 text-yellow-700'
  if (rank === 2) return 'bg-slate-200 text-slate-700'
  if (rank === 3) return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}

const chartColors = [
  CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning,
  CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.purple,
  CHART_COLORS.orange, CHART_COLORS.teal, CHART_COLORS.slate, CHART_COLORS.pink,
]

// Horizontal Bar - TOP 10
const barChartData = computed(() => ({
  labels: bestSellers.value.map((p) => p.name),
  datasets: [
    {
      label: '판매수량',
      data: bestSellers.value.map((p) => p.totalQuantity),
      backgroundColor: chartColors.slice(0, bestSellers.value.length),
      borderWidth: 0,
    },
  ],
}))

// Pie - 카테고리별 매출 비율
const pieChartData = computed(() => {
  const catMap = new Map<string, number>()
  for (const item of productStats.value) {
    const cat = item.categoryName || '-'
    catMap.set(cat, (catMap.get(cat) ?? 0) + item.totalAmount)
  }

  const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((s, [, v]) => s + v, 0)

  // 5% 미만은 "기타"로 그룹
  const threshold = total * 0.05
  const main: [string, number][] = []
  let etcAmount = 0
  for (const [name, amount] of sorted) {
    if (amount < threshold) {
      etcAmount += amount
    } else {
      main.push([name, amount])
    }
  }
  if (etcAmount > 0) main.push(['기타', etcAmount])

  return {
    labels: main.map(([name]) => name),
    datasets: [
      {
        data: main.map(([, amount]) => amount),
        backgroundColor: chartColors.slice(0, main.length),
      },
    ],
  }
})

const { exportToCsv } = useExportCsv()
function handleExport() {
  exportToCsv(
    `상품통계_${startDate.value}_${endDate.value}.csv`,
    ['상품명', '카테고리', '판매수량', '매출액'],
    productStats.value.map((p) => [p.name, p.categoryName, String(p.totalQuantity), String(p.totalAmount)]),
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
  pieRef.value?.chart?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">상품통계</h2>
        <p class="mt-1 text-sm text-slate-500">상품별 판매 현황을 확인합니다</p>
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
      <StatsEmptyState v-if="!hasData" message="해당 기간의 상품별 판매 데이터가 없습니다" />

      <template v-else>
        <!-- Charts Row -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="베스트셀러 TOP 10 차트">
            <h3 class="mb-3 font-semibold text-slate-800">베스트셀러 TOP 10 (판매수량)</h3>
            <div class="h-72">
              <Bar ref="barRef" :data="barChartData" :options="horizontalBarOptions()" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-label="카테고리별 매출 비율 차트">
            <h3 class="mb-3 font-semibold text-slate-800">카테고리별 매출 비율</h3>
            <div class="h-72">
              <Pie ref="pieRef" :data="pieChartData" :options="doughnutChartOptions()" />
            </div>
          </div>
        </div>

        <!-- Best Sellers List -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-slate-800">베스트셀러 TOP 10</h3>
          <div class="space-y-2">
            <div
              v-for="(item, index) in bestSellers"
              :key="item.productId"
              class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100"
            >
              <div class="flex items-center gap-3">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                  :class="getRankBg(index + 1)"
                >
                  {{ index + 1 }}
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-800">{{ item.name }}</p>
                  <p class="text-xs text-slate-400">{{ item.categoryName }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-slate-800">{{ formatNumber(item.totalQuantity) }}개</p>
                <p class="text-xs text-slate-500">{{ formatNumber(item.totalAmount) }}원</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">상품별 판매 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">상품명</th>
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">카테고리</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">판매수량</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">매출액</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="item in productStats"
                :key="item.productId"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ item.name }}</td>
                <td class="px-6 py-4 text-sm text-slate-600">{{ item.categoryName }}</td>
                <td class="px-6 py-4 text-center text-sm text-slate-600">{{ formatNumber(item.totalQuantity) }}개</td>
                <td class="px-6 py-4 text-right text-sm font-medium text-indigo-600">{{ formatNumber(item.totalAmount) }}원</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td colspan="2" class="px-6 py-4 text-slate-700">합계 ({{ productStats.length }}개 상품)</td>
                <td class="px-6 py-4 text-center text-slate-700">{{ formatNumber(productStats.reduce((s, i) => s + i.totalQuantity, 0)) }}개</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(productStats.reduce((s, i) => s + i.totalAmount, 0)) }}원</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
