import { ref } from 'vue'
import { apiClient } from '@/services/api/client'

interface PaymentSummary {
  totalCount: number
  totalAmount: number
  approvedCount: number
  failedCount: number
  cancelledCount: number
  successRate: number
}

interface PaymentByType {
  type: string
  count: number
  amount: number
  approved: number
  failed: number
  successRate: number
}

interface PaymentDaily {
  date: string
  count: number
  amount: number
}

export function usePaymentStats() {
  const isLoading = ref(false)
  const summary = ref<PaymentSummary | null>(null)
  const byType = ref<PaymentByType[]>([])
  const dailyStats = ref<PaymentDaily[]>([])

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const params = `startDate=${startDate}&endDate=${endDate}`
      const [summaryRes, typeRes, dailyRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: PaymentSummary }>(`/api/v1/payments/stats/summary?${params}`),
        apiClient.get<{ success: boolean; data: PaymentByType[] }>(`/api/v1/payments/stats/by-type?${params}`),
        apiClient.get<{ success: boolean; data: PaymentDaily[] }>(`/api/v1/payments/stats/daily?${params}`),
      ])

      if (summaryRes.data.success) summary.value = summaryRes.data.data
      if (typeRes.data.success) byType.value = typeRes.data.data
      if (dailyRes.data.success) dailyStats.value = dailyRes.data.data
    } catch (err) {
      console.error('Failed to load payment stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, summary, byType, dailyStats, loadStats }
}
