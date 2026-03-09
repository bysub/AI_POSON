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
    <!-- Top bar (PointSelectView와 동일 구조) -->
    <header class="flex items-center justify-between px-6 pb-2 pt-6">
      <span
        class="text-sm"
        style="color: var(--theme-primary-text, #fff); opacity: 0.8"
      >{{ t("orderConfirm.headerTitle") }}</span>
      <span
        class="text-sm"
        style="color: var(--theme-primary-text, #fff); opacity: 0.8"
      >POSON Kiosk</span>
    </header>

    <!-- Main + Footer wrapper (카드 스타일) -->
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
        <!-- 타이틀 + 주문유형 뱃지 -->
        <div class="px-6 pt-6 text-center">
          <h2
            class="text-2xl font-extrabold"
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
          <div class="mt-3 flex items-center justify-center gap-2">
            <span
              class="rounded-full px-4 py-1.5 text-sm font-bold"
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
              class="rounded-full px-3 py-1.5 text-sm font-bold"
              style="background: var(--theme-bg-secondary, #fef3c7); color: var(--theme-text, #92400e)"
            >
              {{ t("orderConfirm.table", { no: cartStore.tableNo }) }}
            </span>
            <button
              v-if="needsTableInput"
              class="rounded-full border px-3 py-1.5 text-xs font-bold transition-colors"
              style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-border, #e2e8f0)"
              @click="showTableInput = true"
            >
              {{ cartStore.tableNo ? t("orderConfirm.changeTable") : t("orderConfirm.selectTable") }}
            </button>
          </div>
        </div>

        <!-- Order Items (카드 리스트) -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div class="space-y-3">
            <div
              v-for="(item, idx) in cartStore.items"
              :key="item.id"
              class="flex items-center gap-3 rounded-2xl p-3"
              style="background: var(--theme-bg-secondary, #f8fafc)"
            >
              <!-- 번호 -->
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
              >{{ idx + 1 }}</span>

              <!-- 이미지 -->
              <img
                v-if="item.imageUrl"
                :src="getImageSrc(item.imageUrl)"
                class="h-12 w-12 shrink-0 rounded-xl object-cover"
              >
              <div
                v-else
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style="background: var(--theme-border, #e2e8f0)"
              >
                <span
                  class="text-lg"
                  style="color: var(--theme-text-muted, #94a3b8)"
                >🍽</span>
              </div>

              <!-- 상품명 -->
              <div class="min-w-0 flex-1">
                <p
                  class="truncate font-bold order-item-name"
                  style="color: var(--theme-text, #1e293b)"
                >{{ getLocalizedName(item, locale) }}</p>
              </div>

              <!-- 수량 -->
              <span
                class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
                style="background: color-mix(in srgb, var(--theme-primary, #ef4444) 10%, transparent); color: var(--theme-primary, #ef4444)"
              >x{{ item.quantity }}</span>

              <!-- 가격 -->
              <span
                class="shrink-0 text-right font-extrabold order-item-price"
                style="color: var(--theme-text, #1e293b)"
              >{{ formatPrice(item.price * item.quantity) }}</span>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div
          class="mx-5 mb-3 rounded-2xl px-5 py-4"
          style="background: color-mix(in srgb, var(--theme-primary, #ef4444) 8%, transparent)"
        >
          <div class="flex items-center justify-between">
            <div>
              <span
                class="text-sm font-bold"
                style="color: var(--theme-primary, #ef4444)"
              >{{ t("orderConfirm.summary") }}</span>
              <span
                class="ml-2 text-sm"
                style="color: var(--theme-text-secondary, #64748b)"
              >{{
                t("orderConfirm.itemCount", { count: cartStore.totalItems })
              }}</span>
            </div>
            <div class="text-right">
              <span
                class="text-sm"
                style="color: var(--theme-text-secondary, #64748b)"
              >{{
                t("orderConfirm.totalAmount")
              }}</span>
              <span
                class="ml-2 text-2xl font-extrabold"
                style="color: var(--theme-primary, #ef4444)"
              >
                {{ formatPrice(cartStore.totalAmount) }}
              </span>
            </div>
          </div>
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
.order-item-name {
  font-size: var(--kiosk-font-base, 0.875rem);
  line-height: var(--kiosk-line-height, 1.25rem);
}
.order-item-price {
  font-size: var(--kiosk-font-base, 0.875rem);
}
</style>
