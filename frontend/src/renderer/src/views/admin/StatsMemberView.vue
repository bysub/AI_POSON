<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bar, Pie } from 'vue-chartjs'
import '@/utils/chart-setup'
import { useStatsDateRange } from '@/composables/useStatsDateRange'
import { useChartOptions } from '@/composables/useChartOptions'
import { useMemberStats } from '@/composables/useMemberStats'
import StatsPeriodSelector from '@/components/stats/StatsPeriodSelector.vue'
import StatsCard from '@/components/stats/StatsCard.vue'
import StatsEmptyState from '@/components/stats/StatsEmptyState.vue'
import StatsExportButton from '@/components/stats/StatsExportButton.vue'
import { useExportCsv } from '@/composables/useExportCsv'

const { activePeriod, startDate, endDate, selectPeriod } = useStatsDateRange()
const { barChartOptions, doughnutChartOptions, CHART_COLORS } = useChartOptions()
const { isLoading, memberSummary, pointSummary, pointDaily, loadStats } = useMemberStats()

const barRef = ref<InstanceType<typeof Bar> | null>(null)
const pieRef = ref<InstanceType<typeof Pie> | null>(null)

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

const gradeLabels: Record<string, string> = {
  NORMAL: '일반',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
  VVIP: 'VVIP',
}

const gradeColors: Record<string, string> = {
  NORMAL: CHART_COLORS.slate,
  SILVER: CHART_COLORS.info,
  GOLD: CHART_COLORS.warning,
  VIP: CHART_COLORS.purple,
  VVIP: CHART_COLORS.danger,
}

const hasData = computed(() => (memberSummary.value?.totalMembers ?? 0) > 0)
const hasPointData = computed(() => pointDaily.value.some((d) => d.earned > 0 || d.used > 0))

// Pie - 등급별 회원 분포
const pieChartData = computed(() => {
  const dist = memberSummary.value?.gradeDistribution ?? {}
  const entries = Object.entries(dist).filter(([, v]) => v > 0)

  return {
    labels: entries.map(([k]) => gradeLabels[k] ?? k),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([k]) => gradeColors[k] ?? CHART_COLORS.slate),
    }],
  }
})

// Bar - 일별 포인트 적립/사용 추이
const barChartData = computed(() => ({
  labels: pointDaily.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      label: '적립',
      data: pointDaily.value.map((d) => d.earned),
      backgroundColor: CHART_COLORS.success + '80',
      borderColor: CHART_COLORS.success,
      borderWidth: 1,
    },
    {
      label: '사용',
      data: pointDaily.value.map((d) => -d.used),
      backgroundColor: CHART_COLORS.danger + '80',
      borderColor: CHART_COLORS.danger,
      borderWidth: 1,
    },
  ],
}))

const { exportToCsv } = useExportCsv()
function handleExport() {
  exportToCsv(
    `회원포인트통계_${startDate.value}_${endDate.value}.csv`,
    ['날짜', '적립', '사용', '조정'],
    pointDaily.value.map((d) => [d.date, String(d.earned), String(d.used), String(d.adjusted)]),
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
        <h2 class="text-xl font-bold text-slate-800">회원/포인트 통계</h2>
        <p class="mt-1 text-sm text-slate-500">회원 현황 및 포인트 이력을 조회합니다</p>
      </div>
      <div class="flex items-center gap-2">
        <StatsExportButton :disabled="pointDaily.length === 0" @export="handleExport" />
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
      <!-- Member Summary Cards -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard label="총 회원수" :value="`${formatNumber(memberSummary?.totalMembers ?? 0)}명`" color="text-indigo-600" />
        <StatsCard label="이번 달 신규" :value="`${formatNumber(memberSummary?.newMembersThisMonth ?? 0)}명`" color="text-emerald-600" />
        <StatsCard label="보유 포인트" :value="`${formatNumber(memberSummary?.totalActivePoints ?? 0)}P`" color="text-orange-600" />
        <StatsCard label="누적 적립" :value="`${formatNumber(memberSummary?.totalEarnedPoints ?? 0)}P`" />
      </div>

      <StatsEmptyState v-if="!hasData" message="등록된 회원이 없습니다" />

      <template v-else>
        <!-- Charts Row -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-label="등급별 회원 분포 차트">
            <h3 class="mb-3 font-semibold text-slate-800">등급별 회원 분포</h3>
            <div class="h-64">
              <Pie ref="pieRef" :data="pieChartData" :options="doughnutChartOptions()" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3" aria-label="포인트 적립/사용 추이 차트">
            <h3 class="mb-3 font-semibold text-slate-800">포인트 적립/사용 추이</h3>
            <div class="h-64">
              <Bar v-if="hasPointData" ref="barRef" :data="barChartData" :options="barChartOptions()" />
              <div v-else class="flex h-full items-center justify-center text-sm text-slate-400">
                해당 기간의 포인트 이력이 없습니다
              </div>
            </div>
          </div>
        </div>

        <!-- Point Summary Cards -->
        <div v-if="pointSummary" class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatsCard label="기간 적립" :value="`${formatNumber(pointSummary.totalEarned)}P`" color="text-emerald-600" />
          <StatsCard label="기간 사용" :value="`${formatNumber(pointSummary.totalUsed)}P`" color="text-red-600" />
          <StatsCard label="수동 조정" :value="`${formatNumber(pointSummary.totalAdjusted)}P`" color="text-orange-600" />
          <StatsCard label="순 포인트" :value="`${formatNumber(pointSummary.netPoints)}P`" color="text-indigo-600" />
        </div>

        <!-- Grade Distribution Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">등급별 회원 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">등급</th>
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">회원수</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">비율</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(count, grade) in memberSummary?.gradeDistribution ?? {}"
                :key="grade"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                    :class="{
                      'bg-slate-100 text-slate-700': grade === 'NORMAL',
                      'bg-blue-100 text-blue-700': grade === 'SILVER',
                      'bg-yellow-100 text-yellow-700': grade === 'GOLD',
                      'bg-purple-100 text-purple-700': grade === 'VIP',
                      'bg-red-100 text-red-700': grade === 'VVIP',
                    }"
                  >
                    {{ gradeLabels[grade] ?? grade }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center text-sm font-medium text-slate-800">{{ formatNumber(count) }}명</td>
                <td class="px-6 py-4 text-right text-sm text-slate-600">
                  {{ memberSummary?.totalMembers ? Math.round((count / memberSummary.totalMembers) * 1000) / 10 : 0 }}%
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td class="px-6 py-4 text-slate-700">합계</td>
                <td class="px-6 py-4 text-center text-indigo-600">{{ formatNumber(memberSummary?.totalMembers ?? 0) }}명</td>
                <td class="px-6 py-4 text-right text-slate-700">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Point Daily Table -->
        <div v-if="hasPointData" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 class="font-semibold text-slate-800">일별 포인트 현황</h3>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50">
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">날짜</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">적립</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">사용</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">조정</th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">순 변동</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="day in [...pointDaily].filter(d => d.earned > 0 || d.used > 0 || d.adjusted !== 0).reverse()"
                :key="day.date"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ day.date }}</td>
                <td class="px-6 py-4 text-right text-sm text-emerald-600">+{{ formatNumber(day.earned) }}</td>
                <td class="px-6 py-4 text-right text-sm text-red-600">-{{ formatNumber(day.used) }}</td>
                <td class="px-6 py-4 text-right text-sm text-orange-600">{{ formatNumber(day.adjusted) }}</td>
                <td class="px-6 py-4 text-right text-sm font-medium" :class="day.earned - day.used + day.adjusted >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatNumber(day.earned - day.used + day.adjusted) }}
                </td>
              </tr>
            </tbody>
            <tfoot v-if="pointSummary">
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td class="px-6 py-4 text-slate-700">합계</td>
                <td class="px-6 py-4 text-right text-emerald-600">+{{ formatNumber(pointSummary.totalEarned) }}</td>
                <td class="px-6 py-4 text-right text-red-600">-{{ formatNumber(pointSummary.totalUsed) }}</td>
                <td class="px-6 py-4 text-right text-orange-600">{{ formatNumber(pointSummary.totalAdjusted) }}</td>
                <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(pointSummary.netPoints) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
