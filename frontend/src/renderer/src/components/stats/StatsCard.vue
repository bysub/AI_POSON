<script setup lang="ts">
defineProps<{
  label: string
  value: string
  color?: string
  changeRate?: number | null
}>()
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p class="text-xs font-medium text-slate-500">{{ label }}</p>
    <p
      class="mt-1 text-xl font-bold"
      :class="color ?? 'text-slate-800'"
    >
      {{ value }}
    </p>
    <p
      v-if="changeRate != null"
      class="mt-1 flex items-center gap-1 text-xs font-medium"
      :class="changeRate > 0 ? 'text-emerald-600' : changeRate < 0 ? 'text-red-500' : 'text-slate-400'"
    >
      <span v-if="changeRate > 0">&#9650;</span>
      <span v-else-if="changeRate < 0">&#9660;</span>
      <span v-else>&mdash;</span>
      {{ changeRate > 0 ? '+' : '' }}{{ changeRate }}%
    </p>
  </div>
</template>
