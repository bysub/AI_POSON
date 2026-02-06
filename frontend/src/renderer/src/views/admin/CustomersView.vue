<script setup lang="ts">
import { ref } from "vue";

const customers = ref([]);
const isLoading = ref(false);
const searchQuery = ref("");
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">고객관리</h2>
        <p class="mt-1 text-sm text-slate-500">고객 정보를 관리합니다</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        고객 등록
      </button>
    </div>

    <div class="flex gap-4">
      <div class="relative flex-1">
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
          placeholder="이름, 전화번호로 검색..."
          class="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <svg
        class="mx-auto mb-4 h-16 w-16 text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <p class="text-lg font-medium text-slate-600">등록된 고객이 없습니다</p>
      <p class="mt-1 text-sm text-slate-400">고객을 등록하여 관리를 시작하세요</p>
    </div>
  </div>
</template>
