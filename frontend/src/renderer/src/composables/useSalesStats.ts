import { ref, computed } from 'vue'
import { apiClient } from '@/services/api/client'

interface DailyStats {
  date: string
  count: number
  revenue: number
}

interface HourlyStats {
  hour: number
  count: number
  revenue: number
}

interface StatsSummary {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  pendingOrders: number
  totalRevenue: number
  statusBreakdown: Record<string, number>
}

export function useSalesStats() {
  const isLoading = ref(false)
  const dailyStats = ref<DailyStats[]>([])
  const hourlyStats = ref<HourlyStats[]>([])
  const summary = ref<StatsSummary | null>(null)

  const totalSales = computed(() => summary.value?.totalRevenue ?? 0)
  const orderCount = computed(() => summary.value?.completedOrders ?? 0)
  const avgOrderAmount = computed(() =>
    orderCount.value > 0 ? Math.round(totalSales.value / orderCount.value) : 0,
  )

  function calcDailyAvg(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    return Math.round(totalSales.value / days)
  }

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const params = `startDate=${startDate}&endDate=${endDate}`
      const [summaryRes, dailyRes, hourlyRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: StatsSummary }>(`/api/v1/orders/stats/summary?${params}`),
        apiClient.get<{ success: boolean; data: DailyStats[] }>(`/api/v1/orders/stats/daily?${params}`),
        apiClient.get<{ success: boolean; data: HourlyStats[] }>(`/api/v1/orders/stats/hourly?${params}`),
      ])

      if (summaryRes.data.success) summary.value = summaryRes.data.data
      if (dailyRes.data.success) dailyStats.value = dailyRes.data.data
      if (hourlyRes.data.success) hourlyStats.value = hourlyRes.data.data
    } catch (err) {
      console.error('Failed to load sales stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    dailyStats,
    hourlyStats,
    summary,
    totalSales,
    orderCount,
    avgOrderAmount,
    calcDailyAvg,
    loadStats,
  }
}
