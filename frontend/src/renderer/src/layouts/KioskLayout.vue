<script setup lang="ts">
import { RouterView } from "vue-router";
import { useNetworkStore } from "@/stores/network";
import { onMounted, onUnmounted } from "vue";

const networkStore = useNetworkStore();

onMounted(() => {
  networkStore.startMonitoring();
});

onUnmounted(() => {
  networkStore.stopMonitoring();
});
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-kiosk-background">
    <RouterView />

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
</style>
