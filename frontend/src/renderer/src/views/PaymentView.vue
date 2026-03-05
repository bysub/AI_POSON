<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useNetworkStore } from "@/stores/network";
import { useSettingsStore } from "@/stores/settings";
import { useVoiceEventStore } from "@/stores/voiceEvent";
import { useTTS } from "@/composables/useTTS";
import { showWarningToast, showInfoToast } from "@/utils/AlertUtils";
import { CardPayment, CashPayment } from "@/components";
import type { Order } from "@/types";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName } from "@/utils/i18n";
import { formatPrice, getOptionsString } from "@/utils/format";

const router = useRouter();
const route = useRoute();
const { locale, t } = useI18n();
const cartStore = useCartStore();
const networkStore = useNetworkStore();
const settingsStore = useSettingsStore();
const voiceEventStore = useVoiceEventStore();
const tts = useTTS();

// memberId는 PointSelectView에서 query로 전달
const memberId = computed(() =>
  route.query.memberId ? parseInt(route.query.memberId as string, 10) : undefined,
);

type PaymentStep = "select" | "card" | "cash" | "processing";
type PaymentMethod = "card" | "mobile" | "scanner" | "cash";

const currentStep = ref<PaymentStep>("select");
const selectedMethod = ref<PaymentMethod | null>(null);
const currentOrder = ref<Order | null>(null);
const orderCreating = ref(false);
const orderError = ref<string | null>(null);

// 세금 계산 (설정 기반)
const taxRate = computed(() => parseFloat(settingsStore.get("sale.taxRate", "0.1")));
const taxIncluded = computed(() => settingsStore.get("sale.taxIncluded", "0") === "1");
const subtotal = computed(() => cartStore.totalAmount);
const tax = computed(() => {
  if (taxIncluded.value) {
    // 부가세 포함가: 역산 (total / (1 + rate) * rate)
    return Math.round(subtotal.value - subtotal.value / (1 + taxRate.value));
  }
  return Math.round(subtotal.value * taxRate.value);
});
const total = computed(() => {
  if (taxIncluded.value) return subtotal.value;
  return subtotal.value + tax.value;
});

/**
 * 결제 수단 선택
 */
const PAYMENT_METHOD_I18N: Record<PaymentMethod, string> = {
  card: "payment.card",
  mobile: "payment.mobilePay",
  scanner: "payment.scanner",
  cash: "payment.cash",
};

function selectPaymentMethod(method: PaymentMethod): void {
  selectedMethod.value = method;
  tts.speak(t(PAYMENT_METHOD_I18N[method]));
}

/**
 * 결제 진행
 */
async function proceedPayment(): Promise<void> {
  if (!selectedMethod.value) return;

  // 카드/모바일 결제는 온라인 필수
  if (selectedMethod.value === "card" || selectedMethod.value === "mobile") {
    if (!networkStore.isOnline) {
      showWarningToast(t("common.offlineMode"));
      return;
    }
  }

  // 주문 생성 (온라인인 경우에만)
  if (networkStore.isOnline && !currentOrder.value) {
    orderCreating.value = true;
    orderError.value = null;

    try {
      const order = await cartStore.submitOrder({
        orderType: cartStore.orderType ?? undefined,
        tableNo: cartStore.tableNo ?? undefined,
        memberId: memberId.value,
      });
      if (order) {
        currentOrder.value = order;
      } else {
        orderError.value = cartStore.orderError ?? t("payment.orderCreateFailed");
        orderCreating.value = false;
        return;
      }
    } catch (error) {
      orderError.value = error instanceof Error ? error.message : t("payment.orderCreateFailed");
      orderCreating.value = false;
      return;
    }

    orderCreating.value = false;
  }

  // 결제 단계로 이동
  if (selectedMethod.value === "card" || selectedMethod.value === "mobile") {
    currentStep.value = "card";
  } else if (selectedMethod.value === "cash") {
    currentStep.value = "cash";
  } else if (selectedMethod.value === "scanner") {
    showInfoToast(t("payment.scannerNotReady"));
  }
}

/**
 * 뒤로가기
 */
function goBack(): void {
  if (currentStep.value === "select") {
    router.back();
  } else {
    currentStep.value = "select";
  }
}

/**
 * 카드 결제 성공
 */
async function handleCardSuccess(transactionId: string, approvalNumber: string): Promise<void> {
  console.log("Card payment success:", { transactionId, approvalNumber });

  if (currentOrder.value?.id) {
    try {
      const { apiClient } = await import("@/services/api/client");

      // 주문 상태를 PAID로 업데이트 + Payment 레코드 생성
      await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
        status: "PAID",
        paymentType: "CARD",
      });
      console.log("Order status updated to PAID with CARD payment");
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    state: {
      type: "card",
      approvalNumber,
      orderId: currentOrder.value?.id ?? "",
      orderNumber,
    },
  });
}

/**
 * 카드 결제 실패
 */
function handleCardFail(errorCode: string, errorMessage: string): void {
  console.error("Card payment failed:", { errorCode, errorMessage });
  orderError.value = `${t("payment.failed")}: ${errorMessage}`;
}

/**
 * 현금 결제 성공
 */
async function handleCashSuccess(receivedAmount: number, changeAmount: number): Promise<void> {
  console.log("Cash payment success:", { receivedAmount, changeAmount });

  if (currentOrder.value?.id) {
    try {
      const { apiClient } = await import("@/services/api/client");

      // 주문 상태를 PAID로 업데이트 + Payment 레코드 생성
      await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
        status: "PAID",
        paymentType: "CASH",
        receivedAmount,
      });
      console.log("Order status updated to PAID with CASH payment");
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    state: {
      type: "cash",
      change: changeAmount.toString(),
      orderId: currentOrder.value?.id ?? "",
      orderNumber,
    },
  });
}

// 결제 에러 시 TTS
watch(orderError, (err) => {
  if (err) tts.speak(err);
});

// 음성 결제 수단 선택: Pinia store 구독
watch(
  () => voiceEventStore.paymentMethod,
  (event) => {
    if (!event || currentStep.value !== "select") return;

    if (event.method === "proceed") {
      if (selectedMethod.value) proceedPayment();
      return;
    }

    const validMethods: PaymentMethod[] = ["card", "mobile", "cash"];
    if (validMethods.includes(event.method as PaymentMethod)) {
      selectPaymentMethod(event.method as PaymentMethod);
      setTimeout(() => proceedPayment(), 500);
    }
  },
);

// 장바구니가 비어있으면 메뉴로 리다이렉트
onMounted(() => {
  if (cartStore.isEmpty) {
    router.replace("/menu");
  } else {
    tts.speak(
      t("a11y.tts.paymentGuide", {
        count: cartStore.totalItems,
        total: total.value.toLocaleString(),
      }),
    );
  }
});

onUnmounted(() => {
  voiceEventStore.$reset();
});
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden"
    style="background: var(--theme-bg, #FDF9F3)"
  >
    <!-- Step 1: Order Summary & Payment Selection -->
    <template v-if="currentStep === 'select'">
      <!-- Header -->
      <header class="flex-none px-6 pb-4 pt-6">
        <div class="mx-auto flex max-w-xl items-center justify-between">
          <button
            class="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform active:scale-95"
            style="border: 2px solid var(--theme-primary, #ef4444); background: var(--theme-surface, #fff); color: var(--theme-primary, #ef4444)"
            @click="goBack"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1
            class="text-xl font-extrabold tracking-tight"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("payment.yourOrder") }}
          </h1>
          <div class="w-12" />
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto px-6 pb-6">
        <div class="mx-auto flex max-w-xl flex-col gap-5">
          <!-- Order Summary Card -->
          <section
            class="rounded-3xl border p-5 shadow-sm"
            style="border-color: var(--theme-border, #e2e8f0); background: var(--theme-surface, #fff)"
          >
            <!-- Cart Items -->
            <div class="flex flex-col gap-4">
              <div
                v-for="item in cartStore.items"
                :key="item.id"
                class="flex items-start justify-between"
              >
                <div class="flex gap-3">
                  <!-- Item Image -->
                  <div
                    class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl"
                    style="background: var(--theme-bg-secondary, #f5ede0)"
                  >
                    <img
                      v-if="item.imageUrl"
                      :src="getImageSrc(item.imageUrl)"
                      :alt="getLocalizedName(item, locale)"
                      class="h-full w-full object-cover"
                    >
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-xl"
                      style="color: var(--theme-text-muted, #94a3b8)"
                    >
                      {{ getLocalizedName(item, locale).charAt(0) }}
                    </div>
                  </div>
                  <div>
                    <h3
                      class="text-base font-bold leading-tight"
                      style="color: var(--theme-text, #1e293b)"
                    >
                      {{ getLocalizedName(item, locale) }}
                      <span
                        v-if="item.quantity > 1"
                        style="color: var(--theme-primary, #ef4444)"
                      >
                        x{{ item.quantity }}
                      </span>
                    </h3>
                    <p
                      v-if="item.options && getOptionsString(item.options)"
                      class="mt-0.5 text-xs font-semibold"
                      style="color: var(--theme-text-muted, #94a3b8)"
                    >
                      + {{ getOptionsString(item.options) }}
                    </p>
                  </div>
                </div>
                <span
                  class="text-base font-bold"
                  style="color: var(--theme-text, #1e293b)"
                >
                  {{ formatPrice(item.price * item.quantity) }}
                </span>
              </div>
            </div>

            <!-- Price Summary -->
            <div
              class="mt-6 flex flex-col gap-2 border-t-2 border-dashed pt-5 price-summary-area"
              style="border-color: var(--theme-border, #e2e8f0)"
            >
              <div
                class="flex items-center justify-between font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                <span>{{ t("payment.subtotal") }}</span>
                <span>{{ formatPrice(subtotal) }}</span>
              </div>
              <div
                class="flex items-center justify-between font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                <span>{{ t("payment.tax") }} ({{ Math.round(taxRate * 100) }}%)</span>
                <span>{{ formatPrice(tax) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-xl font-black">
                <span style="color: var(--theme-text, #1e293b)">{{ t("cart.total") }}</span>
                <span style="color: var(--theme-primary, #ef4444)">{{ formatPrice(total) }}</span>
              </div>
            </div>
          </section>

          <!-- Payment Methods -->
          <section class="flex flex-col gap-3">
            <h2
              class="px-1 text-xs font-black uppercase tracking-widest"
              style="color: var(--theme-text, #1e293b)"
            >
              {{ t("payment.paymentMethod") }}
            </h2>

            <div class="flex flex-col gap-2.5">
              <!-- Credit Card -->
              <button
                class="flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all"
                :style="{
                  background: 'var(--theme-surface, #fff)',
                  borderColor: selectedMethod === 'card' ? 'var(--theme-primary, #ef4444)' : 'transparent',
                }"
                @click="selectPaymentMethod('card')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl"
                  style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-primary, #ef4444)"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span
                    class="block text-base font-bold"
                    style="color: var(--theme-text, #1e293b)"
                  >{{
                    t("payment.card")
                  }}</span>
                  <span
                    class="block text-xs font-semibold"
                    style="color: var(--theme-text-muted, #94a3b8)"
                  >{{
                    t("payment.cardDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5"
                  style="color: var(--theme-text-muted, #94a3b8)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Mobile Pay -->
              <button
                class="flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all"
                :style="{
                  background: 'var(--theme-surface, #fff)',
                  borderColor: selectedMethod === 'mobile' ? 'var(--theme-primary, #ef4444)' : 'transparent',
                }"
                @click="selectPaymentMethod('mobile')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl"
                  style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-primary, #ef4444)"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span
                    class="block text-base font-bold"
                    style="color: var(--theme-text, #1e293b)"
                  >{{
                    t("payment.mobilePay")
                  }}</span>
                  <span
                    class="block text-xs font-semibold"
                    style="color: var(--theme-text-muted, #94a3b8)"
                  >{{
                    t("payment.mobilePayDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5"
                  style="color: var(--theme-text-muted, #94a3b8)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Cash -->
              <button
                class="flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all"
                :style="{
                  background: 'var(--theme-surface, #fff)',
                  borderColor: selectedMethod === 'cash' ? 'var(--theme-primary, #ef4444)' : 'transparent',
                }"
                @click="selectPaymentMethod('cash')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl"
                  style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-primary, #ef4444)"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span
                    class="block text-base font-bold"
                    style="color: var(--theme-text, #1e293b)"
                  >{{
                    t("payment.cash")
                  }}</span>
                  <span
                    class="block text-xs font-semibold"
                    style="color: var(--theme-text-muted, #94a3b8)"
                  >{{
                    t("payment.cashDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5"
                  style="color: var(--theme-text-muted, #94a3b8)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Scanner -->
              <button
                class="flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all"
                :style="{
                  background: 'var(--theme-surface, #fff)',
                  borderColor: selectedMethod === 'scanner' ? 'var(--theme-primary, #ef4444)' : 'transparent',
                }"
                @click="selectPaymentMethod('scanner')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl"
                  style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-primary, #ef4444)"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span
                    class="block text-base font-bold"
                    style="color: var(--theme-text, #1e293b)"
                  >{{
                    t("payment.scanner")
                  }}</span>
                  <span
                    class="block text-xs font-semibold"
                    style="color: var(--theme-text-muted, #94a3b8)"
                  >{{
                    t("payment.scannerDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5"
                  style="color: var(--theme-text-muted, #94a3b8)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </section>
        </div>
      </main>

      <!-- Footer -->
      <footer
        class="flex-none border-t px-6 pb-8 pt-5 backdrop-blur-md"
        style="border-color: var(--theme-border, #e2e8f0); background: var(--theme-surface, #fff)"
      >
        <div class="mx-auto max-w-md">
          <!-- 에러 메시지 -->
          <div
            v-if="orderError"
            class="mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style="background: color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent); color: var(--theme-error, #ef4444)"
          >
            <svg
              class="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span class="flex-1">{{ orderError }}</span>
            <button
              class="font-bold"
              style="color: var(--theme-error, #ef4444)"
              @click="orderError = null"
            >
              ✕
            </button>
          </div>
          <button
            class="flex h-16 w-full items-center justify-center gap-3 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
            :disabled="!selectedMethod || orderCreating"
            @click="proceedPayment"
          >
            <!-- 로딩 스피너 -->
            <svg
              v-if="orderCreating"
              class="h-6 w-6 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span
              v-else
              class="text-xl font-extrabold uppercase tracking-tight"
            >
              {{ t("payment.payNow") }}
            </span>
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <p
            class="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.15em]"
            style="color: var(--theme-text-muted, #94a3b8)"
          >
            {{ t("payment.secureCheckout") }}
          </p>
        </div>
      </footer>
    </template>

    <!-- Step 2a: Card Payment -->
    <CardPayment
      v-else-if="currentStep === 'card'"
      :amount="total"
      @success="handleCardSuccess"
      @fail="handleCardFail"
      @cancel="goBack"
    />

    <!-- Step 2b: Cash Payment -->
    <CashPayment
      v-else-if="currentStep === 'cash'"
      :amount="total"
      @success="handleCashSuccess"
      @cancel="goBack"
    />
  </div>
</template>
<style scoped>
.price-summary-area div span{
  font-size: var(--kiosk-font-base);
}
</style>
