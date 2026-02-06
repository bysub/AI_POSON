<script setup lang="ts">
import { ref } from "vue";

const isLoading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">매출등록</h2>
      <p class="mt-1 text-sm text-slate-500">수동으로 매출을 등록합니다</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-6 md:grid-cols-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">매출일자</label>
          <input
            type="date"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">결제 수단</label>
          <select
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="CARD">카드</option>
            <option value="CASH">현금</option>
            <option value="MIXED">복합</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">고객</label>
          <input
            type="text"
            placeholder="전화번호 또는 회원번호"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div class="mt-6">
        <h3 class="mb-3 font-medium text-slate-700">판매 상품</h3>
        <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p class="text-slate-500">상품을 검색하여 추가하세요</p>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button
          class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          매출 등록
        </button>
      </div>
    </div>
  </div>
</template>
