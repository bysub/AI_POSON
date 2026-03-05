<script setup lang="ts">
import { RouterView } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNetworkStore } from "@/stores/network";
import { useSettingsStore } from "@/stores/settings";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useVirtualKeyboard } from "@/composables/useVirtualKeyboard";
import { useIdleTimer } from "@/composables/useIdleTimer";
import { useTTS } from "@/composables/useTTS";
import VirtualKeyboard from "@/components/kiosk/VirtualKeyboard.vue";
import AccessibilityToggle from "@/components/kiosk/AccessibilityToggle.vue";
import AccessibilityPanel from "@/components/kiosk/AccessibilityPanel.vue";
import TTSReplayButton from "@/components/kiosk/TTSReplayButton.vue";
import VoiceMicButton from "@/components/kiosk/VoiceMicButton.vue";
import VoiceSubtitleBar from "@/components/kiosk/VoiceSubtitleBar.vue";
import { onMounted, onUnmounted, watch } from "vue";

const { t } = useI18n();
const networkStore = useNetworkStore();
const settingsStore = useSettingsStore();
const a11yStore = useAccessibilityStore();
const tts = useTTS();
const { init: initKeyboard, destroy: destroyKeyboard, contentShift } = useVirtualKeyboard();
const {
  showWarning,
  remainingSeconds,
  start: startIdleTimer,
  stop: stopIdleTimer,
} = useIdleTimer(30);

// IdleWarning 표시 시 TTS 발화
watch(showWarning, (visible) => {
  if (visible) {
    tts.speak(t("a11y.tts.idleWarning", { seconds: remainingSeconds.value }));
  }
});

onMounted(async () => {
  networkStore.startMonitoring();
  initKeyboard();
  startIdleTimer();

  // 설정 + 접근성 초기화 (VoiceMicButton 등 하위 컴포넌트보다 먼저 실행)
  await settingsStore.initialize();
  a11yStore.initialize();
});

onUnmounted(() => {
  networkStore.stopMonitoring();
  destroyKeyboard();
  stopIdleTimer();
});
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-kiosk-background">
    <div
      class="duration-250 h-full transition-transform ease-out"
      :style="contentShift > 0 ? { transform: `translateY(-${contentShift}px)` } : undefined"
    >
      <RouterView />
    </div>

    <!-- Virtual Keyboard -->
    <VirtualKeyboard />

    <!-- Accessibility -->
    <AccessibilityToggle />
    <AccessibilityPanel v-if="a11yStore.showPanel" />
    <TTSReplayButton />

    <!-- Voice Ordering -->
    <VoiceMicButton />
    <VoiceSubtitleBar />

    <!-- Idle Warning Overlay -->
    <Transition name="fade">
      <div
        v-if="showWarning"
        role="alertdialog"
        :aria-label="t('idle.warningTitle')"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
      >
        <div
          class="mx-8 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
          style="background: var(--theme-surface, #fff)"
        >
          <div
            class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style="background: color-mix(in srgb, var(--theme-warning, #f59e0b) 20%, transparent)"
          >
            <svg
              class="h-10 w-10"
              style="color: var(--theme-warning, #f59e0b)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p class="mb-2 text-xl font-bold" style="color: var(--theme-text, #111827)">
            {{ $t("idle.warningTitle") }}
          </p>
          <p class="mb-6 text-base" style="color: var(--theme-text-secondary, #64748b)">
            {{ $t("idle.warningMessage", { seconds: remainingSeconds }) }}
          </p>
          <button
            class="w-full rounded-2xl py-4 text-lg font-bold transition-colors"
            style="background: var(--theme-primary, #8E3524); color: var(--theme-primary-text, #fff)"
            @click="showWarning = false"
          >
            {{ $t("idle.continueButton") }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Offline indicator -->
    <Transition name="slide-down">
      <div
        v-if="!networkStore.isOnline"
        class="fixed left-0 right-0 top-0 z-50 bg-amber-500 py-2 text-center text-kiosk-sm font-medium text-white"
      >
        {{ $t("common.offlineMode") }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
