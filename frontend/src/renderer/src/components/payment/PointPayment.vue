<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settings";
import { formatNumber as formatPrice } from "@/utils/format";
import { showErrorToast } from "@/utils/AlertUtils";

const props = defineProps<{
  orderId: string;
  totalAmount: number;
  memberId: number;
}>();

const emit = defineEmits<{
  success: [];
  cancel: [];
  splitRequired: [info: { pointUsed: number; remaining: number }];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

const memberPoints = ref(0);
const memberName = ref("");
const loading = ref(true);
const processing = ref(false);
const errorMsg = ref("");

// 설정 (computed로 반응성 유지)
const minBalance = computed(() => parseInt(settingsStore.get("point.pointUseMinBalance", "1000")));
const maxRate = computed(() => parseInt(settingsStore.get("point.pointUseMaxRate", "100")));
const splitEnabled = computed(() => settingsStore.get("point.pointUseSplitEnabled", "1") === "1");

// 최대 사용 가능 포인트 (비율 제한 적용)
const maxUsablePoints = computed(() => {
  const byRate = Math.floor(props.totalAmount * (maxRate.value / 100));
  return Math.min(memberPoints.value, byRate);
});

// 결제 시나리오 판단
type PaymentScenario = "FULL_POINT" | "SPLIT" | "INSUFFICIENT" | "INSUFFICIENT_NO_SPLIT";
const paymentScenario = computed<PaymentScenario>(() => {
  if (memberPoints.value < minBalance.value) return "INSUFFICIENT";
  if (maxUsablePoints.value >= props.totalAmount) return "FULL_POINT";
  if (splitEnabled.value) return "SPLIT";
  return "INSUFFICIENT_NO_SPLIT";
});

const pointToUse = computed(() =>
  paymentScenario.value === "FULL_POINT" ? props.totalAmount : maxUsablePoints.value,
);
const remainingAmount = computed(() => props.totalAmount - pointToUse.value);

// 회원 포인트 조회
onMounted(async () => {
  try {
    const { apiClient } = await import("@/services/api/client");
    const res = await apiClient.get<{ success: boolean; data: { points: number; name: string } }>(
      `/api/v1/members/${props.memberId}`,
    );
    if (res.data.success) {
      memberPoints.value = res.data.data.points;
      memberName.value = res.data.data.name;
    }
  } catch {
    errorMsg.value = t("payment.point.loadError");
  } finally {
    loading.value = false;
  }
});

// 전액 포인트 결제
async function payFullPoint() {
  processing.value = true;
  errorMsg.value = "";
  try {
    const { apiClient } = await import("@/services/api/client");
    // 1단계: 포인트 차감
    await apiClient.post(`/api/v1/orders/${props.orderId}/use-points`, {
      pointAmount: pointToUse.value,
      memberId: props.memberId,
    });
    // 2단계: PAID 전환
    await apiClient.patch(`/api/v1/orders/${props.orderId}/status`, {
      status: "PAID",
      paymentType: "POINT",
    });
    emit("success");
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("payment.point.payError");
    errorMsg.value = msg;
    showErrorToast(msg);
    // 1단계 성공 후 2단계 실패 시 타임아웃 보호에 의해 자동 환수
  } finally {
    processing.value = false;
  }
}

// 분할 결제 - 포인트 차감 후 잔액 결제 전환
async function paySplit() {
  processing.value = true;
  errorMsg.value = "";
  try {
    const { apiClient } = await import("@/services/api/client");
    await apiClient.post(`/api/v1/orders/${props.orderId}/use-points`, {
      pointAmount: pointToUse.value,
      memberId: props.memberId,
    });
    emit("splitRequired", {
      pointUsed: pointToUse.value,
      remaining: remainingAmount.value,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("payment.point.splitError");
    errorMsg.value = msg;
    showErrorToast(msg);
  } finally {
    processing.value = false;
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center p-8">
    <!-- 로딩 -->
    <div
      v-if="loading"
      class="text-center"
    >
      <div
        class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
        style="border-color: var(--theme-primary, #ef4444); border-top-color: transparent"
      />
      <p
        class="text-lg font-semibold"
        style="color: var(--theme-text, #1e293b)"
      >
        {{ t("payment.point.loading") }}
      </p>
    </div>

    <!-- 메인 컨텐츠 -->
    <div
      v-else
      class="w-full max-w-lg"
    >
      <!-- 회원 정보 카드 -->
      <div
        class="mb-6 rounded-2xl p-6 text-center"
        style="background: var(--theme-bg-secondary, #f8fafc)"
      >
        <p
          class="mb-1 text-sm font-semibold"
          style="color: var(--theme-text-secondary, #64748b)"
        >
          {{ memberName }} {{ t("payment.point.memberSuffix") }}
        </p>
        <p
          class="text-4xl font-extrabold"
          style="color: var(--theme-primary, #ef4444)"
        >
          {{ formatPrice(memberPoints) }}P
        </p>
        <p
          class="mt-1 text-sm"
          style="color: var(--theme-text-muted, #94a3b8)"
        >
          {{ t("payment.point.currentBalance") }}
        </p>
      </div>

      <!-- 결제 금액 -->
      <div
        class="mb-6 rounded-2xl p-5"
        style="background: color-mix(in srgb, var(--theme-primary, #ef4444) 6%, transparent)"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-sm font-bold"
            style="color: var(--theme-text-secondary, #64748b)"
          >{{ t("payment.point.orderAmount") }}</span>
          <span
            class="text-xl font-extrabold"
            style="color: var(--theme-text, #1e293b)"
          >{{ formatPrice(totalAmount) }}{{ t("common.won") }}</span>
        </div>

        <template v-if="paymentScenario === 'SPLIT' || paymentScenario === 'FULL_POINT'">
          <div class="mt-3 flex items-center justify-between">
            <span
              class="text-sm font-bold"
              style="color: var(--theme-text-secondary, #64748b)"
            >{{ t("payment.point.pointDeduct") }}</span>
            <span
              class="text-lg font-extrabold"
              style="color: var(--theme-primary, #ef4444)"
            >-{{ formatPrice(pointToUse) }}P</span>
          </div>
          <div
            v-if="remainingAmount > 0"
            class="mt-2 flex items-center justify-between border-t pt-3"
            style="border-color: color-mix(in srgb, var(--theme-primary, #ef4444) 20%, transparent)"
          >
            <span
              class="text-sm font-bold"
              style="color: var(--theme-text, #1e293b)"
            >{{ t("payment.point.remainingAmount") }}</span>
            <span
              class="text-xl font-extrabold"
              style="color: var(--theme-text, #1e293b)"
            >{{ formatPrice(remainingAmount) }}{{ t("common.won") }}</span>
          </div>
        </template>
      </div>

      <!-- 에러 메시지 -->
      <div
        v-if="errorMsg"
        class="mb-4 rounded-xl px-4 py-3 text-sm"
        style="background: color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent); color: var(--theme-error, #ef4444)"
      >
        {{ errorMsg }}
      </div>

      <!-- Case 1: 전액 포인트 결제 -->
      <div
        v-if="paymentScenario === 'FULL_POINT'"
        class="flex flex-col gap-3"
      >
        <button
          class="h-16 w-full rounded-2xl text-xl font-extrabold transition-all active:scale-[0.98] disabled:opacity-50"
          style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
          :disabled="processing"
          @click="payFullPoint"
        >
          <span v-if="processing">{{ t("payment.processing") }}...</span>
          <span v-else>{{ t("payment.point.payFull") }}</span>
        </button>
        <button
          class="h-12 w-full rounded-2xl text-base font-bold transition-all"
          style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b)"
          @click="emit('cancel')"
        >
          {{ t("payment.point.otherMethod") }}
        </button>
      </div>

      <!-- Case 2: 분할 결제 -->
      <div
        v-else-if="paymentScenario === 'SPLIT'"
        class="flex flex-col gap-3"
      >
        <button
          class="h-16 w-full rounded-2xl text-xl font-extrabold transition-all active:scale-[0.98] disabled:opacity-50"
          style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
          :disabled="processing"
          @click="paySplit"
        >
          <span v-if="processing">{{ t("payment.processing") }}...</span>
          <span v-else>{{ t("payment.point.paySplit", { point: formatPrice(pointToUse), remaining: formatPrice(remainingAmount) }) }}</span>
        </button>
        <button
          class="h-12 w-full rounded-2xl text-base font-bold transition-all"
          style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b)"
          @click="emit('cancel')"
        >
          {{ t("payment.point.otherMethod") }}
        </button>
      </div>

      <!-- Case 3 & 4: 포인트 부족 -->
      <div
        v-else
        class="flex flex-col items-center gap-4"
      >
        <div
          class="rounded-xl px-6 py-4 text-center"
          style="background: color-mix(in srgb, var(--theme-warning, #f59e0b) 10%, transparent)"
        >
          <p
            class="text-base font-bold"
            style="color: var(--theme-warning, #f59e0b)"
          >
            {{ t("payment.point.insufficient") }}
          </p>
          <p
            class="mt-1 text-sm"
            style="color: var(--theme-text-secondary, #64748b)"
          >
            {{ t("payment.point.minRequired", { min: formatPrice(minBalance) }) }}
          </p>
        </div>
        <button
          class="h-14 w-full rounded-2xl text-lg font-bold transition-all"
          style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border: 2px solid var(--theme-primary, #ef4444)"
          @click="emit('cancel')"
        >
          {{ t("payment.point.otherMethod") }}
        </button>
      </div>
    </div>
  </div>
</template>
