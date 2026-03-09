<script setup lang="ts">
import type { Period } from '@/composables/useStatsDateRange'

defineProps<{
  activePeriod: Period
  startDate: string
  endDate: string
}>()

const emit = defineEmits<{
  'update:activePeriod': [value: Period]
  'update:startDate': [value: string]
  'update:endDate': [value: string]
  search: []
}>()

function onSelectPeriod(period: Period) {
  emit('update:activePeriod', period)
}

const periods: { key: Period; label: string }[] = [
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
  { key: 'year', label: '연간' },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        v-for="p in periods"
        :key="p.key"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activePeriod === p.key
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-800'
        "
        @click="onSelectPeriod(p.key)"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="flex items-center gap-2">
      <input
        :value="startDate"
        type="date"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        @input="emit('update:startDate', ($event.target as HTMLInputElement).value)"
      />
      <span class="text-slate-400">~</span>
      <input
        :value="endDate"
        type="date"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        @input="emit('update:endDate', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <button
      class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
      @click="emit('search')"
    >
      조회
    </button>
  </div>
</template>
