<script setup lang="ts">
import { ref } from "vue";

const isLoading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">재고조정</h2>
      <p class="mt-1 text-sm text-slate-500">재고 수량을 조정합니다</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">상품 검색</label>
          <input
            type="text"
            placeholder="바코드 또는 상품명"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">조정 사유</label>
          <select
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">선택</option>
            <option value="실사">재고 실사</option>
            <option value="파손">파손/폐기</option>
            <option value="증정">증정/샘플</option>
            <option value="기타">기타</option>
          </select>
        </div>
      </div>

      <div class="mt-6">
        <h3 class="mb-3 font-medium text-slate-700">조정 상품</h3>
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
          재고 조정
        </button>
      </div>
    </div>
  </div>
</template>
