<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useNetworkStore } from "@/stores/network";
import { useSettingsStore } from "@/stores/settings";
import { useVoiceEventStore } from "@/stores/voiceEvent";
import { useTTS } from "@/composables/useTTS";
import { showWarningToast } from "@/utils/AlertUtils";
import { CardPayment, CashPayment, PointPayment, QrPayment } from "@/components";
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

type PaymentStep = "select" | "card" | "cash" | "qr-pay" | "point-pay" | "processing";
type PaymentMethod = "card" | "mobile" | "scanner" | "cash" | "applePay" | "foreignCard" | "payco" | "wechatPay" | "alipay" | "storePoint";

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
 * 결제 수단 정의
 */
interface PaymentMethodDef {
  key: PaymentMethod;
  label: string;
  desc: string;
  icon: string;
  settingKey: string;        // settingsStore 키 (payment.{key}Enabled)
  stepType: PaymentStep;     // 결제 진행 시 이동할 단계
  backendType: string;       // API paymentType
  backendMethod?: string;    // API paymentMethod (간편결제 세분화)
}

const allPaymentMethods: PaymentMethodDef[] = [
  { key: "card", label: "payment.card", desc: "payment.cardDesc", settingKey: "payment.cardEnabled", stepType: "card", backendType: "CARD", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { key: "mobile", label: "payment.mobilePay", desc: "payment.mobilePayDesc", settingKey: "payment.mobileEnabled", stepType: "card", backendType: "SIMPLE_PAY", backendMethod: "SAMSUNG_PAY", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "cash", label: "payment.cash", desc: "payment.cashDesc", settingKey: "payment.cashEnabled", stepType: "cash", backendType: "CASH", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { key: "scanner", label: "payment.scanner", desc: "payment.scannerDesc", settingKey: "payment.scannerEnabled", stepType: "qr-pay", backendType: "SIMPLE_PAY", backendMethod: "QR_PAY", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
  { key: "applePay", label: "payment.applePay", desc: "payment.applePayDesc", settingKey: "payment.applePayEnabled", stepType: "card", backendType: "SIMPLE_PAY", backendMethod: "APPLE_PAY", icon: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.81-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" },
  { key: "foreignCard", label: "payment.foreignCard", desc: "payment.foreignCardDesc", settingKey: "payment.foreignCardEnabled", stepType: "card", backendType: "CARD", backendMethod: "FOREIGN_CARD", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "payco", label: "payment.payco", desc: "payment.paycoDesc", settingKey: "payment.paycoEnabled", stepType: "qr-pay", backendType: "SIMPLE_PAY", backendMethod: "PAYCO", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "wechatPay", label: "payment.wechatPay", desc: "payment.wechatPayDesc", settingKey: "payment.wechatPayEnabled", stepType: "qr-pay", backendType: "SIMPLE_PAY", backendMethod: "WECHAT_PAY", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { key: "alipay", label: "payment.alipay", desc: "payment.alipayDesc", settingKey: "payment.alipayEnabled", stepType: "qr-pay", backendType: "SIMPLE_PAY", backendMethod: "ALIPAY", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "storePoint", label: "payment.storePoint", desc: "payment.storePointDesc", settingKey: "payment.storePointEnabled", stepType: "point-pay", backendType: "POINT", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
];

/** 설정 기반 활성화된 결제 수단만 필터링 */
const paymentMethods = computed(() =>
  allPaymentMethods.filter((m) => settingsStore.get(m.settingKey, "1") === "1"),
);

/** 현재 선택된 결제 수단의 전체 정보 */
const selectedMethodDef = computed(() =>
  allPaymentMethods.find((m) => m.key === selectedMethod.value) ?? null,
);

function selectPaymentMethod(method: PaymentMethod): void {
  selectedMethod.value = method;
  const def = allPaymentMethods.find((m) => m.key === method);
  if (def) tts.speak(t(def.label));
}

/**
 * 결제 진행
 */
async function proceedPayment(): Promise<void> {
  if (!selectedMethod.value) return;

  // 현금 외 결제는 온라인 필수
  if (selectedMethod.value !== "cash") {
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

  // 결제 단계로 이동 (selectedMethodDef.stepType 기반)
  const def = selectedMethodDef.value;
  if (!def) return;

  if (def.stepType === "point-pay") {
    if (!memberId.value) {
      showWarningToast(t("payment.point.loginRequired"));
      return;
    }
    currentStep.value = "point-pay";
  } else if (def.stepType === "qr-pay") {
    currentStep.value = "qr-pay";
  } else {
    currentStep.value = def.stepType;
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

  const def = selectedMethodDef.value;
  let pointResultData: { earned: number; newBalance: number; gradeChanged: boolean } | null = null;

  if (currentOrder.value?.id) {
    try {
      const { apiClient } = await import("@/services/api/client");

      // 주문 상태를 PAID로 업데이트 + Payment 레코드 생성
      const res = await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
        status: "PAID",
        paymentType: def?.backendType ?? "CARD",
        paymentMethod: def?.backendMethod,
        approvalNumber,
        transactionId,
      });
      pointResultData = res.data?.data?.pointResult ?? null;
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    state: {
      type: def?.key ?? "card",
      approvalNumber,
      orderId: currentOrder.value?.id ?? "",
      orderNumber,
      ...(pointResultData && {
        earnedPoints: pointResultData.earned?.toString(),
        newBalance: pointResultData.newBalance?.toString(),
        gradeChanged: pointResultData.gradeChanged ? "1" : "",
      }),
    },
  });
}

/**
 * 카드 결제 실패 → DB에 FAILED 기록 저장
 */
async function handleCardFail(errorCode: string, errorMsg: string): Promise<void> {
  console.error("Card payment failed:", { errorCode, errorMessage: errorMsg });
  orderError.value = `${t("payment.failed")}: ${errorMsg}`;

  if (currentOrder.value?.id) {
    try {
      const { apiClient } = await import("@/services/api/client");
      const def = selectedMethodDef.value;
      await apiClient.post("/api/v1/payments/record-failure", {
        orderId: currentOrder.value.id,
        amount: splitInfo.value ? splitInfo.value.remaining : total.value,
        paymentType: def?.backendType ?? "CARD",
        paymentMethod: def?.backendMethod,
        errorCode,
        errorMessage: errorMsg,
      });
    } catch (err) {
      console.error("Failed to record payment failure:", err);
    }
  }
}

/**
 * 현금 결제 성공
 */
async function handleCashSuccess(receivedAmount: number, changeAmount: number): Promise<void> {
  console.log("Cash payment success:", { receivedAmount, changeAmount });

  let pointResultData: { earned: number; newBalance: number; gradeChanged: boolean } | null = null;

  if (currentOrder.value?.id) {
    try {
      const { apiClient } = await import("@/services/api/client");

      const res = await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
        status: "PAID",
        paymentType: "CASH",
        receivedAmount,
      });
      pointResultData = res.data?.data?.pointResult ?? null;
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
      ...(pointResultData && {
        earnedPoints: pointResultData.earned?.toString(),
        newBalance: pointResultData.newBalance?.toString(),
        gradeChanged: pointResultData.gradeChanged ? "1" : "",
      }),
    },
  });
}

/**
 * 포인트 결제 성공
 */
function handlePointSuccess(): void {
  const orderNumber = currentOrder.value?.orderNumber ?? "";
  cartStore.clear();
  router.push({
    path: "/complete",
    state: {
      type: "storePoint",
      orderId: currentOrder.value?.id ?? "",
      orderNumber,
    },
  });
}

/**
 * 분할 결제 - 잔액 결제 전환
 */
const splitInfo = ref<{ pointUsed: number; remaining: number } | null>(null);

function handleSplitRequired(info: { pointUsed: number; remaining: number }): void {
  splitInfo.value = info;
  const method = settingsStore.get("point.pointUseSplitMethod", "card");
  if (method === "cash") {
    currentStep.value = "cash";
  } else {
    currentStep.value = "card";
  }
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

    const validMethods = paymentMethods.value.map((m) => m.key);
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
    style="background: linear-gradient(to bottom, var(--theme-primary, #f87171), var(--theme-primary-hover, #ef4444))"
  >
    <!-- Step 1: Order Summary & Payment Selection -->
    <template v-if="currentStep === 'select'">
      <!-- Top bar (통일 헤더) -->
      <header class="flex items-center justify-between px-6 pb-2 pt-6">
        <div></div>
        <!--
        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:scale-95"
          style="background: color-mix(in srgb, var(--theme-primary-text, #fff) 20%, transparent); color: var(--theme-primary-text, #fff)"
          @click="goBack"
        >
          <svg
            class="h-5 w-5"
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
      -->
        <span
          class="text-2xl font-bold"
          style="color: var(--theme-primary-text, #fff)"
        >{{ t("payment.yourOrder") }}</span>
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
      <main class="flex-1 overflow-y-auto px-5 pb-4 pt-5">
        <div class="flex flex-col gap-5">
          <!-- Order Items (카드 리스트) -->
          <section class="flex flex-col gap-3">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="flex items-center gap-3 rounded-2xl p-3"
              style="background: var(--theme-bg-secondary, #f8fafc)"
            >
              <!-- Item Image -->
              <div
                class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl"
                style="background: var(--theme-border, #e2e8f0)"
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

              <!-- 상품명 + 옵션 -->
              <div class="min-w-0 flex-1">
                <h3
                  class="truncate text-base font-bold leading-tight"
                  style="color: var(--theme-text, #1e293b)"
                >
                  {{ getLocalizedName(item, locale) }}
                </h3>
                <p
                  v-if="item.options && getOptionsString(item.options)"
                  class="mt-0.5 truncate text-xs font-semibold"
                  style="color: var(--theme-text-muted, #94a3b8)"
                >
                  + {{ getOptionsString(item.options) }}
                </p>
              </div>

              <!-- 수량 -->
              <span
                v-if="item.quantity > 1"
                class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
                style="background: color-mix(in srgb, var(--theme-primary, #ef4444) 10%, transparent); color: var(--theme-primary, #ef4444)"
              >x{{ item.quantity }}</span>

              <!-- 가격 -->
              <span
                class="shrink-0 text-base font-extrabold"
                style="color: var(--theme-text, #1e293b)"
              >
                {{ formatPrice(item.price * item.quantity) }}
              </span>
            </div>
          </section>

          <!-- Price Summary Card -->
          <section
            class="rounded-2xl px-5 py-4"
            style="background: color-mix(in srgb, var(--theme-primary, #ef4444) 6%, transparent)"
          >
            <div
              class="flex flex-col gap-2 price-summary-area"
            >
              <div
                class="flex items-center justify-between text-sm font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                <span>{{ t("payment.subtotal") }}</span>
                <span>{{ formatPrice(subtotal) }}</span>
              </div>
              <div
                class="flex items-center justify-between text-sm font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                <span>{{ t("payment.tax") }} ({{ Math.round(taxRate * 100) }}%)</span>
                <span>{{ formatPrice(tax) }}</span>
              </div>
              <div
                class="mt-1 flex items-center justify-between border-t pt-3"
                style="border-color: color-mix(in srgb, var(--theme-primary, #ef4444) 20%, transparent)"
              >
                <span
                  class="text-base font-bold"
                  style="color: var(--theme-text, #1e293b)"
                >{{ t("cart.total") }}</span>
                <span
                  class="text-2xl font-extrabold"
                  style="color: var(--theme-primary, #ef4444)"
                >{{ formatPrice(total) }}</span>
              </div>
            </div>
          </section>

          <!-- Payment Methods -->
          <section class="flex flex-col gap-3 mx-auto">
            <h2
              class="px-1 text-2xl  font-black uppercase tracking-widest"
              style="color: var(--theme-text-secondary, #64748b)"
            >
              {{ t("payment.paymentMethod") }}
            </h2>
            <p
              class="px-1 text-sm font-medium"
              style="color: var(--theme-text-muted, #94a3b8)"
            >
              {{ t("payment.selectMethod") }}
            </p>

            <div class="grid grid-cols-4 gap-2.5">
              <button
                v-for="method in paymentMethods"
                :key="method.key"
                class="flex items-center gap-3 rounded-2xl border-2 p-3 transition-all"
                :style="{
                  background: 'var(--theme-bg-secondary, #f8fafc)',
                  borderColor: selectedMethod === method.key ? 'var(--theme-primary, #ef4444)' : 'transparent',
                }"
                @click="selectPaymentMethod(method.key)"
              >
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style="background: var(--theme-surface, #fff); color: var(--theme-primary, #ef4444)"
                >
                  <svg
                    class="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      :d="method.icon"
                    />
                  </svg>
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <span
                    class="block truncate text-sm font-bold"
                    style="color: var(--theme-text, #1e293b)"
                  >{{ t(method.label) }}</span>
                  <span
                    class="block truncate text-xs font-semibold"
                    style="color: var(--theme-text-muted, #94a3b8)"
                  >{{ t(method.desc) }}</span>
                </div>
              </button>
            </div>
          </section>
        </div>
      </main>

      <!-- Footer -->
      <footer class="px-6 pb-4 pt-2">
        <div class="w-full">
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
          <div class="flex w-full  gap-4 px-6">
            <button
              class="flex h-16 w-full items-center justify-center gap-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
              style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
              :disabled="!selectedMethod || orderCreating"
              @click="proceedPayment"
            >
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
                class="text-xl font-extrabold"
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
            
            <button
              class="h-16 w-full items-center justify-center gap-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 transition-colors"
              style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-primary, #ef4444); border-width: 2px;"
              @click="goBack"
            >
              {{ t("orderConfirm.goBack") }}
            </button>
        </div>
          <p
            class="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.15em]"
            style="color: var(--theme-text-muted, #94a3b8)"
          >
            {{ t("payment.secureCheckout") }}
          </p>
        </div>
      </footer>
      </div>
    </template>

    <!-- Step 2a: Card Payment -->
    <CardPayment
      v-else-if="currentStep === 'card'"
      :amount="splitInfo ? splitInfo.remaining : total"
      :payment-method="selectedMethodDef?.backendMethod"
      @success="handleCardSuccess"
      @fail="handleCardFail"
      @cancel="goBack"
    />

    <!-- Step 2b: Cash Payment -->
    <CashPayment
      v-else-if="currentStep === 'cash'"
      :amount="splitInfo ? splitInfo.remaining : total"
      @success="handleCashSuccess"
      @cancel="goBack"
    />

    <!-- Step 2c: Point Payment -->
    <PointPayment
      v-else-if="currentStep === 'point-pay' && currentOrder"
      :order-id="currentOrder.id"
      :total-amount="total"
      :member-id="memberId!"
      @success="handlePointSuccess"
      @cancel="goBack"
      @split-required="handleSplitRequired"
    />

    <!-- Step 2d: QR Payment (PG 간편결제) -->
    <QrPayment
      v-else-if="currentStep === 'qr-pay' && currentOrder"
      :amount="total"
      :payment-method="selectedMethodDef?.backendMethod ?? 'QR_PAY'"
      :order-id="currentOrder.id"
      @success="handleCardSuccess"
      @fail="handleCardFail"
      @cancel="goBack"
    />
  </div>
</template>
<style scoped>
.price-summary-area div span{
  font-size: var(--kiosk-font-base);
}
</style>
