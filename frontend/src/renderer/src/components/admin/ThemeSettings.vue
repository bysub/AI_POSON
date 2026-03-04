<script setup lang="ts">
/**
 * 관리자 테마 설정 컴포넌트
 *
 * 테마 선택, 접근성 모드, 시스템 설정 추종 옵션 제공
 */

import { computed } from "vue";
import { useThemeStore, AVAILABLE_THEMES, type BrandTheme, type ContrastMode } from "@/stores/theme";
import { useThemePreview } from "@/composables/useThemePreview";

const themeStore = useThemeStore();
const { startPreview, cancelPreview, selectTheme } = useThemePreview();

// 대비 모드 옵션
const contrastOptions: { id: ContrastMode; name: string; description: string }[] = [
  { id: "normal", name: "기본", description: "표준 대비" },
  { id: "high", name: "고대비", description: "WCAG AAA (7:1)" },
  { id: "inverted", name: "반전대비", description: "어두운 배경" },
  { id: "low", name: "저대비", description: "눈의 피로 감소" },
];

// 현재 선택된 테마
const currentThemeId = computed(() => themeStore.currentTheme);

// 테마 선택 핸들러
function handleThemeSelect(themeId: BrandTheme) {
  selectTheme(themeId);
}

// 대비 모드 변경
function handleContrastChange(mode: ContrastMode) {
  themeStore.setContrastMode(mode);
}

// 설정 리셋
function handleReset() {
  themeStore.reset();
}
</script>

<template>
  <div class="theme-settings space-y-8">
    <!-- 브랜드 테마 선택 -->
    <section>
      <h3 class="mb-4 text-lg font-semibold text-theme-text">
        테마 선택
      </h3>
      <p class="mb-4 text-sm text-theme-text-secondary">
        키오스크에 적용할 테마를 선택하세요. 마우스를 올리면 미리보기됩니다.
      </p>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <button
          v-for="theme in AVAILABLE_THEMES"
          :key="theme.id"
          class="theme-card group relative overflow-hidden rounded-theme-lg border-2 p-4 transition-all duration-200"
          :class="[
            currentThemeId === theme.id
              ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/30'
              : 'border-theme-border bg-theme-surface hover:border-theme-primary/50 hover:shadow-theme-md',
          ]"
          @mouseenter="startPreview(theme.id)"
          @mouseleave="cancelPreview"
          @click="handleThemeSelect(theme.id)"
        >
          <!-- 테마 프리뷰 색상 -->
          <div
            class="mb-3 h-16 overflow-hidden rounded-theme-md transition-transform duration-200 group-hover:scale-105"
            :style="{ background: theme.preview }"
          />

          <!-- 테마 정보 -->
          <div class="text-left">
            <h4 class="font-semibold text-theme-text">
              {{ theme.nameKo }}
            </h4>
            <p class="mt-1 text-xs text-theme-text-muted line-clamp-2">
              {{ theme.description }}
            </p>
          </div>

          <!-- 선택됨 표시 -->
          <div
            v-if="currentThemeId === theme.id"
            class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-theme-primary text-theme-primary-text"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      </div>
    </section>

    <!-- 접근성 모드 -->
    <section>
      <h3 class="mb-4 text-lg font-semibold text-theme-text">
        접근성 모드
      </h3>
      <p class="mb-4 text-sm text-theme-text-secondary">
        시각 접근성을 위한 대비 모드를 선택하세요.
      </p>

      <div class="flex flex-wrap gap-3">
        <button
          v-for="option in contrastOptions"
          :key="option.id"
          class="rounded-theme-md border-2 px-4 py-2 transition-all duration-200"
          :class="[
            themeStore.currentContrastMode === option.id
              ? 'border-theme-primary bg-theme-primary text-theme-primary-text'
              : 'border-theme-border bg-theme-surface text-theme-text hover:border-theme-primary/50',
          ]"
          @click="handleContrastChange(option.id)"
        >
          <span class="font-medium">{{ option.name }}</span>
          <span class="ml-2 text-xs opacity-75">{{ option.description }}</span>
        </button>
      </div>
    </section>

    <!-- 시스템 설정 추종 -->
    <section>
      <h3 class="mb-4 text-lg font-semibold text-theme-text">
        시스템 설정
      </h3>

      <div class="space-y-4">
        <!-- 시스템 테마 추종 -->
        <label class="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            :checked="themeStore.followSystemTheme"
            class="h-5 w-5 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
            @change="themeStore.setFollowSystemTheme(($event.target as HTMLInputElement).checked)"
          >
          <span class="text-theme-text">시스템 다크 모드 따르기</span>
        </label>

        <!-- 시스템 대비 추종 -->
        <label class="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            :checked="themeStore.followSystemContrast"
            class="h-5 w-5 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
            @change="themeStore.setFollowSystemContrast(($event.target as HTMLInputElement).checked)"
          >
          <span class="text-theme-text">시스템 대비 설정 따르기</span>
        </label>

        <!-- 모션 감소 -->
        <label class="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            :checked="themeStore.followSystemMotion"
            :disabled="true"
            class="h-5 w-5 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
          >
          <span class="text-theme-text">모션 감소 모드 따르기</span>
          <span class="text-xs text-theme-text-muted">(항상 활성화)</span>
        </label>
      </div>
    </section>

    <!-- 현재 상태 정보 -->
    <section class="rounded-theme-lg border border-theme-border bg-theme-bg-secondary p-4">
      <h4 class="mb-3 font-semibold text-theme-text">
        현재 설정 상태
      </h4>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="text-theme-text-secondary">테마:</div>
        <div class="font-medium text-theme-text">{{ themeStore.currentThemeMeta.nameKo }}</div>

        <div class="text-theme-text-secondary">대비 모드:</div>
        <div class="font-medium text-theme-text">
          {{ contrastOptions.find(o => o.id === themeStore.currentContrastMode)?.name || '기본' }}
        </div>

        <div class="text-theme-text-secondary">다크 테마:</div>
        <div class="font-medium text-theme-text">{{ themeStore.isDarkTheme ? '예' : '아니오' }}</div>

        <div class="text-theme-text-secondary">모션 감소:</div>
        <div class="font-medium text-theme-text">{{ themeStore.isReducedMotion ? '예' : '아니오' }}</div>
      </div>
    </section>

    <!-- 리셋 버튼 -->
    <div class="flex justify-end">
      <button
        class="rounded-theme-md border border-theme-border bg-theme-surface px-4 py-2 text-theme-text transition-colors hover:bg-theme-surface-hover"
        @click="handleReset"
      >
        기본값으로 초기화
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
