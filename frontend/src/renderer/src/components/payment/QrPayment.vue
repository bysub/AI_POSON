<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { formatNumber as formatPrice } from "@/utils/format";

const props = defineProps<{
  amount: number;
  paymentMethod: string; // PAYCO, WECHAT_PAY, ALIPAY, QR_PAY
  orderId: string;
}>();

const emit = defineEmits<{
  success: [transactionId: string, approvalNumber: string];
  fail: [errorCode: string, errorMessage: string];
  cancel: [];
}>();

const { t } = useI18n();

type QrStatus = "loading" | "waiting" | "processing" | "success" | "error";

const status = ref<QrStatus>("loading");
const qrDataUrl = ref("");
const errorMessage = ref("");
const countdown = ref(180); // 3분

const methodLabel = computed(() => {
  const labels: Record<string, string> = {
    PAYCO: "PAYCO",
    WECHAT_PAY: "WeChat Pay",
    ALIPAY: "Alipay",
    QR_PAY: "QR",
  };
  return labels[props.paymentMethod] ?? "QR";
});

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function requestQrCode(): Promise<void> {
  status.value = "loading";
  try {
    const { apiClient } = await import("@/services/api/client");

    // PG API로 QR 생성 요청 (Sprint 5 Phase 5-1 실제 연동 시 구현)
    const res = await apiClient.post("/api/v1/payments/qr-request", {
      orderId: props.orderId,
      amount: props.amount,
      paymentMethod: props.paymentMethod,
    });

    if (res.data.success && res.data.data?.qrUrl) {
      qrDataUrl.value = res.data.data.qrUrl;
      status.value = "waiting";
      startCountdown();
      startPolling(res.data.data.transactionId);
    } else {
      throw new Error(res.data.message || "QR 생성 실패");
    }
  } catch {
    // PG API 미구현 시 시뮬레이션 QR
    qrDataUrl.value = "";
    status.value = "waiting";
    startCountdown();
  }
}

function startCountdown(): void {
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function startPolling(txnId?: string): void {
  if (!txnId) return;
  pollTimer = setInterval(async () => {
    try {
      const { apiClient } = await import("@/services/api/client");
      const res = await apiClient.get(`/api/v1/payments/qr-status/${txnId}`);
      if (res.data.data?.status === "APPROVED") {
        stopTimers();
        status.value = "success";
        emit("success", txnId, res.data.data.approvalNumber ?? "");
      } else if (res.data.data?.status === "FAILED") {
        stopTimers();
        status.value = "error";
        errorMessage.value = res.data.data.errorMessage ?? t("payment.failed");
        emit("fail", "QR_FAILED", errorMessage.value);
      }
    } catch {
      // 폴링 에러는 무시 (다음 주기에 재시도)
    }
  }, 3000);
}

function stopTimers(): void {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function handleTimeout(): void {
  stopTimers();
  status.value = "error";
  errorMessage.value = t("cardPayment.timeout");
  emit("fail", "TIMEOUT", t("cardPayment.timeoutShort"));
}

function simulatePayment(): void {
  if (status.value !== "waiting") return;
  stopTimers();
  status.value = "processing";

  setTimeout(() => {
    status.value = "success";
    const txnId = `QR-${Date.now()}`;
    const approvalNo = `QA${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    emit("success", txnId, approvalNo);
  }, 2000);
}

function retry(): void {
  status.value = "loading";
  errorMessage.value = "";
  countdown.value = 180;
  requestQrCode();
}

function cancel(): void {
  stopTimers();
  emit("cancel");
}

onMounted(() => requestQrCode());
onUnmounted(() => stopTimers());
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center bg-gray-50 p-8">
    <!-- Amount -->
    <div class="mb-6 text-center">
      <p class="text-kiosk-lg text-gray-600">{{ t("cardPayment.amount") }}</p>
      <p class="text-kiosk-3xl font-bold text-primary-600">
        {{ formatPrice(amount) }}
        <span class="text-kiosk-xl">{{ t("common.currency") }}</span>
      </p>
    </div>

    <!-- Loading -->
    <template v-if="status === 'loading'">
      <div class="mb-6 h-20 w-20 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      <p class="text-kiosk-lg text-gray-600">{{ t("common.loading") }}</p>
    </template>

    <!-- QR Code Display -->
    <template v-else-if="status === 'waiting'">
      <div class="mb-4 text-center">
        <p class="text-kiosk-xl font-semibold text-gray-800">
          {{ methodLabel }}
        </p>
      </div>

      <!-- QR 영역 -->
      <div class="mb-6 flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="h-48 w-48" />
        <div v-else class="text-center text-sm text-gray-400">
          <svg class="mx-auto mb-2 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          QR (PG 연동 필요)
        </div>
      </div>

      <p class="mb-2 text-kiosk-base text-gray-500">
        {{ t("cardPayment.timeRemaining", { seconds: countdown }) }}
      </p>

      <!-- 테스트 버튼 -->
      <button
        class="mt-4 rounded-lg bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300"
        @click="simulatePayment"
      >
        [테스트] {{ methodLabel }} 결제 시뮬레이션
      </button>
    </template>

    <!-- Processing -->
    <template v-else-if="status === 'processing'">
      <div class="mb-6 h-20 w-20 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      <p class="text-kiosk-xl font-medium text-gray-800">{{ t("payment.processing") }}</p>
      <p class="mt-2 text-kiosk-base text-gray-500">{{ t("cardPayment.pleaseWait") }}</p>
    </template>

    <!-- Success -->
    <template v-else-if="status === 'success'">
      <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
        <svg class="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-kiosk-xl font-medium text-green-600">{{ t("cardPayment.completed") }}</p>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
        <svg class="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p class="text-kiosk-xl font-medium text-red-600">{{ t("payment.failed") }}</p>
      <p class="mt-2 text-kiosk-base text-gray-600">{{ errorMessage }}</p>
      <div class="mt-8 flex gap-4">
        <button class="btn-kiosk-secondary" @click="cancel">{{ t("common.cancel") }}</button>
        <button class="btn-kiosk-primary" @click="retry">{{ t("common.retry") }}</button>
      </div>
    </template>

    <!-- Cancel (waiting 상태에서만) -->
    <button v-if="status === 'waiting'" class="btn-kiosk-secondary mt-8" @click="cancel">
      {{ t("common.cancel") }}
    </button>
  </div>
</template>
