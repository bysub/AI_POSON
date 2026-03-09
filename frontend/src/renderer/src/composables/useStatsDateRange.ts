import { ref } from 'vue'

export type Period = 'week' | 'month' | 'year'

export function useStatsDateRange() {
  const activePeriod = ref<Period>('month')
  const startDate = ref('')
  const endDate = ref('')

  function formatDateISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function calcDateRange(period: Period): void {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start: Date
    switch (period) {
      case 'week':
        start = new Date(end)
        start.setDate(start.getDate() - 6)
        break
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1)
        break
      case 'year':
        start = new Date(end.getFullYear(), 0, 1)
        break
    }
    startDate.value = formatDateISO(start)
    endDate.value = formatDateISO(end)
  }

  function selectPeriod(period: Period, onLoad: () => void): void {
    activePeriod.value = period
    calcDateRange(period)
    onLoad()
  }

  function getPreviousPeriod(period: Period, start: string, end: string): { prevStart: string; prevEnd: string } {
    const s = new Date(start)
    const e = new Date(end)
    const diffMs = e.getTime() - s.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    let prevStart: Date
    let prevEnd: Date

    switch (period) {
      case 'week':
        prevEnd = new Date(s)
        prevEnd.setDate(prevEnd.getDate() - 1)
        prevStart = new Date(prevEnd)
        prevStart.setDate(prevStart.getDate() - 6)
        break
      case 'month':
        prevStart = new Date(s.getFullYear(), s.getMonth() - 1, 1)
        prevEnd = new Date(s.getFullYear(), s.getMonth(), 0)
        break
      case 'year':
        prevStart = new Date(s.getFullYear() - 1, 0, 1)
        prevEnd = new Date(s.getFullYear() - 1, 11, 31)
        break
      default:
        prevEnd = new Date(s)
        prevEnd.setDate(prevEnd.getDate() - 1)
        prevStart = new Date(prevEnd)
        prevStart.setDate(prevStart.getDate() - diffDays)
    }

    return { prevStart: formatDateISO(prevStart), prevEnd: formatDateISO(prevEnd) }
  }

  function calcChangeRate(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null
    return Math.round(((current - previous) / previous) * 1000) / 10
  }

  calcDateRange(activePeriod.value)

  return {
    activePeriod, startDate, endDate,
    calcDateRange, selectPeriod, formatDateISO,
    getPreviousPeriod, calcChangeRate,
  }
}
