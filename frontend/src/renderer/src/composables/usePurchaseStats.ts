import { ref } from 'vue'
import { apiClient } from '@/services/api/client'

interface PurchaseDailyStats {
  date: string
  count: number
  totalAmount: number
}

interface SupplierStats {
  supplierId: number
  supplierName: string
  count: number
  totalAmount: number
}

interface ProductPurchaseStats {
  purchaseProductId: number
  productName: string
  barcode: string
  totalQuantity: number
  totalAmount: number
  count: number
}

interface PurchaseStatsSummary {
  totalAmount: number | string
  taxAmount?: number | string
  count: number
}

export function usePurchaseStats() {
  const isLoading = ref(false)
  const dailyStats = ref<PurchaseDailyStats[]>([])
  const supplierStats = ref<SupplierStats[]>([])
  const productStats = ref<ProductPurchaseStats[]>([])
  const summary = ref<PurchaseStatsSummary>({ totalAmount: 0, count: 0 })

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const params = `startDate=${startDate}&endDate=${endDate}`
      const [summaryRes, dailyRes, supplierRes, productRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: PurchaseStatsSummary }>(`/api/v1/purchases/stats/summary?${params}`).catch(() => null),
        apiClient.get<{ success: boolean; data: PurchaseDailyStats[] }>(`/api/v1/purchases/stats/daily?${params}`),
        apiClient.get<{ success: boolean; data: SupplierStats[] }>(`/api/v1/purchases/stats/by-supplier?${params}`),
        apiClient.get<{ success: boolean; data: ProductPurchaseStats[] }>(`/api/v1/purchases/stats/by-product?${params}&limit=10`),
      ])

      if (summaryRes?.data.success) summary.value = summaryRes.data.data
      if (dailyRes.data.success) dailyStats.value = dailyRes.data.data
      if (supplierRes.data.success) supplierStats.value = supplierRes.data.data
      if (productRes.data.success) productStats.value = productRes.data.data
    } catch (err) {
      console.error('Failed to load purchase stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, dailyStats, supplierStats, productStats, summary, loadStats }
}
