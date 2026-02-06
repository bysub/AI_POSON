<script setup lang="ts">
import { ref } from "vue";

const searchQuery = ref("");
const dateFilter = ref("today");
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">주문 내역</h2>
        <p class="mt-1 text-sm text-slate-500">키오스크 주문 내역을 확인합니다</p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="dateFilter"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="today">오늘</option>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
          <option value="all">전체</option>
        </select>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          내보내기
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg
        class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="주문번호로 검색..."
        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>

    <!-- Empty State -->
    <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div
        class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"
      >
        <svg class="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-slate-700">주문 내역이 없습니다</h3>
      <p class="mt-2 text-sm text-slate-500">키오스크에서 주문이 들어오면 여기에 표시됩니다</p>
    </div>
  </div>
</template>
