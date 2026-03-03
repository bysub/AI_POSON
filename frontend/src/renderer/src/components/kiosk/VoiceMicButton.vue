<script setup lang="ts">
import { ref, computed } from "vue";
import { useVoiceCommand } from "@/composables/useVoiceCommand";
import { useSTT } from "@/composables/useSTT";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const a11yStore = useAccessibilityStore();
const setupError = ref<string | null>(null);

// try-catch: Electron preload 미로드 등 예외 상황에서도 앱이 크래시하지 않도록 보호
let voice: ReturnType<typeof useVoiceCommand> | null = null;
let stt: ReturnType<typeof useSTT> | null = null;

try {
  voice = useVoiceCommand();
  stt = useSTT();
} catch (e) {
  setupError.value = e instanceof Error ? e.message : String(e);
  console.error("[VoiceMicButton] Setup failed:", e);
}

const isSupported = computed(() => voice?.isSupported.value ?? false);
const isListening = computed(() => voice?.isListening.value ?? false);
const sttStatus = computed(() => voice?.sttStatus.value ?? "idle");
</script>

<template>
  <button
    v-if="a11yStore.voiceEnabled && isSupported && !setupError"
    class="voice-mic-btn"
    :class="{
      'voice-mic-btn--listening': isListening,
      'voice-mic-btn--processing': sttStatus === 'processing',
      'voice-mic-btn--error': sttStatus === 'error',
    }"
    :aria-label="isListening ? t('voice.micListening') : t('voice.micLabel', '음성 주문')"
    @click="voice?.toggleListening()"
  >
    <!-- Idle: 마이크 아이콘 -->
    <svg
      v-if="!isListening && sttStatus !== 'processing'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-8 w-8"
    >
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
      <path
        d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V19H9a1 1 0 100 2h6a1 1 0 100-2h-2v-3.1A5 5 0 0017 11z"
      />
    </svg>

    <!-- Listening: 파형 아이콘 -->
    <svg
      v-else-if="isListening"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-8 w-8"
    >
      <rect x="4" y="8" width="2" height="8" rx="1" class="voice-wave voice-wave-1" />
      <rect x="8" y="5" width="2" height="14" rx="1" class="voice-wave voice-wave-2" />
      <rect x="12" y="7" width="2" height="10" rx="1" class="voice-wave voice-wave-3" />
      <rect x="16" y="4" width="2" height="16" rx="1" class="voice-wave voice-wave-4" />
      <rect x="20" y="9" width="2" height="6" rx="1" class="voice-wave voice-wave-5" />
    </svg>

    <!-- Processing: 로딩 스피너 -->
    <svg
      v-else
      class="h-8 w-8 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>

    <!-- 펄스 링 (listening 상태) -->
    <span v-if="isListening" class="voice-mic-pulse" />
  </button>
</template>

<style scoped>
.voice-mic-btn {
  position: fixed;
  bottom: 6rem;
  left: 1rem;
  z-index: 9985;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #6b7280;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.voice-mic-btn:active {
  transform: scale(0.95);
}

.voice-mic-btn--listening {
  background-color: #ef4444;
}

.voice-mic-btn--processing {
  background-color: #f97316;
}

.voice-mic-btn--error {
  background-color: #6b7280;
  border: 2px solid #ef4444;
}

/* 펄스 애니메이션 */
.voice-mic-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #ef4444;
  animation: voice-pulse 1.2s ease-in-out infinite;
}

@keyframes voice-pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

/* 파형 애니메이션 */
.voice-wave {
  animation: voice-wave-anim 0.6s ease-in-out infinite alternate;
}
.voice-wave-1 {
  animation-delay: 0s;
}
.voice-wave-2 {
  animation-delay: 0.1s;
}
.voice-wave-3 {
  animation-delay: 0.2s;
}
.voice-wave-4 {
  animation-delay: 0.15s;
}
.voice-wave-5 {
  animation-delay: 0.05s;
}

@keyframes voice-wave-anim {
  0% {
    transform: scaleY(0.5);
  }
  100% {
    transform: scaleY(1);
  }
}

/* 고대비 모드 */
:global(.a11y-high-contrast) .voice-mic-btn {
  background-color: #000;
  border: 2px solid #fff;
}
:global(.a11y-high-contrast) .voice-mic-btn--listening {
  background-color: #ff0000;
}
</style>
