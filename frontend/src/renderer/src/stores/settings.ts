import { defineStore } from "pinia";
import { ref } from "vue";
import { apiClient, setDeviceId } from "@/services/api/client";

interface DeviceInfo {
  id: string;
  name: string;
  type: string;
}

export const useSettingsStore = defineStore("settings", () => {
  const systemSettings = ref<Record<string, string>>({});
  const deviceSettings = ref<Record<string, string>>({});
  const deviceId = ref("");
  const deviceInfo = ref<DeviceInfo | null>(null);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);

  function get(key: string, fallback = ""): string {
    return systemSettings.value[key] ?? fallback;
  }

  function getDevice(key: string, fallback = ""): string {
    return deviceSettings.value[key] ?? fallback;
  }

  async function initialize(force = false) {
    if (isLoaded.value && !force) return;

    error.value = null;

    try {
      // 1) POSON_DEVICE_ID 환경변수 조회 + API 클라이언트 Device ID 캐시 설정
      if (window.api?.getEnv) {
        deviceId.value = await window.api.getEnv("POSON_DEVICE_ID");
        if (deviceId.value) setDeviceId(deviceId.value);
      }

      // 2) 매장 공통 설정 + 기기 정보/설정 병렬 fetch
      const promises: Promise<void>[] = [fetchSystemSettings()];

      if (deviceId.value) {
        promises.push(fetchDeviceInfo(), fetchDeviceSettings());
      }

      await Promise.all(promises);

      // 설정 데이터가 실제로 로드된 경우만 isLoaded 마킹
      if (Object.keys(systemSettings.value).length > 0) {
        isLoaded.value = true;
      } else {
        console.warn("[SettingsStore] 설정 데이터가 비어 있음 — 다음 호출 시 재시도됨");
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "설정 로딩 실패";
      console.warn("[SettingsStore] initialize failed:", e);
    }
  }

  async function fetchSystemSettings() {
    try {
      const res = await apiClient.get<{ success: boolean; data: Record<string, string> }>(
        "/api/v1/settings",
      );
      if (res.data.success) {
        systemSettings.value = res.data.data;
      }
    } catch (e) {
      console.warn("[SettingsStore] fetchSystemSettings failed:", e);
    }
  }

  async function fetchDeviceInfo() {
    try {
      const res = await apiClient.get<{ success: boolean; data: DeviceInfo }>(
        `/api/v1/devices/${deviceId.value}`,
      );
      if (res.data.success) {
        deviceInfo.value = res.data.data;
      }
    } catch (e) {
      console.warn("[SettingsStore] fetchDeviceInfo failed:", e);
    }
  }

  async function fetchDeviceSettings() {
    try {
      const res = await apiClient.get<{ success: boolean; data: Record<string, string> }>(
        `/api/v1/devices/${deviceId.value}/settings`,
      );
      if (res.data.success) {
        deviceSettings.value = res.data.data;
      }
    } catch (e) {
      console.warn("[SettingsStore] fetchDeviceSettings failed:", e);
    }
  }

  return {
    systemSettings,
    deviceSettings,
    deviceId,
    deviceInfo,
    isLoaded,
    error,
    get,
    getDevice,
    initialize,
  };
});
