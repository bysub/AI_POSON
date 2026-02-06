<script setup lang="ts">
import { ref } from "vue";

const period = ref("month");
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매입통계</h2>
        <p class="mt-1 text-sm text-slate-500">매입 현황을 통계로 확인합니다</p>
      </div>
      <div class="flex gap-2">
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            period === 'week'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          "
          @click="period = 'week'"
        >
          주간
        </button>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            period === 'month'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          "
          @click="period = 'month'"
        >
          월간
        </button>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            period === 'year'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          "
          @click="period = 'year'"
        >
          연간
        </button>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500">총 매입액</p>
        <p class="mt-2 text-3xl font-bold text-slate-800">₩0</p>
        <p class="mt-1 text-sm text-slate-400">
          이번 {{ period === "week" ? "주" : period === "month" ? "달" : "년" }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500">매입 건수</p>
        <p class="mt-2 text-3xl font-bold text-slate-800">0건</p>
        <p class="mt-1 text-sm text-slate-400">
          이번 {{ period === "week" ? "주" : period === "month" ? "달" : "년" }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500">평균 매입 단가</p>
        <p class="mt-2 text-3xl font-bold text-slate-800">₩0</p>
        <p class="mt-1 text-sm text-slate-400">건당 평균</p>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-800">매입 추이</h3>
      <div class="flex h-64 items-center justify-center rounded-xl bg-slate-50">
        <p class="text-slate-400">차트가 표시될 영역입니다</p>
      </div>
    </div>
  </div>
</template>
