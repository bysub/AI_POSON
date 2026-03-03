<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useTTS } from "@/composables/useTTS";
import type { FontScale, ContrastMode, A11yPreset } from "@/stores/accessibility";
import { onMounted } from "vue";

const { t } = useI18n();
const a11yStore = useAccessibilityStore();
const tts = useTTS();

const emit = defineEmits<{
  close: [];
}>();

const fontOptions: { value: FontScale; label: string; preview: string }[] = [
  { value: "standard", label: "a11y.fontStandard", preview: "가" },
  { value: "large", label: "a11y.fontLarge", preview: "가" },
  { value: "extraLarge", label: "a11y.fontExtraLarge", preview: "가" },
];

const contrastOptions: { value: ContrastMode; label: string; icon: string }[] = [
  { value: "default", label: "a11y.contrastDefault", icon: "☀️" },
  /*
  { value: "highContrast", label: "a11y.contrastHigh", icon: "🌙" },
  { value: "invertedContrast", label: "a11y.contrastInverted", icon: "◐" },
   */
];

function selectFont(scale: FontScale) {
  a11yStore.setFontScale(scale);
  tts.speak(t(fontOptions.find((o) => o.value === scale)?.label ?? ""));
}

function selectContrast(mode: ContrastMode) {
  a11yStore.setContrastMode(mode);
  tts.speak(t(contrastOptions.find((o) => o.value === mode)?.label ?? ""));
}

function toggleTTS() {
  a11yStore.toggleTTS();
  tts.speak(a11yStore.ttsEnabled ? t("a11y.ttsOn") : t("a11y.ttsOff"), { force: true });
}

const presetOptions: { value: A11yPreset; label: string; desc: string; icon: string }[] = [
  { value: "default", label: "a11y.presetDefault", desc: "a11y.presetDefaultDesc", icon: "Aa" },
  { value: "senior", label: "a11y.presetSenior", desc: "a11y.presetSeniorDesc", icon: "Aa+" },
  { value: "lowVision", label: "a11y.presetLowVision", desc: "a11y.presetLowVisionDesc", icon: "Aa++" },
];

function selectPreset(preset: A11yPreset) {
  a11yStore.applyPreset(preset);
  tts.speak(t(presetOptions.find((o) => o.value === preset)?.label ?? ""), { force: true });
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
        :class="
          a11yStore.isHighContrast
            ? 'bg-[var(--a11y-surface)] text-[var(--a11y-text)]'
            : 'bg-white text-gray-900'
        "
        style="border: var(--a11y-btn-border)"
      >
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold">
            <span class="mr-2" aria-hidden="true"></span>
            {{ t("a11y.settingsTitle") }}
          </h2>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            :class="a11yStore.isHighContrast ? 'hover:bg-[var(--a11y-bg-secondary)]' : ''"
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

        <!-- Quick Presets 
        <div class="mb-5">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.presetTitle") }}</p>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="opt in presetOptions"
              :key="opt.value"
              class="flex flex-col items-center rounded-2xl p-3 transition-all"
              :class="[
                a11yStore.isHighContrast
                  ? 'bg-[var(--a11y-bg-secondary)] text-[var(--a11y-text)]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
              style="border: var(--a11y-btn-border)"
              @click="selectPreset(opt.value)"
            >
              <span class="mb-1 text-lg font-bold" aria-hidden="true">{{ opt.icon }}</span>
              <span class="text-sm font-medium">{{ t(opt.label) }}</span>
              <span class="text-[10px] opacity-60">{{ t(opt.desc) }}</span>
            </button>
          </div>
        </div>
-->
        <!-- Font Scale -->
        <div class="mb-5">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.fontScale") }}</p>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="opt in fontOptions"
              :key="opt.value"
              class="flex flex-col items-center rounded-2xl p-3 transition-all"
              :class="[
                a11yStore.fontScale === opt.value
                  ? a11yStore.isHighContrast
                    ? 'bg-[var(--a11y-primary)] text-[var(--a11y-button-text)]'
                    : 'bg-primary text-white'
                  : a11yStore.isHighContrast
                    ? 'bg-[var(--a11y-bg-secondary)] text-[var(--a11y-text)]'
                    : 'bg-gray-100 text-gray-700',
              ]"
              :aria-pressed="a11yStore.fontScale === opt.value"
              style="border: var(--a11y-btn-border)"
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

        <!-- Contrast Mode -->
        <div class="mb-5">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.contrastMode") }}</p>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="opt in contrastOptions"
              :key="opt.value"
              class="flex flex-col items-center rounded-2xl p-3 transition-all"
              :class="[
                a11yStore.contrastMode === opt.value
                  ? a11yStore.isHighContrast
                    ? 'bg-[var(--a11y-primary)] text-[var(--a11y-button-text)]'
                    : 'bg-primary text-white'
                  : a11yStore.isHighContrast
                    ? 'bg-[var(--a11y-bg-secondary)] text-[var(--a11y-text)]'
                    : 'bg-gray-100 text-gray-700',
              ]"
              :aria-pressed="a11yStore.contrastMode === opt.value"
              style="border: var(--a11y-btn-border)"
              @click="selectContrast(opt.value)"
            >
              <span class="mb-1 text-2xl" aria-hidden="true">{{ opt.icon }}</span>
              <span class="text-xs">{{ t(opt.label) }}</span>
            </button>
          </div>
        </div>

        <!-- TTS Toggle -->
        <div class="mb-6">
          <p class="mb-3 text-base font-semibold">{{ t("a11y.ttsLabel") }}</p>
          <button
            class="flex w-full items-center justify-between rounded-2xl p-4 transition-all"
            :class="[
              a11yStore.ttsEnabled
                ? a11yStore.isHighContrast
                  ? 'bg-[var(--a11y-success)] text-[var(--a11y-button-text)]'
                  : 'bg-green-500 text-white'
                : a11yStore.isHighContrast
                  ? 'bg-[var(--a11y-bg-secondary)] text-[var(--a11y-text)]'
                  : 'bg-gray-100 text-gray-700',
            ]"
            :aria-pressed="a11yStore.ttsEnabled"
            role="switch"
            :aria-checked="a11yStore.ttsEnabled"
            style="border: var(--a11y-btn-border)"
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
          :class="
            a11yStore.isHighContrast
              ? 'bg-[var(--a11y-primary)] text-[var(--a11y-button-text)]'
              : 'bg-primary text-white'
          "
          style="border: var(--a11y-btn-border)"
          @click="handleClose"
        >
          {{ t("a11y.apply") }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
