<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-slate-400">
    <svg
      class="mb-3 h-12 w-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
    <p>{{ message ?? '해당 기간의 데이터가 없습니다' }}</p>
  </div>
</template>
