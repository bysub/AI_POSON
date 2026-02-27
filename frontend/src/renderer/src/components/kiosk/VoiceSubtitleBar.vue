<script setup lang="ts">
import { useVoiceCommand } from "@/composables/useVoiceCommand";
import { useAccessibilityStore } from "@/stores/accessibility";

const a11yStore = useAccessibilityStore();
const voice = useVoiceCommand();
</script>

<template>
  <Transition name="subtitle-fade">
    <div
      v-if="a11yStore.voiceEnabled && voice.showSubtitle.value"
      class="voice-subtitle-bar"
      :class="{
        'voice-subtitle-bar--listening': voice.isListening.value,
        'voice-subtitle-bar--success': voice.lastCommand.value?.success === true,
        'voice-subtitle-bar--error': voice.lastCommand.value?.success === false,
      }"
      role="status"
      aria-live="polite"
    >
      <!-- 상태 아이콘 -->
      <span v-if="voice.isListening.value" class="voice-subtitle-icon"> 🎤 </span>
      <span
        v-else-if="voice.lastCommand.value?.success === true"
        class="voice-subtitle-icon text-green-400"
      >
        ✓
      </span>
      <span
        v-else-if="voice.lastCommand.value?.success === false"
        class="voice-subtitle-icon text-red-400"
      >
        ✗
      </span>

      <!-- 텍스트 -->
      <span class="voice-subtitle-text" :class="{ 'text-gray-400': voice.isListening.value }">
        {{ voice.subtitleText.value }}
        <span v-if="voice.isListening.value" class="voice-dots">...</span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.voice-subtitle-bar {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9980;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 1.1rem;
  max-width: 80%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.voice-subtitle-bar--listening {
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.voice-subtitle-icon {
  flex-shrink: 0;
  font-size: 1.2rem;
}

.voice-subtitle-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-dots {
  animation: voice-dots-anim 1.2s steps(3, end) infinite;
}

@keyframes voice-dots-anim {
  0% {
    content: "";
    opacity: 0.3;
  }
  33% {
    opacity: 0.6;
  }
  66% {
    opacity: 0.9;
  }
  100% {
    opacity: 0.3;
  }
}

/* Transition */
.subtitle-fade-enter-active,
.subtitle-fade-leave-active {
  transition: all 0.3s ease;
}
.subtitle-fade-enter-from,
.subtitle-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* 고대비 모드 */
:global(.a11y-high-contrast) .voice-subtitle-bar {
  background-color: #000;
  border: 2px solid #fff;
}
</style>
