import { BASE_CHART_OPTIONS, CHART_COLORS } from '@/utils/chart-setup'
import type { ChartOptions } from 'chart.js'

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value) + '원'
}

export function useChartOptions() {
  function lineChartOptions(overrides?: Partial<ChartOptions<'line'>>): ChartOptions<'line'> {
    return {
      ...BASE_CHART_OPTIONS,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatKRW(Number(value)),
          },
        },
      },
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatKRW(ctx.parsed.y)}`,
          },
        },
      },
      ...overrides,
    } as ChartOptions<'line'>
  }

  function barChartOptions(overrides?: Partial<ChartOptions<'bar'>>): ChartOptions<'bar'> {
    return {
      ...BASE_CHART_OPTIONS,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatKRW(Number(value)),
          },
        },
      },
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatKRW(ctx.parsed.y)}`,
          },
        },
      },
      ...overrides,
    } as ChartOptions<'bar'>
  }

  function doughnutChartOptions(overrides?: Partial<ChartOptions<'doughnut'>>): ChartOptions<'doughnut'> {
    return {
      ...BASE_CHART_OPTIONS,
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            label: (ctx) => {
              const total = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0)
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
              return `${ctx.label}: ${formatKRW(ctx.parsed)} (${pct}%)`
            },
          },
        },
      },
      ...overrides,
    } as ChartOptions<'doughnut'>
  }

  function horizontalBarOptions(overrides?: Partial<ChartOptions<'bar'>>): ChartOptions<'bar'> {
    return {
      ...BASE_CHART_OPTIONS,
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
        },
      },
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        legend: { display: false },
      },
      ...overrides,
    } as ChartOptions<'bar'>
  }

  return {
    lineChartOptions,
    barChartOptions,
    doughnutChartOptions,
    horizontalBarOptions,
    CHART_COLORS,
    formatKRW,
  }
}
