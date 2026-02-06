<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useNetworkStore } from "@/stores/network";
import { CardPayment, CashPayment } from "@/components";
import type { Order } from "@/types";

const router = useRouter();
const { t } = useI18n();
const cartStore = useCartStore();
const networkStore = useNetworkStore();

type PaymentStep = "select" | "card" | "cash" | "processing";
type PaymentMethod = "card" | "mobile" | "scanner" | "cash";

const currentStep = ref<PaymentStep>("select");
const selectedMethod = ref<PaymentMethod | null>(null);
const currentOrder = ref<Order | null>(null);
const orderCreating = ref(false);
const orderError = ref<string | null>(null);

// 세금 계산 (10%)
const TAX_RATE = 0.1;
const subtotal = computed(() => cartStore.totalAmount);
const tax = computed(() => Math.round(subtotal.value * TAX_RATE));
const total = computed(() => subtotal.value + tax.value);

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return "₩" + new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 옵션 문자열 생성
 */
function getOptionsString(options?: Record<string, unknown>): string {
  if (!options) return "";
  return Object.values(options)
    .map((opt: any) => opt.name)
    .filter(Boolean)
    .join(", ");
}

/**
 * 결제 수단 선택
 */
function selectPaymentMethod(method: PaymentMethod): void {
  selectedMethod.value = method;
}

/**
 * 결제 진행
 */
async function proceedPayment(): Promise<void> {
  if (!selectedMethod.value) return;

  // 카드/모바일 결제는 온라인 필수
  if (selectedMethod.value === "card" || selectedMethod.value === "mobile") {
    if (!networkStore.isOnline) {
      alert(t("common.offlineMode"));
      return;
    }
  }

  // 주문 생성 (온라인인 경우에만)
  if (networkStore.isOnline && !currentOrder.value) {
    orderCreating.value = true;
    orderError.value = null;

    try {
      const order = await cartStore.submitOrder();
      if (order) {
        currentOrder.value = order;
      } else {
        orderError.value = cartStore.orderError ?? "주문 생성에 실패했습니다";
        orderCreating.value = false;
        return;
      }
    } catch (error) {
      orderError.value = error instanceof Error ? error.message : "주문 생성에 실패했습니다";
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
    alert("스캐너 결제는 준비 중입니다.");
  }
}

/**
 * 뒤로가기
 */
function goBack(): void {
  if (currentStep.value === "select") {
    router.push("/menu");
  } else {
    currentStep.value = "select";
  }
}

/**
 * 카드 결제 성공
 */
function handleCardSuccess(transactionId: string, approvalNumber: string): void {
  console.log("Card payment success:", { transactionId, approvalNumber });
  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    query: {
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
function handleCashSuccess(receivedAmount: number, changeAmount: number): void {
  console.log("Cash payment success:", { receivedAmount, changeAmount });
  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    query: {
      type: "cash",
      change: changeAmount.toString(),
      orderId: currentOrder.value?.id ?? "",
      orderNumber,
    },
  });
}

// 장바구니가 비어있으면 메뉴로 리다이렉트
onMounted(() => {
  if (cartStore.isEmpty) {
    router.replace("/menu");
  }
});
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-cream">
    <!-- Step 1: Order Summary & Payment Selection -->
    <template v-if="currentStep === 'select'">
      <!-- Header -->
      <header class="flex-none px-6 pb-4 pt-6">
        <div class="mx-auto flex max-w-md items-center justify-between">
          <button
            class="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-white text-red-500 shadow-sm transition-transform active:scale-95"
            @click="goBack"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 class="text-xl font-extrabold tracking-tight text-gray-700">
            {{ t("payment.yourOrder") }}
          </h1>
          <div class="w-12" />
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto px-6 pb-6">
        <div class="mx-auto flex max-w-md flex-col gap-5">
          <!-- Order Summary Card -->
          <section class="rounded-3xl border border-orange-50 bg-white p-5 shadow-sm">
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
                    class="h-14 w-14 flex-shrink-0 rounded-xl bg-orange-50 bg-cover bg-center"
                    :style="item.imageUrl ? `background-image: url('${item.imageUrl}')` : ''"
                  >
                    <div
                      v-if="!item.imageUrl"
                      class="flex h-full w-full items-center justify-center text-xl text-orange-300"
                    >
                      {{ item.name.charAt(0) }}
                    </div>
                  </div>
                  <div>
                    <h3 class="text-base font-bold leading-tight text-gray-800">
                      {{ item.name }}
                      <span v-if="item.quantity > 1" class="text-orange-500">
                        x{{ item.quantity }}
                      </span>
                    </h3>
                    <p
                      v-if="item.options && getOptionsString(item.options)"
                      class="mt-0.5 text-xs font-semibold text-orange-600/60"
                    >
                      + {{ getOptionsString(item.options) }}
                    </p>
                  </div>
                </div>
                <span class="text-base font-bold text-gray-800">
                  {{ formatPrice(item.price * item.quantity) }}
                </span>
              </div>
            </div>

            <!-- Price Summary -->
            <div class="mt-6 flex flex-col gap-2 border-t-2 border-dashed border-orange-100 pt-5">
              <div class="flex items-center justify-between font-bold text-orange-700/70">
                <span>{{ t("payment.subtotal") }}</span>
                <span>{{ formatPrice(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between font-bold text-orange-700/70">
                <span>{{ t("payment.tax") }} (10%)</span>
                <span>{{ formatPrice(tax) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-xl font-black text-gray-800">
                <span>{{ t("cart.total") }}</span>
                <span class="text-red-500">{{ formatPrice(total) }}</span>
              </div>
            </div>
          </section>

          <!-- Payment Methods -->
          <section class="flex flex-col gap-3">
            <h2 class="px-1 text-xs font-black uppercase tracking-widest text-gray-700">
              {{ t("payment.paymentMethod") }}
            </h2>

            <div class="flex flex-col gap-2.5">
              <!-- Credit Card -->
              <button
                class="flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all"
                :class="
                  selectedMethod === 'card'
                    ? 'border-red-500'
                    : 'border-transparent hover:border-red-300'
                "
                @click="selectPaymentMethod('card')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span class="block text-base font-bold text-gray-800">{{
                    t("payment.card")
                  }}</span>
                  <span class="block text-xs font-semibold text-orange-600/50">{{
                    t("payment.cardDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5 text-orange-200"
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
                class="flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all"
                :class="
                  selectedMethod === 'mobile'
                    ? 'border-red-500'
                    : 'border-transparent hover:border-red-300'
                "
                @click="selectPaymentMethod('mobile')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span class="block text-base font-bold text-gray-800">{{
                    t("payment.mobilePay")
                  }}</span>
                  <span class="block text-xs font-semibold text-orange-600/50">{{
                    t("payment.mobilePayDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5 text-orange-200"
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
                class="flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all"
                :class="
                  selectedMethod === 'cash'
                    ? 'border-red-500'
                    : 'border-transparent hover:border-red-300'
                "
                @click="selectPaymentMethod('cash')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span class="block text-base font-bold text-gray-800">{{
                    t("payment.cash")
                  }}</span>
                  <span class="block text-xs font-semibold text-orange-600/50">{{
                    t("payment.cashDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5 text-orange-200"
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
                class="flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all"
                :class="
                  selectedMethod === 'scanner'
                    ? 'border-red-500'
                    : 'border-transparent hover:border-red-300'
                "
                @click="selectPaymentMethod('scanner')"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-gray-700"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <span class="block text-base font-bold text-gray-800">{{
                    t("payment.scanner")
                  }}</span>
                  <span class="block text-xs font-semibold text-orange-600/50">{{
                    t("payment.scannerDesc")
                  }}</span>
                </div>
                <svg
                  class="h-5 w-5 text-orange-200"
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
        class="flex-none border-t border-orange-50 bg-white/80 px-6 pb-8 pt-5 backdrop-blur-md"
      >
        <div class="mx-auto max-w-md">
          <button
            class="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-red-500 shadow-xl shadow-red-500/30 transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            :disabled="!selectedMethod"
            @click="proceedPayment"
          >
            <span class="text-xl font-extrabold uppercase tracking-tight text-white">
              {{ t("payment.payNow") }}
            </span>
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <p
            class="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-orange-600/40"
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
