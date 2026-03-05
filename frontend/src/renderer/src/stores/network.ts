import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { API_BASE_URL } from "@/config";

export const useNetworkStore = defineStore("network", () => {
  const isOnline = ref(navigator.onLine);
  const lastOnlineAt = ref<Date | null>(null);
  const checkInterval = ref<ReturnType<typeof setInterval> | null>(null);

  const offlineDuration = computed(() => {
    if (isOnline.value || !lastOnlineAt.value) return 0;
    return Date.now() - lastOnlineAt.value.getTime();
  });

  function startMonitoring() {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 즉시 첫 번째 체크 실행
    checkConnection();

    // Periodic check (every 30 seconds)
    checkInterval.value = setInterval(checkConnection, 30000);
  }

  function stopMonitoring() {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);

    if (checkInterval.value) {
      clearInterval(checkInterval.value);
      checkInterval.value = null;
    }
  }

  function handleOnline() {
    isOnline.value = true;
    lastOnlineAt.value = new Date();
  }

  function handleOffline() {
    isOnline.value = false;
  }

  async function checkConnection(): Promise<boolean> {
    try {
      // Ping the backend health endpoint
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: "HEAD",
        cache: "no-store",
      });
      isOnline.value = response.ok;
      if (response.ok) {
        lastOnlineAt.value = new Date();
      }
      return response.ok;
    } catch {
      isOnline.value = false;
      return false;
    }
  }

  return {
    isOnline,
    lastOnlineAt,
    offlineDuration,
    startMonitoring,
    stopMonitoring,
    checkConnection,
  };
});
