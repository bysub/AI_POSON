import { ref } from 'vue'
import { apiClient } from '@/services/api/client'

export interface ProductSalesSummary {
  productId: number
  name: string
  categoryName: string
  totalQuantity: number
  totalAmount: number
}

export function useProductStats() {
  const isLoading = ref(false)
  const productStats = ref<ProductSalesSummary[]>([])

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const res = await apiClient.get<{
        success: boolean
        data: ProductSalesSummary[]
      }>(`/api/v1/orders/stats/products?startDate=${startDate}&endDate=${endDate}&limit=50`)

      if (res.data.success) {
        productStats.value = res.data.data
      }
    } catch (err) {
      console.error('Failed to load product stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, productStats, loadStats }
}
