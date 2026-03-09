<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { showSuccessToast, showErrorToast } from "@/utils/AlertUtils";
import ToggleGrid from "@/components/common/ToggleGrid.vue";
import {
  type SettingsRecord,
  tabs,
  categoryMap,
  defaultSaleConfig,
  defaultPaymentConfig,
  defaultPrintConfig,
  defaultPointConfig,
  defaultBarcodeConfig,
  defaultSystemConfig,
  defaultAccessibilityConfig,
  saleToggles,
  paymentMethodToggles,
  paymentToggles,
  printToggles,
  pointToggles,
  pointEarnToggles,
  pointUseToggles,
  gradeToggles,
  selfUIToggles,
  systemToggles,
  accessibilityToggles,
} from "./settingsData";

// ─── 탭 ───
const activeTab = ref("sale");

// ─── 상태 ───
const isLoading = ref(false);
const isSaving = ref(false);

// ─── Config Refs ───
const saleConfig = ref<SettingsRecord>({ ...defaultSaleConfig });
const paymentConfig = ref<SettingsRecord>({ ...defaultPaymentConfig });
const printConfig = ref<SettingsRecord>({ ...defaultPrintConfig });
const pointConfig = ref<SettingsRecord>({ ...defaultPointConfig });
const barcodeConfig = ref<SettingsRecord>({ ...defaultBarcodeConfig });
const systemConfig = ref<SettingsRecord>({ ...defaultSystemConfig });
const accessibilityConfig = ref<SettingsRecord>({ ...defaultAccessibilityConfig });

const configRefs: Record<string, ReturnType<typeof ref<SettingsRecord>>> = {
  sale: saleConfig,
  payment: paymentConfig,
  print: printConfig,
  point: pointConfig,
  barcode: barcodeConfig,
  system: systemConfig,
  accessibility: accessibilityConfig,
};

// ─── API ───
async function loadSettings(): Promise<void> {
  isLoading.value = true;
  try {
    const tabIds = Object.keys(categoryMap);
    const responses = await Promise.all(
      tabIds.map((id) =>
        apiClient.get<{ success: boolean; data: SettingsRecord }>(
          `/api/v1/settings/${categoryMap[id].apiCategory.toLowerCase()}`,
        ),
      ),
    );
    responses.forEach((res, i) => {
      if (res.data.success && Object.keys(res.data.data).length > 0) {
        const d = res.data.data;
        const cfg = configRefs[tabIds[i]].value;
        const prefix = categoryMap[tabIds[i]].prefix;
        for (const key of Object.keys(cfg)) {
          const dbKey = `${prefix}.${key}`;
          if (d[dbKey] !== undefined) cfg[key] = d[dbKey];
        }
      }
    });
  } catch (err) {
    console.error("Failed to load settings:", err);
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
  const cat = categoryMap[activeTab.value];
  if (!cat) return;
  isSaving.value = true;
  try {
    await apiClient.put(
      `/api/v1/settings/${cat.apiCategory.toLowerCase()}`,
      buildPayload(cat.prefix, configRefs[activeTab.value].value),
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

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const currentTabLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label ?? "");

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">
          공통 환경설정
        </h2>
        <p class="mt-0.5 text-sm text-slate-500">
          전 기기에서 공유하는 매장 공통 설정입니다
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || isLoading"
          @click="saveCurrentTab"
        >
          {{ isSaving ? "저장 중..." : `${currentTabLabel} 저장` }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        v-for="tab in tabs"
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
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-12"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <template v-else>
      <!-- ═══════ TAB: 판매 운영 ═══════ -->
      <div
        v-show="activeTab === 'sale'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          판매 운영 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Sale] + [Other] 공통 항목 (전 기기 공유)
        </p>

        <!-- 영업 관리 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          영업 관리
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영업 시작일</label>
            <div class="flex gap-2">
              <input
                v-model="saleConfig.openDay"
                type="date"
                class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
              <button
                class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                @click="saleConfig.openDay = getTodayDate()"
              >
                오늘
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">마감일</label>
            <input
              v-model="saleConfig.finishDay"
              type="date"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">전표 시퀀스</label>
            <input
              v-model="saleConfig.receiptSeq"
              type="number"
              min="1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">시재금</label>
            <input
              v-model="saleConfig.startPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
        </div>

        <!-- 가격/금액 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          가격/금액
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최대 결제금액</label>
            <input
              v-model="saleConfig.maxPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최대 현금금액</label>
            <input
              v-model="saleConfig.maxCashPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">지연 설정</label>
            <input
              v-model="saleConfig.delay"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
        </div>

        <!-- 주방/테이블 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          주방 / 테이블
        </h4>
        <div class="mb-6 grid gap-3 md:grid-cols-2">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">주방 호출</p>
              <p class="text-xs text-slate-500">주문 완료 시 주방으로 호출 전송</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="saleConfig.kitchenCallEnabled === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(saleConfig, 'kitchenCallEnabled')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="saleConfig.kitchenCallEnabled === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">테이블 선택</p>
              <p class="text-xs text-slate-500">주문 시 테이블 번호 선택 화면 표시</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="saleConfig.tableSelectEnabled === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(saleConfig, 'tableSelectEnabled')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="saleConfig.tableSelectEnabled === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
        <div
          v-if="saleConfig.tableSelectEnabled === '1'"
          class="mb-6 grid gap-5 md:grid-cols-3"
        >
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">테이블 갯수</label>
            <input
              v-model="saleConfig.tableCount"
              type="number"
              min="0"
              max="999"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">
              매장에 배치된 테이블 수 (0: 미사용)
            </p>
          </div>
        </div>

        <!-- 판매 옵션 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          판매 옵션
        </h4>
        <ToggleGrid
          :items="saleToggles"
          :config="saleConfig"
          @toggle="(k) => toggleValue(saleConfig, k)"
        />
      </div>

      <!-- ═══════ TAB: 결제 정책 ═══════ -->
      <div
        v-show="activeTab === 'payment'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          결제 정책 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 카드/결제 + [Card] 공통 + [SuSu] (전 기기 공유)
        </p>

        <!-- 결제 수단 on/off -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          결제 수단 활성화
        </h4>
        <div class="mb-6">
          <ToggleGrid
            :items="paymentMethodToggles"
            :config="paymentConfig"
            @toggle="(k) => toggleValue(paymentConfig, k)"
          />
        </div>

        <!-- 카드 결제 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          카드/결제 정책
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">카드 최소금액</label>
            <input
              v-model="paymentConfig.minCardPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">
              0: 제한없음
            </p>
          </div>
        </div>

        <div class="mb-6">
          <ToggleGrid
            :items="paymentToggles"
            :config="paymentConfig"
            @toggle="(k) => toggleValue(paymentConfig, k)"
          />
        </div>

        <!-- 수수료 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          수수료 설정
        </h4>
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">카드 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCard"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">포인트 수수료 (%)</label>
            <input
              v-model="paymentConfig.commPoint"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">캐시백 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCashBack"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">현금 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCash"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">현금 비율 (%)</label>
            <input
              v-model="paymentConfig.commCashRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 출력 설정 ═══════ -->
      <div
        v-show="activeTab === 'print'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          출력 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 인쇄 관련 + S_Config (전 기기 공유)
        </p>

        <div class="mb-6">
          <ToggleGrid
            :items="printToggles"
            :config="printConfig"
            @toggle="(k) => toggleValue(printConfig, k)"
          />
        </div>

        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          용지 절단
        </h4>
        <div class="grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">절단 위치</label>
            <select
              v-model="printConfig.cutPosition"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">기본</option>
              <option value="1">위</option>
              <option value="2">아래</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 포인트/회원 ═══════ -->
      <div
        v-show="activeTab === 'point'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          포인트/회원 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: S_Config + INI [Other] 회원 관련 (전 기기 공유)
        </p>

        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량 상품 포인트</label>
            <select
              v-model="pointConfig.weightPoint"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">일반 적립</option>
              <option value="1">미적립</option>
              <option value="2">별도 적립률</option>
            </select>
          </div>
        </div>

        <div class="mb-6">
          <ToggleGrid
            :items="pointToggles"
            :config="pointConfig"
            @toggle="(k) => toggleValue(pointConfig, k)"
          />
        </div>

        <!-- 포인트 적립 설정 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          포인트 적립 설정
        </h4>
        <div class="mb-4">
          <ToggleGrid
            :items="pointEarnToggles"
            :config="pointConfig"
            @toggle="(k) => toggleValue(pointConfig, k)"
          />
        </div>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">적립 방식</label>
            <select
              v-model="pointConfig.pointEarnType"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="rate">비율 (%)</option>
              <option value="fixed">정액</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">적립 비율 (%)</label>
            <input
              v-model="pointConfig.pointEarnRate"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">정액 적립 (P)</label>
            <input
              v-model="pointConfig.pointEarnFixed"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">적립 기준 단위 (원)</label>
            <input
              v-model="pointConfig.pointEarnUnit"
              type="number"
              min="1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">N원 단위로 절사 후 적립 계산</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">적립 절사 방식</label>
            <select
              v-model="pointConfig.pointEarnRound"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="floor">내림</option>
              <option value="round">반올림</option>
              <option value="ceil">올림</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최소 적립 포인트</label>
            <input
              v-model="pointConfig.pointMinEarn"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">적립 최소 결제금액 (원)</label>
            <input
              v-model="pointConfig.pointMinPurchase"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
        </div>

        <!-- 등급별 차등 적립률 -->
        <div
          v-if="pointConfig.pointGradeEnabled === '1'"
          class="mb-6"
        >
          <h4 class="mb-3 text-sm font-semibold text-slate-600">등급별 적립률 (%)</h4>
          <div class="grid gap-5 md:grid-cols-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">일반</label>
              <input
                v-model="pointConfig.pointGradeNormalRate"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">실버</label>
              <input
                v-model="pointConfig.pointGradeSilverRate"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">골드</label>
              <input
                v-model="pointConfig.pointGradeGoldRate"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">VIP</label>
              <input
                v-model="pointConfig.pointGradeVipRate"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
            </div>
          </div>
        </div>

        <!-- 포인트 사용 설정 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          포인트 사용 설정
        </h4>
        <div class="mb-4">
          <ToggleGrid
            :items="pointUseToggles"
            :config="pointConfig"
            @toggle="(k) => toggleValue(pointConfig, k)"
          />
        </div>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최소 사용 포인트</label>
            <input
              v-model="pointConfig.pointUseMinBalance"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최대 사용 비율 (%)</label>
            <input
              v-model="pointConfig.pointUseMaxRate"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">결제 금액의 N%까지 사용 가능</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">잔액 결제 수단</label>
            <select
              v-model="pointConfig.pointUseSplitMethod"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="card">카드</option>
              <option value="cash">현금</option>
              <option value="select">고객 선택</option>
            </select>
          </div>
        </div>

        <!-- 등급 자동 변경 설정 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          등급 변경 기준
        </h4>
        <div class="mb-4">
          <ToggleGrid
            :items="gradeToggles"
            :config="pointConfig"
            @toggle="(k) => toggleValue(pointConfig, k)"
          />
        </div>
        <div
          v-if="pointConfig.gradeAutoEnabled === '1'"
          class="mb-6 grid gap-5 md:grid-cols-3"
        >
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">등급 기준</label>
            <select
              v-model="pointConfig.gradeCriteria"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="totalPoints">누적 포인트</option>
              <option value="totalPurchase">누적 구매액</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">실버 기준</label>
            <input
              v-model="pointConfig.gradeSilverThreshold"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">골드 기준</label>
            <input
              v-model="pointConfig.gradeGoldThreshold"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">VIP 기준</label>
            <input
              v-model="pointConfig.gradeVipThreshold"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">산정 기간</label>
            <select
              v-model="pointConfig.gradePeriod"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">전체 기간</option>
              <option value="year">최근 1년</option>
              <option value="month6">최근 6개월</option>
            </select>
          </div>
        </div>

        <!-- 고객 UI (키오스크) -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          고객 인터페이스 (키오스크)
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">상단 메시지</label>
            <input
              v-model="pointConfig.selfCusTopMsg"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">버튼 메시지 1</label>
            <input
              v-model="pointConfig.selfCusBTMsg1"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">버튼 메시지 2</label>
            <input
              v-model="pointConfig.selfCusBTMsg2"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">고객 선택 방식</label>
            <select
              v-model="pointConfig.selfCusSelect"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">방식 0</option>
              <option value="1">방식 1</option>
              <option value="2">방식 2</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">ID 리더기 유형</label>
            <select
              v-model="pointConfig.selfReader"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">바코드</option>
              <option value="2">RF</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">시작 핫키</label>
            <select
              v-model="pointConfig.selfStartHotKey"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">사용</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">가격 표시 유형</label>
            <select
              v-model="pointConfig.selfPriceType"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">기본</option>
              <option value="1">유형 1</option>
              <option value="2">유형 2</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">고객추가 기타</label>
            <select
              v-model="pointConfig.selfCusAddEtc"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">사용</option>
            </select>
          </div>
        </div>
        <ToggleGrid
          :items="selfUIToggles"
          :config="pointConfig"
          @toggle="(k) => toggleValue(pointConfig, k)"
        />
      </div>

      <!-- ═══════ TAB: 바코드/중량 ═══════ -->
      <div
        v-show="activeTab === 'barcode'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          바코드 / 중량 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Length] + S_Config (전 기기 공유)
        </p>

        <!-- 바코드 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          바코드 자동부여
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">바코드 자동부여 숫자</label>
            <input
              v-model="barcodeConfig.barCodeLen"
              type="text"
              maxlength="4"
              placeholder="95"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">
              자동 생성 바코드 앞자리 (예: 95 -> 950000000001)
            </p>
          </div>
        </div>

        <!-- 중량 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          중량상품 설정
        </h4>
        <div class="mb-4 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량상품 코드 길이</label>
            <input
              v-model="barcodeConfig.scaleLen"
              type="text"
              maxlength="2"
              placeholder="4"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">
              중량 바코드 상품코드 자릿수
            </p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량상품 시작문자</label>
            <input
              v-model="barcodeConfig.scaleStartChar"
              type="text"
              maxlength="4"
              placeholder="28"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
            <p class="mt-1 text-xs text-slate-400">
              중량 바코드 시작 식별자 (예: 28, 29)
            </p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량 가격 절사</label>
            <select
              v-model="barcodeConfig.scalePriceCut"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">10원 단위 절사</option>
              <option value="2">100원 단위 절사</option>
            </select>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">18자리 중량 바코드</p>
              <p class="text-xs text-slate-500">18자리 중량 바코드 형식 사용 (기본: 13자리)</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="barcodeConfig.scale18YN === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(barcodeConfig, 'scale18YN')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="barcodeConfig.scale18YN === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 시스템 ═══════ -->
      <div
        v-show="activeTab === 'system'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          시스템 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 시스템 + [Application] + [Backup] (전 기기 공유)
        </p>

        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">마스터 다운 주기 (주)</label>
            <input
              v-model="systemConfig.masterDownWeek"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">백업 경로</label>
            <input
              v-model="systemConfig.backupPath"
              type="text"
              placeholder="백업 경로 (예: D:\backup)"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
          </div>
        </div>

        <ToggleGrid
          :items="systemToggles"
          :config="systemConfig"
          @toggle="(k) => toggleValue(systemConfig, k)"
        />
      </div>

      <!-- ═══════ TAB: 접근성 ═══════ -->
      <div
        v-show="activeTab === 'accessibility'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">
          접근성 설정
        </h3>
        <p class="mb-4 text-sm text-slate-500">
          키오스크 접근성 기본값 설정 (KS X 9211 / WCAG 2.1 AA)
        </p>

        <!-- 토글 항목 -->
        <div class="mb-6">
          <ToggleGrid
            :items="accessibilityToggles"
            :config="accessibilityConfig"
            @toggle="(k) => toggleValue(accessibilityConfig, k)"
          />
        </div>

        <!-- 기본값 설정 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          기본값 설정
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기본 글꼴 크기</label>
            <select
              v-model="accessibilityConfig.defaultFontScale"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="standard">표준 (1.0x)</option>
              <option value="large">크게 (1.25x)</option>
              <option value="extraLarge">매우 크게 (1.5x)</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기본 화면 모드</label>
            <select
              v-model="accessibilityConfig.defaultContrast"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="default">기본</option>
            </select>
          </div>
        </div>

        <!-- TTS 속도/볼륨 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          음성 안내 (TTS) 설정
        </h4>
        <div class="mb-6 grid gap-5 md:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">
              TTS 속도 ({{ accessibilityConfig.ttsRate }}x)
            </label>
            <input
              v-model="accessibilityConfig.ttsRate"
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              class="w-full accent-indigo-600"
            >
            <div class="mt-1 flex justify-between text-xs text-slate-400">
              <span>느림 (0.8x)</span>
              <span>보통 (1.0x)</span>
              <span>빠름 (1.2x)</span>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">
              TTS 볼륨 ({{ Math.round(Number(accessibilityConfig.ttsVolume) * 100) }}%)
            </label>
            <input
              v-model="accessibilityConfig.ttsVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              class="w-full accent-indigo-600"
            >
            <div class="mt-1 flex justify-between text-xs text-slate-400">
              <span>음소거</span>
              <span>50%</span>
              <span>최대</span>
            </div>
          </div>
        </div>

        <!-- 음성 인식 (STT) 설정 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">
          음성 인식 (STT) 설정
        </h4>
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">
              STT 모델 크기
            </label>
            <select
              v-model="accessibilityConfig.sttModel"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="tiny">tiny (빠름, 낮은 정확도)</option>
              <option value="base">base (빠름)</option>
              <option value="small">small (권장)</option>
              <option value="medium">medium (느림, 높은 정확도)</option>
              <option value="large-v3">large-v3 (매우 느림, 최고 정확도)</option>
            </select>
            <p class="mt-1 text-xs text-slate-400">모델이 클수록 정확하지만 로딩이 느립니다</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">
              인식 대기 시간 ({{ accessibilityConfig.voiceTimeout }}초)
            </label>
            <input
              v-model="accessibilityConfig.voiceTimeout"
              type="range"
              min="3"
              max="20"
              step="1"
              class="w-full accent-indigo-600"
            >
            <div class="mt-1 flex justify-between text-xs text-slate-400">
              <span>3초</span>
              <span>10초</span>
              <span>20초</span>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">
              최소 신뢰도 ({{ Math.round(Number(accessibilityConfig.voiceConfidence) * 100) }}%)
            </label>
            <input
              v-model="accessibilityConfig.voiceConfidence"
              type="range"
              min="0.3"
              max="0.9"
              step="0.1"
              class="w-full accent-indigo-600"
            >
            <div class="mt-1 flex justify-between text-xs text-slate-400">
              <span>낮음 (30%)</span>
              <span>보통 (60%)</span>
              <span>높음 (90%)</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
