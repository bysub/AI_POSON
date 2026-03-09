import { ref } from 'vue'
import { apiClient } from '@/services/api/client'

interface ProfitSummary {
  totalSales: number
  totalPurchases: number
  grossProfit: number
  profitRate: number
}

interface ProfitDaily {
  date: string
  sales: number
  purchases: number
  profit: number
  rate: number
}

export function useProfitStats() {
  const isLoading = ref(false)
  const summary = ref<ProfitSummary>({ totalSales: 0, totalPurchases: 0, grossProfit: 0, profitRate: 0 })
  const daily = ref<ProfitDaily[]>([])

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const res = await apiClient.get<{
        success: boolean
        data: { summary: ProfitSummary; daily: ProfitDaily[] }
      }>(`/api/v1/stats/profit-loss?startDate=${startDate}&endDate=${endDate}`)

      if (res.data.success) {
        summary.value = res.data.data.summary
        daily.value = res.data.data.daily
      }
    } catch (err) {
      console.error('Failed to load profit stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, summary, daily, loadStats }
}
