<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useTTS } from "@/composables/useTTS";

const { t } = useI18n();
const a11yStore = useAccessibilityStore();
const tts = useTTS();
</script>

<template>
  <button
    v-if="a11yStore.ttsEnabled && tts.lastUtterance.value"
    class="fixed bottom-20 left-4 z-[9990] flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-colors replay-audio"
    :class="[tts.isSpeaking.value ? 'animate-pulse' : '']"
    :aria-label="t('a11y.replay')"
    style="background: var(--theme-surface, #fff); color: var(--theme-text, #1e293b); border: 2px solid var(--theme-primary, #8E3524)"
    @click="tts.replay()"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
    <span class="text-sm font-medium">{{ t("a11y.replay") }}</span>
  </button>
</template>
<style scoped>
.replay-audio{
  bottom:2rem;
}
</style>