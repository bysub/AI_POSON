<script setup lang="ts">
import { RouterView } from "vue-router";
import { useNetworkStore } from "@/stores/network";
import { useVirtualKeyboard } from "@/composables/useVirtualKeyboard";
import { useIdleTimer } from "@/composables/useIdleTimer";
import VirtualKeyboard from "@/components/kiosk/VirtualKeyboard.vue";
import { onMounted, onUnmounted } from "vue";

const networkStore = useNetworkStore();
const { init: initKeyboard, destroy: destroyKeyboard, contentShift } = useVirtualKeyboard();
const {
  showWarning,
  remainingSeconds,
  start: startIdleTimer,
  stop: stopIdleTimer,
} = useIdleTimer(30);

onMounted(() => {
  networkStore.startMonitoring();
  initKeyboard();
  startIdleTimer();
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

    <!-- Idle Warning Overlay -->
    <Transition name="fade">
      <div
        v-if="showWarning"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
      >
        <div class="mx-8 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div
            class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"
          >
            <svg
              class="h-10 w-10 text-amber-500"
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
          <p class="mb-2 text-xl font-bold text-gray-800">
            {{ $t("idle.warningTitle") }}
          </p>
          <p class="mb-6 text-base text-gray-500">
            {{ $t("idle.warningMessage", { seconds: remainingSeconds }) }}
          </p>
          <button
            class="w-full rounded-2xl bg-red-500 py-4 text-lg font-bold text-white transition-colors hover:bg-red-600 active:bg-red-700"
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
