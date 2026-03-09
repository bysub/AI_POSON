import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  teal: '#14b8a6',
  slate: '#64748b',
  pink: '#ec4899',
} as const

export const CHART_COLORS_ACCESSIBLE = [
  '#E69F00', '#56B4E9', '#009E73', '#F0E442',
  '#0072B2', '#D55E00', '#CC79A7',
]

export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
    },
    legend: {
      position: 'bottom' as const,
      labels: { usePointStyle: true, padding: 16 },
    },
  },
  animation: { duration: 600 },
}
