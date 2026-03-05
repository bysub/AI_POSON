<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatNumber as formatPrice } from "@/utils/format";

const props = defineProps<{
  amount: number;
}>();

const emit = defineEmits<{
  success: [receivedAmount: number, changeAmount: number];
  cancel: [];
}>();

const { t } = useI18n();

const receivedAmount = ref(0);
const showCashReceipt = ref(false);
const cashReceiptPhone = ref("");

// 거스름돈 계산
const changeAmount = computed(() => {
  const change = receivedAmount.value - props.amount;
  return change > 0 ? change : 0;
});

// 결제 가능 여부
const canComplete = computed(() => receivedAmount.value >= props.amount);

// 빠른 금액 버튼들
const quickAmounts = [1000, 5000, 10000, 50000];

/**
 * 빠른 금액 추가
 */
function addQuickAmount(amount: number): void {
  receivedAmount.value += amount;
}

/**
 * 정확한 금액
 */
function setExactAmount(): void {
  receivedAmount.value = props.amount;
}

/**
 * 금액 초기화
 */
function resetAmount(): void {
  receivedAmount.value = 0;
}

/**
 * 숫자 패드 입력
 */
function appendNumber(num: string): void {
  const newAmount = parseInt(`${receivedAmount.value}${num}`, 10);
  if (newAmount <= 999999) {
    receivedAmount.value = newAmount;
  }
}

/**
 * 마지막 숫자 삭제
 */
function deleteLastDigit(): void {
  const str = receivedAmount.value.toString();
  if (str.length > 1) {
    receivedAmount.value = parseInt(str.slice(0, -1), 10);
  } else {
    receivedAmount.value = 0;
  }
}

/**
 * 결제 완료
 */
function complete(): void {
  if (canComplete.value) {
    emit("success", receivedAmount.value, changeAmount.value);
  }
}

/**
 * 취소
 */
function cancel(): void {
  emit("cancel");
}
</script>

<template>
  <div class="flex h-full flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white p-6 shadow-sm">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-kiosk-sm text-gray-500">
            {{ t("cashPayment.amount") }}
          </p>
          <p class="text-kiosk-xl font-bold text-gray-900">
            {{ formatPrice(amount) }}{{ t("common.currency") }}
          </p>
        </div>
        <div>
          <p class="text-kiosk-sm text-gray-500">
            {{ t("cashPayment.received") }}
          </p>
          <p class="text-kiosk-xl font-bold text-primary-600">
            {{ formatPrice(receivedAmount) }}{{ t("common.currency") }}
          </p>
        </div>
        <div>
          <p class="text-kiosk-sm text-gray-500">
            {{ t("payment.change") }}
          </p>
          <p
            class="text-kiosk-xl font-bold"
            :class="changeAmount > 0 ? 'text-green-600' : 'text-gray-400'"
          >
            {{ formatPrice(changeAmount) }}{{ t("common.currency") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Quick Amount Buttons -->
    <div class="bg-white p-4">
      <div class="flex flex-wrap justify-center gap-2">
        <button
          v-for="qa in quickAmounts"
          :key="qa"
          class="rounded-lg bg-gray-100 px-4 py-2 text-kiosk-base font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300"
          @click="addQuickAmount(qa)"
        >
          +{{ formatPrice(qa) }}
        </button>
        <button
          class="rounded-lg bg-primary-100 px-4 py-2 text-kiosk-base font-medium text-primary-700 transition-colors hover:bg-primary-200"
          @click="setExactAmount"
        >
          {{ t("cashPayment.exactAmount") }}
        </button>
        <button
          class="rounded-lg bg-red-100 px-4 py-2 text-kiosk-base font-medium text-red-700 transition-colors hover:bg-red-200"
          @click="resetAmount"
        >
          {{ t("cashPayment.reset") }}
        </button>
      </div>
    </div>

    <!-- Number Pad -->
    <div class="flex-1 bg-white p-4">
      <div class="mx-auto grid max-w-sm grid-cols-3 gap-3">
        <button
          v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="num"
          class="flex h-16 items-center justify-center rounded-xl bg-gray-100 text-kiosk-xl font-bold text-gray-800 transition-colors hover:bg-gray-200 active:bg-gray-300"
          @click="appendNumber(num)"
        >
          {{ num }}
        </button>
        <button
          class="flex h-16 items-center justify-center rounded-xl bg-gray-100 text-kiosk-xl font-bold text-gray-800 transition-colors hover:bg-gray-200 active:bg-gray-300"
          @click="appendNumber('00')"
        >
          00
        </button>
        <button
          class="flex h-16 items-center justify-center rounded-xl bg-gray-100 text-kiosk-xl font-bold text-gray-800 transition-colors hover:bg-gray-200 active:bg-gray-300"
          @click="appendNumber('0')"
        >
          0
        </button>
        <button
          class="flex h-16 items-center justify-center rounded-xl bg-gray-200 text-kiosk-xl font-bold text-gray-800 transition-colors hover:bg-gray-300 active:bg-gray-400"
          @click="deleteLastDigit"
        >
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Cash Receipt Option -->
    <div class="bg-white p-4">
      <label class="flex items-center gap-3">
        <input
          v-model="showCashReceipt"
          type="checkbox"
          class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span class="text-kiosk-base text-gray-700">{{ t("cashPayment.cashReceipt") }}</span>
      </label>

      <div v-if="showCashReceipt" class="mt-3">
        <input
          v-model="cashReceiptPhone"
          type="tel"
          :placeholder="t('cashPayment.phonePlaceholder')"
          class="w-full rounded-lg border border-gray-300 px-4 py-3 text-kiosk-base focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-4 bg-white p-6 shadow-lg">
      <button class="btn-kiosk-secondary flex-1 py-4" @click="cancel">
        {{ t("common.cancel") }}
      </button>
      <button
        class="btn-kiosk-primary flex-1 py-4 text-kiosk-lg"
        :disabled="!canComplete"
        @click="complete"
      >
        <span v-if="canComplete">
          {{ t("payment.change") }}: {{ formatPrice(changeAmount) }}{{ t("common.currency") }}
        </span>
        <span v-else>{{ t("payment.enterCash") }}</span>
      </button>
    </div>
  </div>
</template>
