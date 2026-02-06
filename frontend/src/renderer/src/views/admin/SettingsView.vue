<script setup lang="ts">
import { ref } from "vue";

const settings = ref({
  kioskName: "POSON Kiosk #1",
  autoLogout: 30,
  receiptFooter: "맛있게 드세요!",
  enableSound: true,
  enableAnimation: true,
});

function saveSettings(): void {
  alert("설정이 저장되었습니다");
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">시스템 설정</h2>
      <p class="mt-1 text-sm text-slate-500">키오스크 시스템 설정을 관리합니다</p>
    </div>

    <!-- Settings Sections -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- General Settings -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <svg
              class="h-5 w-5 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          일반 설정
        </h3>

        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">키오스크 이름</label>
            <input
              v-model="settings.kioskName"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700"
              >자동 로그아웃 (분)</label
            >
            <input
              v-model.number="settings.autoLogout"
              type="number"
              min="5"
              max="120"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 하단 문구</label>
            <textarea
              v-model="settings.receiptFooter"
              rows="2"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>
        </div>
      </div>

      <!-- UI Settings -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
            <svg
              class="h-5 w-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          화면 설정
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-4">
            <div>
              <p class="font-medium text-slate-800">효과음 사용</p>
              <p class="text-sm text-slate-500">버튼 클릭 시 효과음 재생</p>
            </div>
            <button
              class="relative h-7 w-12 rounded-full transition-colors"
              :class="settings.enableSound ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="settings.enableSound = !settings.enableSound"
            >
              <span
                class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                :class="settings.enableSound ? 'translate-x-5' : ''"
              />
            </button>
          </div>

          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-4">
            <div>
              <p class="font-medium text-slate-800">애니메이션 사용</p>
              <p class="text-sm text-slate-500">화면 전환 애니메이션</p>
            </div>
            <button
              class="relative h-7 w-12 rounded-full transition-colors"
              :class="settings.enableAnimation ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="settings.enableAnimation = !settings.enableAnimation"
            >
              <span
                class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                :class="settings.enableAnimation ? 'translate-x-5' : ''"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- System Info -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
            <svg
              class="h-5 w-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          시스템 정보
        </h3>

        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-slate-500">버전</span>
            <span class="font-medium text-slate-800">1.0.0</span>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 py-2">
            <span class="text-sm text-slate-500">프론트엔드</span>
            <span class="font-medium text-slate-800">Electron + Vue 3</span>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 py-2">
            <span class="text-sm text-slate-500">백엔드</span>
            <span class="font-medium text-slate-800">Express + TypeScript</span>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 py-2">
            <span class="text-sm text-slate-500">데이터베이스</span>
            <span class="font-medium text-slate-800">PostgreSQL</span>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-red-800">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          위험 영역
        </h3>

        <p class="mb-4 text-sm text-red-700">이 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.</p>

        <div class="space-y-3">
          <button
            class="w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            캐시 초기화
          </button>
          <button
            class="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            데이터베이스 초기화
          </button>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end">
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        @click="saveSettings"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        설정 저장
      </button>
    </div>
  </div>
</template>
