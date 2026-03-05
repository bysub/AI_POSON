<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useThemeStore, AVAILABLE_THEMES, type BrandTheme } from "@/stores/theme";
import { useTTS } from "@/composables/useTTS";
import type { FontScale, ContrastMode, A11yPreset } from "@/stores/accessibility";
import { onMounted } from "vue";

const { t } = useI18n();
const a11yStore = useAccessibilityStore();
const themeStore = useThemeStore();
const tts = useTTS();

const emit = defineEmits<{
  close: [];
}>();

const fontOptions: { value: FontScale; label: string; preview: string }[] = [
  { value: "standard", label: "a11y.fontStandard", preview: "가" },
  { value: "large", label: "a11y.fontLarge", preview: "가" },
  { value: "extraLarge", label: "a11y.fontExtraLarge", preview: "가" },
];

function selectFont(scale: FontScale) {
  a11yStore.setFontScale(scale);
  tts.speak(t(fontOptions.find((o) => o.value === scale)?.label ?? ""));
}

function selectTheme(theme: BrandTheme) {
  themeStore.setTheme(theme);
  const meta = AVAILABLE_THEMES.find((t) => t.id === theme);
  tts.speak(meta?.nameKo ?? meta?.name ?? "");
}

function toggleTTS() {
  a11yStore.toggleTTS();
  tts.speak(a11yStore.ttsEnabled ? t("a11y.ttsOn") : t("a11y.ttsOff"), { force: true });
}

function handleClose() {
  a11yStore.closePanel();
  emit("close");
}

onMounted(() => {
  tts.speak(t("a11y.tts.settingsOpened"));
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9995] flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50" @click="handleClose" />

      <!-- Panel -->
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="t('a11y.settingsTitle')"
        class="relative z-10 mx-6 w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style="background: var(--theme-surface, #ffffff); color: var(--theme-text, #1e293b)"
      >
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold">
            {{ t("a11y.settingsTitle") }}
          </h2>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style="color: var(--theme-text-secondary, #64748b)"
            :aria-label="$t('common.close')"
            @click="handleClose"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Font Scale -->
        <div class="mb-5">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.fontScale") }}</p>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="opt in fontOptions"
              :key="opt.value"
              class="flex flex-col items-center rounded-2xl p-3 transition-all"
              :style="
                a11yStore.fontScale === opt.value
                  ? { background: 'var(--theme-primary, #8E3524)', color: 'var(--theme-primary-text, #fff)' }
                  : { background: 'var(--theme-bg-secondary, #f3f4f6)', color: 'var(--theme-text, #374151)' }
              "
              :aria-pressed="a11yStore.fontScale === opt.value"
              @click="selectFont(opt.value)"
            >
              <span
                class="mb-1 font-bold"
                :class="{
                  'text-base': opt.value === 'standard',
                  'text-lg': opt.value === 'large',
                  'text-xl': opt.value === 'extraLarge',
                }"
              >
                {{ opt.preview }}
              </span>
              <span class="text-xs">{{ t(opt.label) }}</span>
            </button>
          </div>
        </div>

        <!-- Theme Selection (화면 모드) -->
        <div class="mb-5">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.contrastMode") }}</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="theme in AVAILABLE_THEMES"
              :key="theme.id"
              class="flex flex-col items-center rounded-2xl p-2 transition-all"
              :style="
                themeStore.currentTheme === theme.id
                  ? {
                      background: 'var(--theme-bg-secondary, #f9fafb)',
                      outline: '2px solid var(--theme-primary, #8E3524)',
                      outlineOffset: '-2px',
                    }
                  : {
                      background: 'var(--theme-bg-secondary, #f3f4f6)',
                      color: 'var(--theme-text, #374151)',
                    }
              "
              :aria-pressed="themeStore.currentTheme === theme.id"
              @click="selectTheme(theme.id)"
            >
              <span
                class="mb-1 h-8 w-8 rounded-full border border-gray-200"
                :style="{ background: theme.preview }"
                aria-hidden="true"
              />
              <span class="text-[11px] font-medium leading-tight">{{ theme.nameKo }}</span>
            </button>
          </div>
        </div>

        <!-- TTS Toggle -->
        <div class="mb-6">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.ttsLabel") }}</p>
          <button
            class="flex w-full items-center justify-between rounded-2xl p-4 transition-all"
            :style="
              a11yStore.ttsEnabled
                ? { background: 'var(--theme-success, #22c55e)', color: '#fff' }
                : { background: 'var(--theme-bg-secondary, #f3f4f6)', color: 'var(--theme-text, #374151)' }
            "
            :aria-pressed="a11yStore.ttsEnabled"
            role="switch"
            :aria-checked="a11yStore.ttsEnabled"
            @click="toggleTTS()"
          >
            <span class="text-base font-medium">
              {{ a11yStore.ttsEnabled ? t("a11y.ttsOn") : t("a11y.ttsOff") }}
            </span>
            <span class="text-2xl" aria-hidden="true">
              {{ a11yStore.ttsEnabled ? "🔊" : "🔇" }}
            </span>
          </button>
        </div>

        <!-- Apply/Close Button -->
        <button
          class="w-full rounded-2xl py-4 text-lg font-bold transition-colors"
          style="background: var(--theme-primary, #8E3524); color: var(--theme-primary-text, #fff)"
          @click="handleClose"
        >
          {{ t("a11y.apply") }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
