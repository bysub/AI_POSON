<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useVirtualKeyboard } from "@/composables/useVirtualKeyboard";

const { t } = useI18n();
const {
  isVisible,
  keyboardType,
  inputMode,
  isShift,
  handleKey,
  handleBackspace,
  handleSpace,
  handleConfirm,
  toggleLanguage,
  toggleShift,
} = useVirtualKeyboard();

// 한글 키보드 배열
const KO_ROW1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"];
const KO_ROW1_SHIFT = ["ㅃ", "ㅉ", "ㄸ", "ㄲ", "ㅆ", "ㅛ", "ㅕ", "ㅑ", "ㅒ", "ㅖ"];
const KO_ROW2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"];
const KO_ROW3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"];

// 영문 키보드 배열
const EN_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const EN_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const EN_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

// 숫자 키보드 배열
const NUM_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
</script>

<template>
  <Teleport to="body">
    <Transition name="keyboard-slide">
      <div
        v-if="isVisible"
        data-virtual-keyboard
        class="fixed inset-x-0 bottom-0 z-[9999] select-none"
        @mousedown.prevent
      >
        <!-- 숫자 키보드 -->
        <div
          v-if="keyboardType === 'number'"
          class="px-4 pb-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          style="background: var(--theme-bg-secondary, #f3f4f6)"
        >
          <div class="mx-auto grid max-w-xs grid-cols-3 gap-2">
            <button
              v-for="n in NUM_KEYS"
              :key="n"
              class="flex h-14 items-center justify-center rounded-xl text-xl font-bold shadow-sm"
              style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
              @click="handleKey(n)"
            >
              {{ n }}
            </button>
            <!-- 하단행 -->
            <button
              class="flex h-14 items-center justify-center rounded-xl shadow-sm"
              style="background: var(--theme-border, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
              @click="handleBackspace"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                />
              </svg>
            </button>
            <button
              class="flex h-14 items-center justify-center rounded-xl text-xl font-bold shadow-sm"
              style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
              @click="handleKey('0')"
            >
              0
            </button>
            <button
              class="flex h-14 items-center justify-center rounded-xl text-base font-bold shadow-sm"
              style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
              @click="handleConfirm"
            >
              {{ t("keyboard.confirm") }}
            </button>
          </div>
        </div>

        <!-- 풀 키보드 (한/영) -->
        <div
          v-else
          class="px-2 pb-3 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          style="background: var(--theme-bg-secondary, #f3f4f6)"
        >
          <!-- 언어 표시 -->
          <div class="mb-1 flex items-center justify-center">
            <span
              class="rounded-full px-3 py-0.5 text-xs font-medium"
              style="background: var(--theme-border, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
            >
              {{ inputMode === "ko" ? t("keyboard.modeKorean") : t("keyboard.modeEnglish") }}
            </span>
          </div>

          <!-- Row 1 -->
          <div class="mb-1.5 flex justify-center gap-1">
            <template v-if="inputMode === 'ko'">
              <button
                v-for="key in isShift ? KO_ROW1_SHIFT : KO_ROW1"
                :key="key"
                class="flex h-11 w-[9.2%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ key }}
              </button>
            </template>
            <template v-else>
              <button
                v-for="key in EN_ROW1"
                :key="key"
                class="flex h-11 w-[9.2%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ isShift ? key.toUpperCase() : key }}
              </button>
            </template>
          </div>

          <!-- Row 2 -->
          <div class="mb-1.5 flex justify-center gap-1">
            <template v-if="inputMode === 'ko'">
              <button
                v-for="key in KO_ROW2"
                :key="key"
                class="flex h-11 w-[9.8%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ key }}
              </button>
            </template>
            <template v-else>
              <button
                v-for="key in EN_ROW2"
                :key="key"
                class="flex h-11 w-[9.8%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ isShift ? key.toUpperCase() : key }}
              </button>
            </template>
          </div>

          <!-- Row 3 (with Shift + Backspace) -->
          <div class="mb-1.5 flex justify-center gap-1">
            <!-- Shift -->
            <button
              class="flex h-11 w-[12%] items-center justify-center rounded-lg text-sm font-bold shadow-sm"
              :style="isShift
                ? { background: 'var(--theme-text, #374151)', color: 'var(--theme-surface, #fff)' }
                : { background: 'var(--theme-border, #e5e7eb)', color: 'var(--theme-text-secondary, #64748b)' }"
              @click="toggleShift"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>

            <template v-if="inputMode === 'ko'">
              <button
                v-for="key in KO_ROW3"
                :key="key"
                class="flex h-11 w-[9.2%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ key }}
              </button>
            </template>
            <template v-else>
              <button
                v-for="key in EN_ROW3"
                :key="key"
                class="flex h-11 w-[9.2%] items-center justify-center rounded-lg text-base font-medium shadow-sm"
                style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b)"
                @click="handleKey(key)"
              >
                {{ isShift ? key.toUpperCase() : key }}
              </button>
            </template>

            <!-- Backspace -->
            <button
              class="flex h-11 w-[12%] items-center justify-center rounded-lg shadow-sm"
              style="background: var(--theme-border, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
              @click="handleBackspace"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                />
              </svg>
            </button>
          </div>

          <!-- Row 4 (한/영 + Space + 확인) -->
          <div class="flex justify-center gap-1">
            <button
              class="flex h-11 w-[18%] items-center justify-center rounded-lg text-sm font-bold shadow-sm"
              style="background: var(--theme-border, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
              @click="toggleLanguage"
            >
              {{ inputMode === "ko" ? t("keyboard.toggleKo") : t("keyboard.toggleEn") }}
            </button>
            <button
              class="flex h-11 flex-1 items-center justify-center rounded-lg text-sm shadow-sm"
              style="background: var(--theme-surface, #fff); color: var(--theme-text-muted, #94a3b8)"
              @click="handleSpace"
            >
              {{ t("keyboard.space") }}
            </button>
            <button
              class="flex h-11 w-[18%] items-center justify-center rounded-lg text-sm font-bold shadow-sm"
              style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
              @click="handleConfirm"
            >
              {{ t("keyboard.confirm") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.keyboard-slide-enter-active,
.keyboard-slide-leave-active {
  transition: transform 0.25s ease;
}
.keyboard-slide-enter-from,
.keyboard-slide-leave-to {
  transform: translateY(100%);
}
</style>
