import { ref } from 'vue'
import { apiClient } from '@/services/api/client'

interface MemberSummary {
  totalMembers: number
  gradeDistribution: Record<string, number>
  newMembersThisMonth: number
  totalActivePoints: number
  totalEarnedPoints: number
}

interface PointDaily {
  date: string
  earned: number
  used: number
  adjusted: number
}

interface PointSummary {
  totalEarned: number
  totalUsed: number
  totalAdjusted: number
  netPoints: number
}

export function useMemberStats() {
  const isLoading = ref(false)
  const memberSummary = ref<MemberSummary | null>(null)
  const pointSummary = ref<PointSummary | null>(null)
  const pointDaily = ref<PointDaily[]>([])

  async function loadStats(startDate: string, endDate: string) {
    isLoading.value = true
    try {
      const params = `startDate=${startDate}&endDate=${endDate}`
      const [memberRes, pointRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: MemberSummary }>('/api/v1/members/stats/summary'),
        apiClient.get<{ success: boolean; data: { summary: PointSummary; daily: PointDaily[] } }>(`/api/v1/members/stats/points?${params}`),
      ])

      if (memberRes.data.success) memberSummary.value = memberRes.data.data
      if (pointRes.data.success) {
        pointSummary.value = pointRes.data.data.summary
        pointDaily.value = pointRes.data.data.daily
      }
    } catch (err) {
      console.error('Failed to load member stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, memberSummary, pointSummary, pointDaily, loadStats }
}
