<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocaleStore } from "@/stores/locale";
import { useTTS } from "@/composables/useTTS";
import { formatPrice } from "@/utils/format";

const router = useRouter();
const { t } = useI18n();
const localeStore = useLocaleStore();
const tts = useTTS();

const countdown = ref(30);

// 결제 정보 (history.state로 전달 — URL에 민감 정보 미노출)
const routeState = (history.state ?? {}) as Record<string, string>;
const paymentType = computed(() => routeState.type ?? "");
const approvalNumber = computed(() => routeState.approvalNumber ?? "");
const changeAmount = computed(() => {
  return routeState.change ? parseInt(routeState.change, 10) : 0;
});

// 주문 번호 (서버에서 받은 것 또는 임시 생성)
const orderNumber = computed(() => {
  const serverOrderNumber = routeState.orderNumber;
  if (serverOrderNumber) {
    // YYMMDD-NNNN 형식에서 마지막 숫자 부분만 추출
    const parts = serverOrderNumber.split("-");
    return parts.length > 1 ? parseInt(parts[1], 10) : Math.floor(Math.random() * 900) + 100;
  }
  return Math.floor(Math.random() * 900) + 100;
});

// 타이머
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * 홈으로 이동
 */
function goHome(): void {
  localeStore.resetLocale();
  router.push("/");
}

onMounted(() => {
  // TTS 주문완료 안내
  tts.speak(
    t("a11y.tts.complete", {
      number: orderNumber.value,
    }),
  );

  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer);
      goHome();
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-rose-50">
    <!-- Header -->
    <header class="flex items-center justify-between p-4 pb-2">
      <div class="flex h-12 w-12 shrink-0 items-center justify-start text-red-500">
        <svg
          class="h-10 w-10"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      </div>
      <h2
        class="flex-1 pr-12 text-center text-lg font-bold leading-tight tracking-tight text-gray-800"
      >
        {{ t("complete.title") }}
      </h2>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 flex-col items-center justify-center px-6">
      <!-- Order Number Card -->
      <div class="mb-6 rounded-xl bg-red-500/10 px-8 py-6">
        <h1 class="text-center text-6xl font-extrabold tracking-tight text-red-500">
          #{{ orderNumber }}
        </h1>
        <p class="mt-2 text-center text-sm font-bold uppercase tracking-widest text-red-500">
          {{ t("complete.yourOrderNumber") }}
        </p>
      </div>

      <!-- Thank You Message -->
      <div class="max-w-xs text-center">
        <p class="pb-3 pt-1 text-xl font-semibold leading-relaxed text-gray-800">
          {{ t("complete.thankYou") }}
        </p>
        <p class="pb-6 text-base font-normal leading-normal text-gray-600">
          {{ t("complete.receiptGuide") }}
        </p>
      </div>

      <!-- Payment Details -->
      <div
        v-if="paymentType === 'card' && approvalNumber"
        class="mb-4 rounded-xl bg-white/80 px-6 py-3 shadow-sm"
      >
        <p class="text-xs font-medium text-gray-500">
          {{ t("complete.approvalNumber") }}
        </p>
        <p class="text-lg font-bold text-gray-800">
          {{ approvalNumber }}
        </p>
      </div>

      <div
        v-if="paymentType === 'cash' && changeAmount > 0"
        class="mb-4 rounded-xl bg-white/80 px-6 py-3 shadow-sm"
      >
        <p class="text-xs font-medium text-gray-500">
          {{ t("payment.change") }}
        </p>
        <p class="text-2xl font-bold text-red-500">
          {{ formatPrice(changeAmount) }}
        </p>
      </div>

      <!-- Receipt Illustration -->
      <div class="mb-8 flex w-full max-w-xs justify-center">
        <div
          class="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-dashed border-red-500/30 bg-red-500/5"
        >
          <svg
            class="h-20 w-20 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <!-- Printing Badge -->
          <div
            class="absolute -bottom-2 rounded-full border border-red-500/20 bg-white px-4 py-1 shadow-sm"
          >
            <span
              class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight text-red-500"
            >
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              {{ t("complete.printingReceipt") }}
            </span>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="mt-auto px-6 pb-8">
      <div class="flex flex-col gap-4">
        <button
          class="flex h-14 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-red-500 px-5 text-lg font-bold leading-normal tracking-wide text-white shadow-lg shadow-red-500/20 transition-transform active:scale-95"
          @click="goHome"
        >
          <span class="truncate">{{ t("complete.returnToHome") }}</span>
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
          >
            {{ countdown }}
          </span>
        </button>
        <p class="text-center text-xs font-medium text-gray-400">
          {{ t("complete.autoReset", { seconds: countdown }) }}
        </p>
      </div>
    </footer>
  </div>
</template>
