<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import '@/utils/chart-setup'
import { apiClient } from '@/services/api/client'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { usePurchaseStats } from '@/composables/usePurchaseStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsCard from '@/components/stats/StatsCard.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'
import StatsExportButton from '@/components/stats/StatsExportButton.vue'
import { useExportCsv } from '@/composables/useExportCsv'
import type { PurchaseStatus } from '@/types'

interface PurchaseData {
  id: number
  purchaseCode: string
  totalAmount: string
  taxAmount: string
  status: PurchaseStatus
  purchaseDate: string
  supplier: { name: string }
}

const purchaseStatusConfig: Record<PurchaseStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: '임시저장', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CONFIRMED: { label: '확정', bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { label: '취소', bg: 'bg-red-100', text: 'text-red-700' },
}

const { activePeriod, startDate, endDate, selectPeriod } = useStatsDateRange()
const { barChartOptions, doughnutChartOptions, horizontalBarOptions, CHART_COLORS } = useChartOptions()
const { isLoading: statsLoading, dailyStats, supplierStats, productStats, summary, loadStats } = usePurchaseStats()

const purchases = ref<PurchaseData[]>([])
const isLoading = ref(false)

const barRef = ref<InstanceType<typeof Bar> | null>(null)
const doughnutRef = ref<InstanceType<typeof Doughnut> | null>(null)

function formatNumber(n: number | string): string {
  return new Intl.NumberFormat('ko-KR').format(Number(n))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const totalAmount = computed(() => Number(summary.value.totalAmount))
const purchaseCount = computed(() => summary.value.count)
const avgAmount = computed(() => purchaseCount.value > 0 ? Math.round(totalAmount.value / purchaseCount.value) : 0)

const hasChartData = computed(() => dailyStats.value.some((d) => d.totalAmount > 0))

const { exportToCsv } = useExportCsv()
function handleExport() {
  exportToCsv(
    `매입통계_${startDate.value}_${endDate.value}.csv`,
    ['매입코드', '거래처', '매입일', '금액', '상태'],
    purchases.value.map((p) => [p.purchaseCode, p.supplier?.name ?? '-', p.purchaseDate.slice(0, 10), p.totalAmount, p.status]),
  )
}

const chartColors = [
  CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning,
  CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.purple,
  CHART_COLORS.orange, CHART_COLORS.teal, CHART_COLORS.slate, CHART_COLORS.pink,
]

// Bar Chart - 기간별 매입
const barChartData = computed(() => ({
  labels: dailyStats.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      label: '매입액',
      data: dailyStats.value.map((d) => d.totalAmount),
      backgroundColor: CHART_COLORS.info + '80',
      borderColor: CHART_COLORS.info,
      borderWidth: 1,
    },
  ],
}))

// Doughnut - 거래처별 매입 비율
const doughnutChartData = computed(() => {
  const top5 = supplierStats.value.slice(0, 5)
  const rest = supplierStats.value.slice(5)
  const etcAmount = rest.reduce((s, r) => s + r.totalAmount, 0)

  const labels = top5.map((s) => s.supplierName)
  const data = top5.map((s) => s.totalAmount)
  if (etcAmount > 0) {
    labels.push('기타')
    data.push(etcAmount)
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: chartColors.slice(0, labels.length),
    }],
  }
})

// Horizontal Bar - 상품별 매입 TOP 10
const productBarData = computed(() => ({
  labels: productStats.value.map((p) => p.productName),
  datasets: [{
    label: '매입액',
    data: productStats.value.map((p) => p.totalAmount),
    backgroundColor: chartColors.slice(0, productStats.value.length),
    borderWidth: 0,
  }],
}))

const hasProductData = computed(() => productStats.value.length > 0)

async function handleLoad() {
  isLoading.value = true
  try {
    await loadStats(startDate.value, endDate.value)

    const listRes = await apiClient.get<{
      success: boolean
      data: PurchaseData[]
    }>(`/api/v1/purchases?startDate=${startDate.value}&endDate=${endDate.value}`)
    if (listRes.data.success) purchases.value = listRes.data.data
  } catch (err) {
    console.error('Failed to load purchase data:', err)
  } finally {
    isLoading.value = false
  }
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
        <h2 class="text-xl font-bold text-slate-800">매입통계</h2>
        <p class="mt-1 text-sm text-slate-500">기간별 매입 현황을 조회합니다</p>
      </div>
      <div class="flex items-center gap-2">
        <StatsExportButton :disabled="purchases.length === 0" @export="handleExport" />
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

    <div v-if="isLoading || statsLoading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard label="총 매입액" :value="`${formatNumber(totalAmount)}원`" color="text-indigo-600" />
        <StatsCard label="매입 건수" :value="`${formatNumber(purchaseCount)}건`" />
        <StatsCard label="평균 매입 단가" :value="`${formatNumber(avgAmount)}원`" color="text-emerald-600" />
      </div>

      <StatsEmptyState v-if="!hasChartData && purchases.length === 0" message="해당 기간의 매입 데이터가 없습니다" />

      <template v-else>
        <!-- Charts Row -->
        <div v-if="hasChartData" class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="기간별 매입 추이 차트">
            <h3 class="mb-3 font-semibold text-slate-800">기간별 매입 추이</h3>
            <div class="h-64">
              <Bar ref="barRef" :data="barChartData" :options="barChartOptions()" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-label="거래처별 매입 비율 차트">
            <h3 class="mb-3 font-semibold text-slate-800">거래처별 매입 비율</h3>
            <div class="h-64">
              <Doughnut ref="doughnutRef" :data="doughnutChartData" :options="doughnutChartOptions()" />
            </div>
          </div>
        </div>

        <!-- Product Purchase Chart + List -->
        <div v-if="hasProductData" class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="상품별 매입 TOP 10 차트">
            <h3 class="mb-3 font-semibold text-slate-800">상품별 매입 TOP 10 (금액)</h3>
            <div class="h-72">
              <Bar :data="productBarData" :options="horizontalBarOptions()" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 class="mb-3 font-semibold text-slate-800">상품별 매입 현황</h3>
            <div class="space-y-2">
              <div
                v-for="(item, index) in productStats"
                :key="item.purchaseProductId"
                class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    :class="index < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ index + 1 }}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-slate-800">{{ item.productName }}</p>
                    <p class="text-xs text-slate-400">{{ item.totalQuantity }}개 / {{ item.count }}건</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-slate-800">{{ formatNumber(item.totalAmount) }}원</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">매입 내역</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">매입코드</th>
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">거래처</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">매입일</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">금액</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="purchase in purchases"
                :key="purchase.id"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4">
                  <span class="font-mono text-sm font-medium text-indigo-600">{{ purchase.purchaseCode }}</span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-800">{{ purchase.supplier?.name ?? '-' }}</td>
                <td class="px-6 py-4 text-center text-sm text-slate-600">{{ formatDate(purchase.purchaseDate) }}</td>
                <td class="px-6 py-4 text-right text-sm font-medium text-slate-800">{{ formatNumber(purchase.totalAmount) }}원</td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="[
                      purchaseStatusConfig[purchase.status]?.bg ?? 'bg-slate-100',
                      purchaseStatusConfig[purchase.status]?.text ?? 'text-slate-500',
                    ]"
                  >
                    {{ purchaseStatusConfig[purchase.status]?.label ?? purchase.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="purchases.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                  해당 기간의 매입 데이터가 없습니다
                </td>
              </tr>
            </tbody>
            <tfoot v-if="purchases.length > 0">
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td colspan="3" class="px-6 py-4 text-slate-700">합계 ({{ purchases.length }}건)</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(purchases.reduce((s, p) => s + Number(p.totalAmount), 0)) }}원</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
