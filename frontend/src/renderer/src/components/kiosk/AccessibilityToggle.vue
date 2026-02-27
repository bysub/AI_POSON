<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";

const { t } = useI18n();
const a11yStore = useAccessibilityStore();
</script>

<template>
  <button
    v-if="a11yStore.isEnabled"
    class="fixed bottom-20 right-4 z-[9990] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors"
    :class="
      a11yStore.isHighContrast
        ? 'bg-[var(--a11y-primary)] text-[var(--a11y-button-text)]'
        : 'bg-primary text-white'
    "
    :aria-label="t('a11y.openSettings')"
    @click="a11yStore.openPanel()"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-7 w-7"
      aria-hidden="true"
    >
      <circle cx="12" cy="4.5" r="2" />
      <path
        d="M12 7.5c-3.5 0-6.5 1-6.5 1L6 10l3.5.5v3L7 20h2.5l2.5-5 2.5 5H17l-2.5-6.5v-3L18 10l.5-1.5S15.5 7.5 12 7.5z"
      />
    </svg>
  </button>
</template>
