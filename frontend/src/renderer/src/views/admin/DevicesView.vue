<script setup lang="ts">
import { ref } from "vue";

const devices = ref([
  {
    id: "KIOSK-001",
    name: "키오스크 1번",
    location: "1층 입구",
    vanProvider: "NICE",
    isActive: true,
    lastOnline: new Date(),
  },
  {
    id: "KIOSK-002",
    name: "키오스크 2번",
    location: "2층 로비",
    vanProvider: "KICC",
    isActive: true,
    lastOnline: new Date(),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">기기 설정</h2>
        <p class="mt-1 text-sm text-slate-500">키오스크 및 주변기기를 관리합니다</p>
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
        기기 추가
      </button>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div
        v-for="device in devices"
        :key="device.id"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
      >
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-slate-800">
              {{ device.name }}
            </h3>
            <p class="text-sm text-slate-500">
              {{ device.id }}
            </p>
          </div>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="device.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="device.isActive ? 'bg-green-500' : 'bg-slate-400'"
            />
            {{ device.isActive ? "온라인" : "오프라인" }}
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2 text-slate-600">
            <svg
              class="h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {{ device.location }}
          </div>
          <div class="flex items-center gap-2 text-slate-600">
            <svg
              class="h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            VAN: {{ device.vanProvider }}
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            class="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            설정
          </button>
          <button
            class="flex-1 rounded-lg bg-indigo-50 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
          >
            테스트
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-800">주변기기 설정</h3>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-xl border border-slate-200 p-4">
          <div class="mb-2 flex items-center gap-2">
            <svg
              class="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span class="font-medium text-slate-700">영수증 프린터</span>
          </div>
          <p class="text-sm text-slate-500">미연결</p>
          <button
            class="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            연결
          </button>
        </div>
        <div class="rounded-xl border border-slate-200 p-4">
          <div class="mb-2 flex items-center gap-2">
            <svg
              class="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <span class="font-medium text-slate-700">바코드 스캐너</span>
          </div>
          <p class="text-sm text-slate-500">미연결</p>
          <button
            class="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            연결
          </button>
        </div>
        <div class="rounded-xl border border-slate-200 p-4">
          <div class="mb-2 flex items-center gap-2">
            <svg
              class="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span class="font-medium text-slate-700">카드 단말기</span>
          </div>
          <p class="text-sm text-slate-500">미연결</p>
          <button
            class="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            연결
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
