<script setup lang="ts">
import { ref } from "vue";

const businessInfo = ref({
  name: "POSON 카페",
  businessNumber: "123-45-67890",
  owner: "홍길동",
  address: "서울시 강남구 테헤란로 123",
  phone: "02-1234-5678",
  email: "info@poson.com",
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">사업자 관리</h2>
      <p class="mt-1 text-sm text-slate-500">사업자 정보를 관리합니다</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-6 font-semibold text-slate-800">기본 정보</h3>
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">상호명</label>
          <input
            v-model="businessInfo.name"
            type="text"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">사업자등록번호</label>
          <input
            v-model="businessInfo.businessNumber"
            type="text"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">대표자명</label>
          <input
            v-model="businessInfo.owner"
            type="text"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">전화번호</label>
          <input
            v-model="businessInfo.phone"
            type="text"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-700">주소</label>
          <input
            v-model="businessInfo.address"
            type="text"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
          <input
            v-model="businessInfo.email"
            type="email"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          저장
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-800">영수증 설정</h3>
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 헤더 문구</label>
          <textarea
            rows="2"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="영수증 상단에 표시될 문구"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 푸터 문구</label>
          <textarea
            rows="2"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="영수증 하단에 표시될 문구"
          />
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          저장
        </button>
      </div>
    </div>
  </div>
</template>
