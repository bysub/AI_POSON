<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { formatNumber as formatPrice } from "@/utils/format";

defineProps<{
  amount: number;
}>();

const emit = defineEmits<{
  success: [transactionId: string, approvalNumber: string];
  fail: [errorCode: string, errorMessage: string];
  cancel: [];
}>();

const { t } = useI18n();

type PaymentStatus = "waiting" | "processing" | "success" | "error";

const status = ref<PaymentStatus>("waiting");
const statusMessage = ref("");
const errorMessage = ref("");
const countdown = ref(60);

let countdownTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 카운트다운 시작
 */
function startCountdown(): void {
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleTimeout();
    }
  }, 1000);
}

/**
 * 카운트다운 정지
 */
function stopCountdown(): void {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

/**
 * 타임아웃 처리
 */
function handleTimeout(): void {
  stopCountdown();
  status.value = "error";
  errorMessage.value = t("cardPayment.timeout");
  emit("fail", "TIMEOUT", t("cardPayment.timeoutShort"));
}

/**
 * 결제 시뮬레이션 (실제 구현에서는 VAN 연동)
 */
async function processPayment(): Promise<void> {
  status.value = "processing";
  statusMessage.value = t("payment.processing");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const success = Math.random() > 0.1;

  if (success) {
    stopCountdown();
    status.value = "success";
    const transactionId = `TXN${Date.now()}`;
    const approvalNumber = `AP${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    emit("success", transactionId, approvalNumber);
  } else {
    status.value = "error";
    errorMessage.value = t("cardPayment.declined");
    emit("fail", "CARD_DECLINED", errorMessage.value);
  }
}

/**
 * 카드 삽입/터치 이벤트 시뮬레이션
 */
function simulateCardInsert(): void {
  if (status.value === "waiting") {
    processPayment();
  }
}

/**
 * 재시도
 */
function retry(): void {
  status.value = "waiting";
  statusMessage.value = "";
  errorMessage.value = "";
  countdown.value = 60;
  startCountdown();
}

/**
 * 취소
 */
function cancel(): void {
  stopCountdown();
  emit("cancel");
}

onMounted(() => {
  startCountdown();
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center bg-gray-50 p-8">
    <!-- Amount Display -->
    <div class="mb-8 text-center">
      <p class="text-kiosk-lg text-gray-600">
        {{ t("cardPayment.amount") }}
      </p>
      <p class="text-kiosk-3xl font-bold text-primary-600">
        {{ formatPrice(amount) }}
        <span class="text-kiosk-xl">{{ t("common.currency") }}</span>
      </p>
    </div>

    <!-- Status Display -->
    <div class="mb-8 flex flex-col items-center">
      <!-- Waiting State -->
      <template v-if="status === 'waiting'">
        <div class="relative mb-6">
          <div class="animate-bounce">
            <svg
              class="h-32 w-32 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div class="absolute -right-4 top-1/2 -translate-y-1/2">
            <div class="flex flex-col gap-1">
              <div class="h-3 w-3 animate-pulse rounded-full bg-primary-400" />
              <div
                class="h-4 w-4 animate-pulse rounded-full bg-primary-300"
                style="animation-delay: 0.1s"
              />
              <div
                class="h-5 w-5 animate-pulse rounded-full bg-primary-200"
                style="animation-delay: 0.2s"
              />
            </div>
          </div>
        </div>

        <p class="text-kiosk-xl font-medium text-gray-800">
          {{ t("payment.insertCard") }}
        </p>

        <p class="mt-2 text-kiosk-base text-gray-500">
          {{ t("cardPayment.timeRemaining", { seconds: countdown }) }}
        </p>

        <button
          class="mt-8 rounded-lg bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300"
          @click="simulateCardInsert"
        >
          {{ t("cardPayment.testSimulation") }}
        </button>
      </template>

      <!-- Processing State -->
      <template v-else-if="status === 'processing'">
        <div class="mb-6">
          <div
            class="h-24 w-24 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
          />
        </div>
        <p class="text-kiosk-xl font-medium text-gray-800">
          {{ statusMessage }}
        </p>
        <p class="mt-2 text-kiosk-base text-gray-500">
          {{ t("cardPayment.pleaseWait") }}
        </p>
      </template>

      <!-- Success State -->
      <template v-else-if="status === 'success'">
        <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <svg
            class="h-16 w-16 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p class="text-kiosk-xl font-medium text-green-600">
          {{ t("cardPayment.completed") }}
        </p>
      </template>

      <!-- Error State -->
      <template v-else-if="status === 'error'">
        <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <svg class="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p class="text-kiosk-xl font-medium text-red-600">
          {{ t("payment.failed") }}
        </p>
        <p class="mt-2 text-kiosk-base text-gray-600">
          {{ errorMessage }}
        </p>

        <div class="mt-8 flex gap-4">
          <button class="btn-kiosk-secondary" @click="cancel">
            {{ t("common.cancel") }}
          </button>
          <button class="btn-kiosk-primary" @click="retry">
            {{ t("common.retry") }}
          </button>
        </div>
      </template>
    </div>

    <!-- Cancel Button (only when waiting) -->
    <button v-if="status === 'waiting'" class="btn-kiosk-secondary mt-8" @click="cancel">
      {{ t("common.cancel") }}
    </button>
  </div>
</template>
