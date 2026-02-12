<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useSettingsStore } from "@/stores/settings";
import NumberPad from "@/components/kiosk/NumberPad.vue";
import { showWarningToast } from "@/utils/AlertUtils";
import { getImageSrc } from "@/utils/image";

const router = useRouter();
const { t } = useI18n();
const cartStore = useCartStore();
const settingsStore = useSettingsStore();

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

// 가격 포맷
function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

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
  } else {
    showWarningToast("해당 테이블은 없습니다.");
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

// 테이블 선택 비활성이면 바로 스킵
if (!tableSelectEnabled.value) {
  skipToNext();
}
</script>

<template>
  <div
    v-if="tableSelectEnabled"
    class="flex h-full flex-col bg-gradient-to-b from-red-400 to-red-500"
  >
    <!-- Header -->
    <header class="px-6 pb-2 pt-6 text-center">
      <h1 class="text-2xl font-extrabold text-white">구매내역을 확인해주세요.</h1>
    </header>

    <!-- Main Content -->
    <main class="mx-4 flex flex-1 flex-col overflow-hidden rounded-t-3xl bg-white">
      <!-- 테이블 입력 모드 -->
      <template v-if="showTableInput">
        <div class="flex flex-1 flex-col items-center justify-center px-6">
          <h2 class="mb-2 text-2xl font-bold text-gray-800">주문번호 발송</h2>
          <p class="mb-8 text-base text-gray-500">테이블번호를 입력해주세요 (1~{{ tableCount }})</p>
          <NumberPad
            :max-length="3"
            placeholder="테이블번호"
            @confirm="handleTableConfirm"
            @cancel="showTableInput = false"
          />
          <button
            class="mt-4 rounded-xl bg-gray-400 px-8 py-3 text-base font-bold text-white transition-colors hover:bg-gray-500"
            @click="showTableInput = false"
          >
            닫기
          </button>
        </div>
      </template>

      <!-- 구매내역 확인 모드 -->
      <template v-else>
        <div class="px-6 pt-6 text-center">
          <h2 class="text-xl font-bold text-gray-800">구매내역 확인</h2>
          <p class="mt-1 text-sm text-gray-500">아직 카드를 꽂지 마세요!</p>
        </div>

        <!-- Order Items Table -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <table class="w-full">
            <thead>
              <tr class="border-b-2 border-red-400 text-left text-sm text-red-500">
                <th class="pb-2 font-bold">순번</th>
                <th class="pb-2 font-bold">상품명</th>
                <th class="pb-2 text-center font-bold">수량</th>
                <th class="pb-2 text-right font-bold">가격</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in cartStore.items"
                :key="item.id"
                class="border-b border-gray-100"
              >
                <td class="py-3 text-sm text-gray-600">
                  {{ idx + 1 }}
                </td>
                <td class="py-3 text-sm text-gray-800">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="item.imageUrl"
                      :src="getImageSrc(item.imageUrl)"
                      class="h-8 w-8 rounded object-cover"
                    />
                    <span>{{ item.name }}</span>
                  </div>
                </td>
                <td class="py-3 text-center text-sm text-gray-600">
                  {{ item.quantity }}
                </td>
                <td class="py-3 text-right text-sm font-medium text-gray-800">
                  {{ formatPrice(item.price * item.quantity) }}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="border-t-2 border-red-400 px-6 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-base font-bold text-red-500">합계</span>
              <span class="text-base text-gray-600">{{ cartStore.totalItems }}건</span>
            </div>
            <div>
              <span class="text-base font-bold text-red-500">총 금액</span>
              <span class="ml-2 text-xl font-extrabold text-gray-800">
                {{ formatPrice(cartStore.totalAmount) }}원
              </span>
            </div>
          </div>
        </div>

        <!-- 매장/포장 선택 -->
        <div class="flex justify-center gap-4 px-6 py-4">
          <button
            class="flex items-center gap-2 rounded-full border-2 px-8 py-3 text-lg font-bold transition-all"
            :class="
              selectedOrderType === 'DINE_IN'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
            "
            @click="selectOrderType('DINE_IN')"
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
            매장
          </button>
          <button
            class="flex items-center gap-2 rounded-full border-2 px-8 py-3 text-lg font-bold transition-all"
            :class="
              selectedOrderType === 'TAKEOUT'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
            "
            @click="selectOrderType('TAKEOUT')"
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
            포장
          </button>
        </div>

        <!-- 테이블번호 표시 (매장 선택 + 테이블 입력 완료 시) -->
        <div v-if="selectedOrderType === 'DINE_IN' && tableNo" class="px-6 pb-2 text-center">
          <span class="rounded-full bg-amber-100 px-4 py-1 text-sm font-bold text-amber-700">
            테이블 {{ tableNo }}번
          </span>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <footer v-if="!showTableInput" class="flex gap-4 bg-white px-6 pb-6 pt-2">
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
        돌아가기
      </button>
    </footer>
  </div>
</template>
