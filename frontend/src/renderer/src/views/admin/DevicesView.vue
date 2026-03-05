<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { showSuccessToast, showErrorToast, showApiError, showConfirm } from "@/utils/AlertUtils";
import ToggleGrid from "@/components/common/ToggleGrid.vue";
import {
  type Device,
  type DeviceType,
  type SettingsRecord,
  deviceTypeLabel,
  tabDefinitions,
  categoryMap,
  defaultTerminalConfig,
  defaultVanConfig,
  defaultSelfCashConfig,
  defaultSelfBagConfig,
  defaultSelfAutoConfig,
  defaultSelfPointConfig,
  defaultSelfPrintConfig,
  defaultSelfEtcConfig,
  defaultPosPrintConfig,
  defaultPosSaleConfig,
  defaultPosSettleConfig,
  defaultPosReceiptConfig,
  defaultKitchenConfig,
  terminalToggles,
  selfCashToggles,
  selfBagToggles,
  selfAutoToggles,
  selfPointToggles,
  selfPrintToggles,
  selfEtcToggles,
  posPrintToggles,
  posSaleToggles,
  staffSettleToggles,
  closeSettleToggles,
  posReceiptToggles,
} from "./deviceSettingsData";

// ─── 기기 목록 상태 ───
const devices = ref<Device[]>([]);
const selectedDeviceId = ref("");
const currentDeviceId = ref("");
const isLoadingDevices = ref(false);

// ─── 기기 추가 모달 ───
const showAddModal = ref(false);
const newDevice = ref({ id: "", name: "", type: "POS" as DeviceType });

// ─── 설정 상태 ───
const activeTab = ref("terminal");
const isLoading = ref(false);
const isSaving = ref(false);

// ─── 선택된 기기 ───
const selectedDevice = computed(() => devices.value.find((d) => d.id === selectedDeviceId.value));

const tabsByDevice = computed(() => {
  const type = selectedDevice.value?.type;
  if (!type) return [];
  return tabDefinitions[type] ?? [];
});

// ─── 설정 데이터 refs ───
const terminalConfig = ref<SettingsRecord>({ ...defaultTerminalConfig });
const vanConfig = ref<SettingsRecord>({ ...defaultVanConfig });
const selfCashConfig = ref<SettingsRecord>({ ...defaultSelfCashConfig });
const selfBagConfig = ref<SettingsRecord>({ ...defaultSelfBagConfig });
const selfAutoConfig = ref<SettingsRecord>({ ...defaultSelfAutoConfig });
const selfPointConfig = ref<SettingsRecord>({ ...defaultSelfPointConfig });
const selfPrintConfig = ref<SettingsRecord>({ ...defaultSelfPrintConfig });
const selfEtcConfig = ref<SettingsRecord>({ ...defaultSelfEtcConfig });
const posPrintConfig = ref<SettingsRecord>({ ...defaultPosPrintConfig });
const posSaleConfig = ref<SettingsRecord>({ ...defaultPosSaleConfig });
const posSettleConfig = ref<SettingsRecord>({ ...defaultPosSettleConfig });
const posReceiptConfig = ref<SettingsRecord>({ ...defaultPosReceiptConfig });
const kitchenConfig = ref<SettingsRecord>({ ...defaultKitchenConfig });

// 탭ID → ref 매핑
const configRefs: Record<string, ReturnType<typeof ref<SettingsRecord>>> = {
  terminal: terminalConfig,
  van: vanConfig,
  selfCash: selfCashConfig,
  selfBag: selfBagConfig,
  selfAuto: selfAutoConfig,
  selfPoint: selfPointConfig,
  selfPrint: selfPrintConfig,
  selfEtc: selfEtcConfig,
  posPrint: posPrintConfig,
  posSale: posSaleConfig,
  posSettle: posSettleConfig,
  posReceipt: posReceiptConfig,
  kitchenMsg: kitchenConfig,
};

const currentTabLabel = computed(
  () => tabsByDevice.value.find((t) => t.id === activeTab.value)?.label ?? "",
);

// ─── API: 기기 목록 ───
async function loadDevices(): Promise<void> {
  isLoadingDevices.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Device[] }>("/api/v1/devices");
    if (res.data.success) {
      devices.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load devices:", err);
  } finally {
    isLoadingDevices.value = false;
  }
}

async function addDevice(): Promise<void> {
  if (!newDevice.value.id || !newDevice.value.name) return;
  try {
    const res = await apiClient.post<{ success: boolean; data: Device }>(
      "/api/v1/devices",
      newDevice.value,
    );
    if (res.data.success) {
      devices.value.push(res.data.data);
      selectedDeviceId.value = res.data.data.id;
      showAddModal.value = false;
      newDevice.value = { id: "", name: "", type: "POS" };
    }
  } catch (err: unknown) {
    showApiError(err, "기기 등록에 실패했습니다");
  }
}

async function deleteDevice(id: string): Promise<void> {
  const { isConfirmed } = await showConfirm("삭제", "delete");
  if (!isConfirmed) return;
  try {
    await apiClient.delete(`/api/v1/devices/${id}`);
    devices.value = devices.value.filter((d) => d.id !== id);
    if (selectedDeviceId.value === id) {
      selectedDeviceId.value = devices.value[0]?.id ?? "";
    }
  } catch (err) {
    console.error("Failed to delete device:", err);
  }
}

// ─── API: 기기별 설정 ───
async function loadDeviceSettings(): Promise<void> {
  if (!selectedDeviceId.value) return;
  isLoading.value = true;
  try {
    const relevantTabs = tabsByDevice.value.map((t) => t.id);
    const categories = relevantTabs.map((id) => ({ ...categoryMap[id], tabId: id })).filter(Boolean);

    const responses = await Promise.all(
      categories.map((c) =>
        apiClient.get<{ success: boolean; data: SettingsRecord }>(
          `/api/v1/devices/${selectedDeviceId.value}/settings/${c.apiCategory.toLowerCase()}`,
        ),
      ),
    );
    responses.forEach((res, i) => {
      if (res.data.success && Object.keys(res.data.data).length > 0) {
        const d = res.data.data;
        const cfgRef = configRefs[categories[i].tabId];
        if (!cfgRef) return;
        const cfg = cfgRef.value;
        const prefix = categories[i].prefix;
        for (const key of Object.keys(cfg)) {
          const dbKey = `${prefix}.${key}`;
          if (d[dbKey] !== undefined) cfg[key] = d[dbKey];
        }
      }
    });
  } catch (err) {
    console.error("Failed to load device settings:", err);
  } finally {
    isLoading.value = false;
  }
}

function buildPayload(prefix: string, obj: SettingsRecord): SettingsRecord {
  const payload: SettingsRecord = {};
  for (const [key, value] of Object.entries(obj)) {
    payload[`${prefix}.${key}`] = String(value ?? "");
  }
  return payload;
}

async function saveCurrentTab(): Promise<void> {
  if (!selectedDeviceId.value) return;
  const cat = categoryMap[activeTab.value];
  if (!cat) return;
  const cfgRef = configRefs[activeTab.value];
  if (!cfgRef) return;
  isSaving.value = true;
  try {
    await apiClient.put(
      `/api/v1/devices/${selectedDeviceId.value}/settings/${cat.apiCategory.toLowerCase()}`,
      buildPayload(cat.prefix, cfgRef.value),
    );
    showSuccessToast("저장되었습니다");
  } catch (err) {
    showErrorToast(`저장 실패: ${err instanceof Error ? err.message : "오류 발생"}`);
  } finally {
    isSaving.value = false;
  }
}

function toggleValue(obj: SettingsRecord, key: string): void {
  obj[key] = obj[key] === "1" ? "0" : "1";
}

function selectDevice(id: string): void {
  selectedDeviceId.value = id;
  activeTab.value = "terminal";
}

watch(selectedDeviceId, () => {
  loadDeviceSettings();
});

onMounted(async () => {
  try {
    if (window.api?.getEnv) {
      currentDeviceId.value = await window.api.getEnv("POSON_DEVICE_ID");
    }
  } catch {
    // 환경변수 없으면 무시
  }

  await loadDevices();

  if (currentDeviceId.value && devices.value.some((d) => d.id === currentDeviceId.value)) {
    selectedDeviceId.value = currentDeviceId.value;
  } else if (devices.value.length > 0) {
    selectedDeviceId.value = devices.value[0].id;
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">기기별 설정</h2>
        <p class="mt-0.5 text-sm text-slate-500">등록된 기기별로 개별 설정을 관리합니다</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="selectedDevice"
          class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || isLoading"
          @click="saveCurrentTab"
        >
          {{ isSaving ? "저장 중..." : `${currentTabLabel} 저장` }}
        </button>
      </div>
    </div>

    <div class="flex gap-4">
      <!-- ═══════ 좌측: 기기 목록 ═══════ -->
      <div class="w-56 flex-shrink-0 space-y-2">
        <button
          class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
          @click="showAddModal = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v12m6-6H6"
            />
          </svg>
          기기 추가
        </button>

        <div v-if="isLoadingDevices" class="flex items-center justify-center py-8">
          <div
            class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
          />
        </div>

        <div
          v-for="device in devices"
          :key="device.id"
          class="group relative cursor-pointer rounded-xl border p-3 transition-colors"
          :class="
            selectedDeviceId === device.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          "
          @click="selectDevice(device.id)"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0">
              <p
                class="truncate text-sm font-semibold"
                :class="selectedDeviceId === device.id ? 'text-indigo-700' : 'text-slate-800'"
              >
                {{ device.name }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500">{{ device.id }}</p>
            </div>
            <button
              class="flex-shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              title="삭제"
              @click.stop="deleteDevice(device.id)"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="mt-1.5 flex items-center gap-1.5">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="{
                'bg-blue-100 text-blue-700': device.type === 'POS',
                'bg-amber-100 text-amber-700': device.type === 'KIOSK',
                'bg-emerald-100 text-emerald-700': device.type === 'KITCHEN',
              }"
            >
              {{ deviceTypeLabel[device.type] }}
            </span>
            <span
              v-if="device.id === currentDeviceId"
              class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
            >
              현재 기기
            </span>
          </div>
        </div>

        <div
          v-if="!isLoadingDevices && devices.length === 0"
          class="py-8 text-center text-sm text-slate-400"
        >
          등록된 기기가 없습니다
        </div>
      </div>

      <!-- ═══════ 우측: 선택된 기기 설정 ═══════ -->
      <div class="min-w-0 flex-1">
        <div
          v-if="!selectedDevice"
          class="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20"
        >
          <p class="text-sm text-slate-400">좌측에서 기기를 선택하세요</p>
        </div>

        <template v-else>
          <!-- 탭 -->
          <div
            class="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1"
          >
            <button
              v-for="tab in tabsByDevice"
              :key="tab.id"
              class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              "
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-12">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            />
          </div>

          <template v-else>
            <!-- ═══ 터미널 HW ═══ -->
            <div
              v-show="activeTab === 'terminal'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">터미널 하드웨어</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 종류</label>
                  <select
                    v-model="terminalConfig.terminalType"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">일반 POS</option>
                    <option value="1">셀프 키오스크</option>
                    <option value="2">주방 디스플레이</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">POS 번호</label>
                  <input
                    v-model="terminalConfig.posNo"
                    type="text"
                    maxlength="2"
                    placeholder="01"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >관리자 POS번호</label
                  >
                  <input
                    v-model="terminalConfig.adminPosNo"
                    type="text"
                    maxlength="2"
                    placeholder="z"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">프린터</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">프린터 종류</label>
                  <select
                    v-model="terminalConfig.printer"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">미사용</option>
                    <option value="1">시리얼</option>
                    <option value="2">패러럴</option>
                    <option value="3">USB</option>
                    <option value="4">네트워크</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">프린터 포트</label>
                  <input
                    v-model="terminalConfig.printerPort"
                    type="text"
                    placeholder="COM3"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">전송 속도</label>
                  <select
                    v-model="terminalConfig.printerBps"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">스캐너 / 카드리더</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">스캐너 포트</label>
                  <input
                    v-model="terminalConfig.scanPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >핸드스캐너 포트</label
                  >
                  <input
                    v-model="terminalConfig.handScanPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">MSR 포트</label>
                  <input
                    v-model="terminalConfig.msrPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <ToggleGrid
                :items="terminalToggles"
                :config="terminalConfig"
                @toggle="(k) => toggleValue(terminalConfig, k)"
              />
            </div>

            <!-- ═══ VAN 결제 ═══ -->
            <div
              v-show="activeTab === 'van'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">VAN 결제 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN사 선택</label>
                  <select
                    v-model="vanConfig.vanSelect"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">KSNET</option>
                    <option value="1">KIS</option>
                    <option value="2">KMPS</option>
                    <option value="3">SMARTRO</option>
                    <option value="4">NICE</option>
                    <option value="5">JTNet</option>
                    <option value="6">KICC</option>
                    <option value="7">KCB</option>
                    <option value="8">KOVAN</option>
                    <option value="9">KOCES</option>
                    <option value="10">KCP</option>
                    <option value="11">KFTC</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >서명패드 포트</label
                  >
                  <input
                    v-model="vanConfig.singPadPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >서명패드 속도</label
                  >
                  <select
                    v-model="vanConfig.singPadBps"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">VAN 연결 정보</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN IP</label>
                  <input
                    v-model="vanConfig.vanIp"
                    type="text"
                    placeholder="211.33.136.2"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN Port</label>
                  <input
                    v-model="vanConfig.vanPort"
                    type="text"
                    placeholder="7709"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">단말기 정보 (기기별 고유)</h4>
              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">단말기 번호</label>
                  <input
                    v-model="vanConfig.danmalNo"
                    type="text"
                    placeholder="DANMALNO"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">시리얼 번호</label>
                  <input
                    v-model="vanConfig.snumber"
                    type="text"
                    placeholder="Snumber"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <!-- ═══ POS: 인쇄/출력 ═══ -->
            <div
              v-show="activeTab === 'posPrint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">POS 인쇄/출력</h3>
              <ToggleGrid
                :items="posPrintToggles"
                :config="posPrintConfig"
                @toggle="(k) => toggleValue(posPrintConfig, k)"
              />
            </div>

            <!-- ═══ POS: 판매설정 ═══ -->
            <div
              v-show="activeTab === 'posSale'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">POS 판매설정</h3>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">영수증/절사 설정</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >할인상품 표시</label
                  >
                  <select
                    v-model="posSaleConfig.receiptDiscountDisplay"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">할인금액만 표시</option>
                    <option value="1">원가+할인 모두 표시</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >총매출금액 절사</label
                  >
                  <select
                    v-model="posSaleConfig.totalRounding"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">원단위 절사</option>
                    <option value="1">십단위 절사</option>
                    <option value="2">백단위 절사</option>
                    <option value="3">절사 안함</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >저울상품 절사</label
                  >
                  <select
                    v-model="posSaleConfig.scaleRounding"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">원단위 절사</option>
                    <option value="1">십단위 절사</option>
                    <option value="2">백단위 절사</option>
                    <option value="3">절사 안함</option>
                  </select>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">분류별 매출 출력</h4>
              <div class="mb-6">
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2">
                    <input
                      v-model="posSaleConfig.categoryPrintType"
                      type="radio"
                      value="0"
                      class="h-4 w-4 text-indigo-600"
                    />
                    <span class="text-sm text-slate-700">대분류</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      v-model="posSaleConfig.categoryPrintType"
                      type="radio"
                      value="1"
                      class="h-4 w-4 text-indigo-600"
                    />
                    <span class="text-sm text-slate-700">중분류</span>
                  </label>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">포인트/금액 설정</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >배달판매 포인트 적립율 (%)</label
                  >
                  <input v-model="posSaleConfig.deliveryPointRate" type="number" min="0" max="100" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >외상판매 포인트 적립율 (%)</label
                  >
                  <input v-model="posSaleConfig.creditPointRate" type="number" min="0" max="100" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >영수증 미발행 기준 (원 미만)</label
                  >
                  <input v-model="posSaleConfig.minReceiptAmount" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >포인트 미적립 기준 (원 미만)</label
                  >
                  <input v-model="posSaleConfig.minPointAmount" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카드 무서명 금액 (원 이하)</label
                  >
                  <input v-model="posSaleConfig.cardNoSignAmount" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <ToggleGrid
                :items="posSaleToggles"
                :config="posSaleConfig"
                @toggle="(k) => toggleValue(posSaleConfig, k)"
              />
            </div>

            <!-- ═══ POS: 정산/마감 ═══ -->
            <div
              v-show="activeTab === 'posSettle'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">정산/마감 설정</h3>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">담당자 정산서</h4>
              <div class="mb-6">
                <ToggleGrid
                  :items="staffSettleToggles"
                  :config="posSettleConfig"
                  @toggle="(k) => toggleValue(posSettleConfig, k)"
                />
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">마감 정산서</h4>
              <div class="mb-6">
                <ToggleGrid
                  :items="closeSettleToggles"
                  :config="posSettleConfig"
                  @toggle="(k) => toggleValue(posSettleConfig, k)"
                />
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">영수증 상/하단 메시지</h4>
              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">상단 메시지</label>
                  <input v-model="posSettleConfig.receiptTopMsg" type="text" placeholder="영수증 상단에 표시할 메시지" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">하단 메시지 1</label>
                  <input v-model="posSettleConfig.receiptBottomMsg1" type="text" placeholder="영수증 하단 메시지 1줄" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">하단 메시지 2</label>
                  <input v-model="posSettleConfig.receiptBottomMsg2" type="text" placeholder="영수증 하단 메시지 2줄" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">하단 메시지 3</label>
                  <input v-model="posSettleConfig.receiptBottomMsg3" type="text" placeholder="영수증 하단 메시지 3줄" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
            </div>

            <!-- ═══ POS: 영수증 ═══ -->
            <div
              v-show="activeTab === 'posReceipt'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">영수증 설정</h3>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">
                판매 &gt; 영수증 OFF시 출력 설정
              </h4>
              <p class="mb-4 text-xs text-slate-400">
                체크된 결제 방식은 영수증 OFF 상태에서도 영수증이 출력됩니다
              </p>
              <ToggleGrid
                :items="posReceiptToggles"
                :config="posReceiptConfig"
                @toggle="(k) => toggleValue(posReceiptConfig, k)"
              />
            </div>

            <!-- ═══ 셀프: 현금 결제 ═══ -->
            <div
              v-show="activeTab === 'selfCash'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">현금 결제 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">현금기 포트</label>
                  <input v-model="selfCashConfig.selfCashPort" type="text" placeholder="COM0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">대기시간 (ms)</label>
                  <input v-model="selfCashConfig.selfCashSleep" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">현금기 종류</label>
                  <select v-model="selfCashConfig.selfCashGubun" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="1">종류 1</option>
                    <option value="2">종류 2</option>
                  </select>
                </div>
              </div>
              <ToggleGrid :items="selfCashToggles" :config="selfCashConfig" @toggle="(k) => toggleValue(selfCashConfig, k)" />
            </div>

            <!-- ═══ 셀프: 봉투/저울 ═══ -->
            <div
              v-show="activeTab === 'selfBag'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">봉투/저울 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">봉투 감지 포트</label>
                  <input v-model="selfBagConfig.selfBagPort" type="text" placeholder="COM0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">저울 포트</label>
                  <input v-model="selfBagConfig.selfScalePort" type="text" placeholder="COM0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">저울 무게 한도 (g)</label>
                  <input v-model="selfBagConfig.selfScaleLimitG" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <ToggleGrid :items="selfBagToggles" :config="selfBagConfig" @toggle="(k) => toggleValue(selfBagConfig, k)" />
            </div>

            <!-- ═══ 셀프: 자동 운영 ═══ -->
            <div
              v-show="activeTab === 'selfAuto'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">자동 운영 (무인 모드)</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">자동 운영 날짜</label>
                  <input v-model="selfAutoConfig.autoDay" type="date" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">AM/PM</label>
                  <select v-model="selfAutoConfig.autoAP" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="0">AM</option>
                    <option value="1">PM</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">시</label>
                    <input v-model="selfAutoConfig.autoHH" type="text" maxlength="2" placeholder="00" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">분</label>
                    <input v-model="selfAutoConfig.autoMM" type="text" maxlength="2" placeholder="00" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">자동 로그인 ID</label>
                  <input v-model="selfAutoConfig.autoID" type="text" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">자동 로그인 PW</label>
                  <input v-model="selfAutoConfig.autoPass" type="password" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <ToggleGrid :items="selfAutoToggles" :config="selfAutoConfig" @toggle="(k) => toggleValue(selfAutoConfig, k)" />
            </div>

            <!-- ═══ 셀프: 포인트/알림 ═══ -->
            <div
              v-show="activeTab === 'selfPoint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">포인트/알림</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">고객 알람 시간 (초)</label>
                  <input v-model="selfPointConfig.selfCusAlarmTime" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">SNS 구분</label>
                  <select v-model="selfPointConfig.selfSNSGubun" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="0">미사용</option>
                    <option value="1">카카오</option>
                    <option value="2">SMS</option>
                  </select>
                </div>
              </div>
              <ToggleGrid :items="selfPointToggles" :config="selfPointConfig" @toggle="(k) => toggleValue(selfPointConfig, k)" />
            </div>

            <!-- ═══ 셀프: 인쇄/출력 ═══ -->
            <div
              v-show="activeTab === 'selfPrint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">인쇄/출력</h3>
              <ToggleGrid :items="selfPrintToggles" :config="selfPrintConfig" @toggle="(k) => toggleValue(selfPrintConfig, k)" />
            </div>

            <!-- ═══ 셀프: 기타 ═══ -->
            <div
              v-show="activeTab === 'selfEtc'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">기타</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">JP 봉투 포트</label>
                  <input v-model="selfEtcConfig.selfBagJPPort" type="text" placeholder="COM0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">GIF 파일 경로</label>
                  <input v-model="selfEtcConfig.selfGif" type="text" placeholder="경로" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <ToggleGrid :items="selfEtcToggles" :config="selfEtcConfig" @toggle="(k) => toggleValue(selfEtcConfig, k)" />
            </div>

            <!-- ═══ 주방 메시지 ═══ -->
            <div
              v-show="activeTab === 'kitchenMsg'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">주방 디스플레이</h3>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">주방 프린터</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">주방프린터 종류</label>
                  <select v-model="kitchenConfig.kitchenPrint" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="0">미사용</option>
                    <option value="1">시리얼</option>
                    <option value="4">네트워크</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">주방프린터 포트</label>
                  <input v-model="kitchenConfig.kitchenPrintPort" type="text" placeholder="COM7" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">전송 속도</label>
                  <select v-model="kitchenConfig.kitchenPrintBps" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">폰트 크기</label>
                  <input v-model="kitchenConfig.kitchenFontsize" type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">주방 메시지</h4>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 1</label>
                  <input v-model="kitchenConfig.kitchenMsg1" type="text" placeholder="주방 표시 메시지 1" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 2</label>
                  <input v-model="kitchenConfig.kitchenMsg2" type="text" placeholder="주방 표시 메시지 2" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 4</label>
                  <input v-model="kitchenConfig.kitchenMsg4" type="text" placeholder="주방 표시 메시지 4" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- ═══════ 기기 추가 모달 ═══════ -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showAddModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">기기 추가</h3>
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 ID</label>
            <input
              v-model="newDevice.id"
              type="text"
              placeholder="예: POS-01, KIOSK-02"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 이름</label>
            <input
              v-model="newDevice.name"
              type="text"
              placeholder="예: 1번 POS, 입구 키오스크"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 유형</label>
            <select
              v-model="newDevice.type"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="POS">POS</option>
              <option value="KIOSK">키오스크</option>
              <option value="KITCHEN">주방</option>
            </select>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="showAddModal = false"
          >
            취소
          </button>
          <button
            class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="!newDevice.id || !newDevice.name"
            @click="addDevice"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
