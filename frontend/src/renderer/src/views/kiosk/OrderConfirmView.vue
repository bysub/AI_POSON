<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useSettingsStore } from "@/stores/settings";
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
const tts = useTTS();

// 테이블 선택 설정
const tableSelectEnabled = computed(
  () => settingsStore.get("sale.tableSelectEnabled", "0") === "1",
);
const tableCount = computed(() => parseInt(settingsStore.get("sale.tableCount", "0"), 10));

// 매장 선택 + 테이블 설정 활성 시 테이블 입력 필요 여부
const needsTableInput = computed(
  () => cartStore.orderType === "DINE_IN" && tableSelectEnabled.value && tableCount.value > 0,
);

// 테이블 입력 모드
const showTableInput = ref(false);

// 테이블번호 입력 확인
function handleTableConfirm(value: string) {
  const num = parseInt(value, 10);
  if (num > 0 && num <= tableCount.value) {
    cartStore.setTableNo(num);
    showTableInput.value = false;
    tts.speak(t("a11y.tts.tableSelected", { no: num }));
  } else {
    showWarningToast(t("orderConfirm.tableNotFound"));
  }
}

// 결제하기 → 다음 단계
function proceed() {
  // 매장 선택 + 테이블 입력 필요한데 아직 입력 안 한 경우
  if (needsTableInput.value && !cartStore.tableNo) {
    showTableInput.value = true;
    return;
  }

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

// TTS 주문확인 안내 + 장바구니 비어있으면 메뉴로
onMounted(() => {
  if (cartStore.items.length === 0) {
    router.replace("/menu");
    return;
  }
  // 매장 선택 + 테이블 입력 필요하면 바로 테이블 입력 모달 표시
  if (needsTableInput.value && !cartStore.tableNo) {
    showTableInput.value = true;
  }
  tts.speak(
    t("a11y.tts.orderConfirm", {
      count: cartStore.totalItems,
      total: cartStore.totalAmount.toLocaleString(),
    }),
  );
});

</script>

<template>
  <div
    class="flex h-full flex-col"
    style="background: linear-gradient(to bottom, var(--theme-primary, #f87171), var(--theme-primary-hover, #ef4444))"
  >
    <!-- Header -->
    <header class="px-6 pb-2 pt-6 text-center">
      <h1
        class="text-2xl font-extrabold"
        style="color: var(--theme-primary-text, #fff)"
      >
        {{ t("orderConfirm.headerTitle") }}
      </h1>
    </header>

    <!-- Main + Footer wrapper -->
    <div
      class="mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl"
      style="background: var(--theme-surface, #fff)"
    >
    <!-- Main Content -->
    <main class="flex flex-1 flex-col overflow-hidden">
      <!-- 테이블 입력 모드 -->
      <template v-if="showTableInput">
        <div class="flex flex-1 flex-col items-center justify-center px-6">
          <h2
            class="mb-2 text-2xl font-bold"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("orderConfirm.tableInputTitle") }}
          </h2>
          <p
            class="mb-8 text-base"
            style="color: var(--theme-text-muted, #94a3b8)"
          >
            {{ t("orderConfirm.tableInputDesc", { max: tableCount }) }}
          </p>
          <NumberPad
            :max-length="3"
            :placeholder="t('orderConfirm.tableInputPlaceholder')"
            @confirm="handleTableConfirm"
            @cancel="showTableInput = false"
          />
          <button
            class="mt-4 rounded-xl border-2 px-8 py-3 text-base font-bold transition-colors"
            style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-primary, #ef4444)"
            @click="showTableInput = false"
          >
            {{ t("common.close") }}
          </button>
        </div>
      </template>

      <!-- 구매내역 확인 모드 -->
      <template v-else>
        <div class="px-6 pt-6 text-center">
          <h2
            class="text-xl font-bold"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("orderConfirm.title") }}
          </h2>
          <p
            class="mt-1 text-sm"
            style="color: var(--theme-text-muted, #94a3b8)"
          >
            {{ t("orderConfirm.doNotInsertCard") }}
          </p>
        </div>

        <!-- Order Items Table -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <table class="w-full order-items-table-area">
            <thead>
              <tr
                class="border-b-2 text-left text-sm"
                style="border-color: var(--theme-primary, #f87171); color: var(--theme-primary, #ef4444)"
              >
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
                class="border-b"
                style="border-color: var(--theme-border, #e2e8f0)"
              >
                <td
                  class="py-3 text-sm colNo"
                  style="color: var(--theme-text-secondary, #64748b)"
                >
                  {{ idx + 1 }}
                </td>
                <td
                  class="py-3 text-sm colProduct"
                  style="color: var(--theme-text, #1e293b)"
                >
                  <div class="flex items-center gap-2">
                    <img
                      v-if="item.imageUrl"
                      :src="getImageSrc(item.imageUrl)"
                      class="h-8 w-8 rounded object-cover"
                    >
                    <span>{{ getLocalizedName(item, locale) }}</span>
                  </div>
                </td>
                <td
                  class="py-3 text-center text-sm colQty"
                  style="color: var(--theme-text-secondary, #64748b)"
                >
                  {{ item.quantity }}
                </td>
                <td
                  class="py-3 text-right text-sm font-medium colPrice"
                  style="color: var(--theme-text, #1e293b)"
                >
                  {{ formatPrice(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div
          class="border-t-2 px-6 py-3"
          style="border-color: var(--theme-primary, #f87171)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span
                class="text-base font-bold"
                style="color: var(--theme-primary, #ef4444)"
              >{{ t("orderConfirm.summary") }}</span>
              <span
                class="text-base"
                style="color: var(--theme-text-secondary, #64748b)"
              >{{
                t("orderConfirm.itemCount", { count: cartStore.totalItems })
              }}</span>
            </div>
            <div>
              <span
                class="text-base font-bold"
                style="color: var(--theme-primary, #ef4444)"
              >{{
                t("orderConfirm.totalAmount")
              }}</span>
              <span
                class="ml-2 text-xl font-extrabold"
                style="color: var(--theme-text, #1e293b)"
              >
                {{ formatPrice(cartStore.totalAmount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 주문유형 뱃지 + 테이블번호 -->
        <div class="flex items-center justify-center gap-3 px-6 py-4">
          <span
            class="rounded-full px-5 py-2 text-base font-bold"
            :style="
              cartStore.orderType === 'DINE_IN'
                ? { background: 'var(--theme-primary, #ef4444)', color: 'var(--theme-primary-text, #fff)' }
                : { background: 'var(--theme-accent, #f59e0b)', color: 'var(--theme-primary-text, #fff)' }
            "
          >
            {{ cartStore.orderType === "DINE_IN" ? t("orderConfirm.dineIn") : t("orderConfirm.takeout") }}
          </span>
          <span
            v-if="cartStore.orderType === 'DINE_IN' && cartStore.tableNo"
            class="rounded-full px-4 py-2 text-base font-bold"
            style="background: var(--theme-bg-secondary, #fef3c7); color: var(--theme-text, #92400e)"
          >
            {{ t("orderConfirm.table", { no: cartStore.tableNo }) }}
          </span>
          <button
            v-if="needsTableInput"
            class="rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors"
            style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-primary, #ef4444)"
            @click="showTableInput = true"
          >
            {{ cartStore.tableNo ? t("orderConfirm.changeTable") : t("orderConfirm.selectTable") }}
          </button>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <footer
      v-if="!showTableInput"
      class="flex gap-4 px-6 pb-10 pt-2"
    >
      <button
        class="flex-1 rounded-xl py-4 text-lg font-extrabold transition-colors disabled:opacity-40"
        style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
        :disabled="needsTableInput && !cartStore.tableNo"
        @click="proceed"
      >
        {{ t("cart.proceedToPayment") }}
      </button>
      <button
        class="flex-1 rounded-xl border-2 py-4 text-lg font-bold transition-colors"
        style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-primary, #ef4444)"
        @click="goBack"
      >
        {{ t("orderConfirm.goBack") }}
      </button>
    </footer>
    </div>
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
