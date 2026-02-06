<script setup lang="ts">
import { ref } from "vue";

const period = ref("month");
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">상품통계</h2>
        <p class="mt-1 text-sm text-slate-500">상품별 판매 현황을 확인합니다</p>
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

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-semibold text-slate-800">베스트셀러 TOP 10</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div class="flex items-center gap-3">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700"
                >1</span
              >
              <span class="font-medium text-slate-700">데이터가 없습니다</span>
            </div>
            <span class="text-sm text-slate-500">0건</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-semibold text-slate-800">카테고리별 판매</h3>
        <div class="flex h-48 items-center justify-center rounded-xl bg-slate-50">
          <p class="text-slate-400">차트가 표시될 영역입니다</p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-800">상품별 판매 현황</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="pb-3 text-left text-xs font-semibold uppercase text-slate-500">상품</th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-slate-500">
                판매수량
              </th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-slate-500">매출액</th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-slate-500">점유율</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="4" class="py-8 text-center text-slate-400">데이터가 없습니다</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
