<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useSettingsStore } from "@/stores/settings";
import { useVoiceEventStore } from "@/stores/voiceEvent";
import { useTTS } from "@/composables/useTTS";
import NumberPad from "@/components/kiosk/NumberPad.vue";
import { showWarningToast } from "@/utils/AlertUtils";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName } from "@/utils/i18n";
import { formatPrice } from "@/utils/format";

const router = useRouter();
const { locale, t } = useI18n();
const cartStore = useCartStore();
const settingsStore = useSettingsStore();
const voiceEventStore = useVoiceEventStore();
const tts = useTTS();

// 테이블 선택 설정
const tableSelectEnabled = computed(
  () => settingsStore.get("sale.tableSelectEnabled", "0") === "1",
);
const tableCount = computed(() => parseInt(settingsStore.get("sale.tableCount", "0"), 10));

// 선택 상태
type OrderTypeValue = "DINE_IN" | "TAKEOUT";
const selectedOrderType = ref<OrderTypeValue | null>(null);
const showTableInput = ref(false);
const tableNo = ref<number | null>(null);

// 매장/포장 선택
function selectOrderType(type: OrderTypeValue) {
  selectedOrderType.value = type;
  if (type === "DINE_IN" && tableCount.value > 0) {
    showTableInput.value = true;
  } else {
    showTableInput.value = false;
    tableNo.value = null;
  }
}

// 테이블번호 입력 확인
function handleTableConfirm(value: string) {
  const num = parseInt(value, 10);
  if (num > 0 && num <= tableCount.value) {
    tableNo.value = num;
    showTableInput.value = false;
    tts.speak(t("a11y.tts.tableSelected", { no: num }));
  } else {
    showWarningToast(t("orderConfirm.tableNotFound"));
  }
}

// 결제하기 → 다음 단계
function proceed() {
  const query: Record<string, string> = {};
  if (selectedOrderType.value) {
    query.orderType = selectedOrderType.value;
  }
  if (tableNo.value) {
    query.tableNo = String(tableNo.value);
  }

  // 포인트 설정 확인 → 포인트 화면 또는 결제 화면으로
  const pointEnabled = settingsStore.get("point.salePoint", "0") === "1";
  if (pointEnabled) {
    router.push({ path: "/point-select", query });
  } else {
    router.push({ path: "/payment", query });
  }
}

// 테이블 선택이 비활성이면 바로 다음으로
function skipToNext() {
  const pointEnabled = settingsStore.get("point.salePoint", "0") === "1";
  if (pointEnabled) {
    router.push("/point-select");
  } else {
    router.push("/payment");
  }
}

// 뒤로가기
function goBack() {
  if (showTableInput.value) {
    showTableInput.value = false;
  } else {
    router.push("/menu");
  }
}

// 음성 매장/포장 선택: Pinia store 구독
watch(
  () => voiceEventStore.orderType,
  (event) => {
    if (!event) return;
    if (event.type === "DINE_IN" || event.type === "TAKEOUT") {
      selectOrderType(event.type);
      tts.speak(t(event.type === "DINE_IN" ? "a11y.tts.dineIn" : "a11y.tts.takeout"));
    }
  },
);

// TTS 주문확인 안내 + 장바구니 비어있으면 메뉴로 + 테이블 선택 비활성이면 바로 스킵
onMounted(() => {
  if (cartStore.items.length === 0) {
    router.replace("/menu");
    return;
  }
  if (!tableSelectEnabled.value) {
    skipToNext();
    return;
  }
  tts.speak(
    t("a11y.tts.orderConfirm", {
      count: cartStore.totalItems,
      total: cartStore.totalAmount.toLocaleString(),
    }),
  );
});

onUnmounted(() => {
  voiceEventStore.$reset();
});
</script>

<template>
  <div
    v-if="tableSelectEnabled"
    class="flex h-full flex-col bg-gradient-to-b from-red-400 to-red-500"
  >
    <!-- Header -->
    <header class="px-6 pb-2 pt-6 text-center">
      <h1 class="text-2xl font-extrabold text-white">
        {{ t("orderConfirm.headerTitle") }}
      </h1>
    </header>

    <!-- Main Content -->
    <main class="mx-4 flex flex-1 flex-col overflow-hidden rounded-t-3xl bg-white">
      <!-- 테이블 입력 모드 -->
      <template v-if="showTableInput">
        <div class="flex flex-1 flex-col items-center justify-center px-6">
          <h2 class="mb-2 text-2xl font-bold text-gray-800">
            {{ t("orderConfirm.tableInputTitle") }}
          </h2>
          <p class="mb-8 text-base text-gray-500">
            {{ t("orderConfirm.tableInputDesc", { max: tableCount }) }}
          </p>
          <NumberPad
            :max-length="3"
            :placeholder="t('orderConfirm.tableInputPlaceholder')"
            @confirm="handleTableConfirm"
            @cancel="showTableInput = false"
          />
          <button
            class="mt-4 rounded-xl bg-gray-400 px-8 py-3 text-base font-bold text-white transition-colors hover:bg-gray-500"
            @click="showTableInput = false"
          >
            {{ t("common.close") }}
          </button>
        </div>
      </template>

      <!-- 구매내역 확인 모드 -->
      <template v-else>
        <div class="px-6 pt-6 text-center">
          <h2 class="text-xl font-bold text-gray-800">
            {{ t("orderConfirm.title") }}
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            {{ t("orderConfirm.doNotInsertCard") }}
          </p>
        </div>

        <!-- Order Items Table -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <table class="w-full order-items-table-area">
            <thead>
              <tr class="border-b-2 border-red-400 text-left text-sm text-red-500">
                <th class="pb-2 font-bold">
                  {{ t("orderConfirm.colNo") }}
                </th>
                <th class="pb-2 font-bold">
                  {{ t("orderConfirm.colProduct") }}
                </th>
                <th class="pb-2 text-center font-bold">
                  {{ t("orderConfirm.colQty") }}
                </th>
                <th class="pb-2 text-right font-bold">
                  {{ t("orderConfirm.colPrice") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in cartStore.items"
                :key="item.id"
                class="border-b border-gray-100"
              >
                <td class="py-3 text-sm text-gray-600 colNo">
                  {{ idx + 1 }}
                </td>
                <td class="py-3 text-sm text-gray-800 colProduct">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="item.imageUrl"
                      :src="getImageSrc(item.imageUrl)"
                      class="h-8 w-8 rounded object-cover"
                    >
                    <span>{{ getLocalizedName(item, locale) }}</span>
                  </div>
                </td>
                <td class="py-3 text-center text-sm text-gray-600 colQty">
                  {{ item.quantity }}
                </td>
                <td class="py-3 text-right text-sm font-medium text-gray-800 colPrice">
                  {{ formatPrice(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="border-t-2 border-red-400 px-6 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-base font-bold text-red-500">{{ t("orderConfirm.summary") }}</span>
              <span class="text-base text-gray-600">{{
                t("orderConfirm.itemCount", { count: cartStore.totalItems })
              }}</span>
            </div>
            <div>
              <span class="text-base font-bold text-red-500">{{
                t("orderConfirm.totalAmount")
              }}</span>
              <span class="ml-2 text-xl font-extrabold text-gray-800">
                {{ formatPrice(cartStore.totalAmount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 매장/포장 선택 -->
        <div role="radiogroup" :aria-label="t('orderConfirm.orderType')" class="flex justify-center gap-4 px-6 py-4">
          <button
            class="flex items-center gap-2 rounded-full border-2 px-8 py-3 text-lg font-bold transition-all"
            :class="
              selectedOrderType === 'DINE_IN'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
            "
            role="radio"
            :aria-checked="selectedOrderType === 'DINE_IN'"
            @click="
              selectOrderType('DINE_IN');
              tts.speak(t('a11y.tts.dineIn'));
            "
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full border-2"
              :class="selectedOrderType === 'DINE_IN' ? 'border-white bg-white' : 'border-gray-400'"
            >
              <span
                v-if="selectedOrderType === 'DINE_IN'"
                class="h-2.5 w-2.5 rounded-full bg-red-500"
              />
            </span>
            {{ t("orderConfirm.dineIn") }}
          </button>
          <button
            class="flex items-center gap-2 rounded-full border-2 px-8 py-3 text-lg font-bold transition-all"
            :class="
              selectedOrderType === 'TAKEOUT'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
            "
            role="radio"
            :aria-checked="selectedOrderType === 'TAKEOUT'"
            @click="
              selectOrderType('TAKEOUT');
              tts.speak(t('a11y.tts.takeout'));
            "
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full border-2"
              :class="selectedOrderType === 'TAKEOUT' ? 'border-white bg-white' : 'border-gray-400'"
            >
              <span
                v-if="selectedOrderType === 'TAKEOUT'"
                class="h-2.5 w-2.5 rounded-full bg-red-500"
              />
            </span>
            {{ t("orderConfirm.takeout") }}
          </button>
        </div>

        <!-- 테이블번호 표시 (매장 선택 + 테이블 입력 완료 시) -->
        <div
          v-if="selectedOrderType === 'DINE_IN' && tableNo"
          class="px-6 pb-2 text-center"
        >
          <span class="rounded-full bg-amber-100 px-4 py-1 text-sm font-bold text-amber-700">
            {{ t("orderConfirm.table", { no: tableNo }) }}
          </span>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <footer
      v-if="!showTableInput"
      class="flex gap-4 bg-white px-6 pb-6 pt-2"
    >
      <button
        class="flex-1 rounded-xl bg-red-500 py-4 text-lg font-extrabold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
        :disabled="!selectedOrderType"
        @click="proceed"
      >
        {{ t("cart.proceedToPayment") }}
      </button>
      <button
        class="flex-1 rounded-xl bg-gray-100 py-4 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-200"
        @click="goBack"
      >
        {{ t("orderConfirm.goBack") }}
      </button>
    </footer>
  </div>
</template>
<style scoped>
.order-items-table-area {
  font-size: var(--kiosk-font-base);
}
.order-items-table-area tbody{
  font-size: var(--kiosk-font-base);
}
.order-items-table-area tbody tr td{
  line-height: var(--kiosk-line-height);
}
.order-items-table-area tbody tr td.colProduct span{
  font-size: var(--kiosk-font-base);
}
</style>