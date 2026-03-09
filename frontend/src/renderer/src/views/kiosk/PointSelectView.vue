<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settings";
import { useVoiceEventStore } from "@/stores/voiceEvent";
import { useTTS } from "@/composables/useTTS";
import { apiClient } from "@/services/api/client";
import NumberPad from "@/components/kiosk/NumberPad.vue";

const router = useRouter();
const { t } = useI18n();
const settingsStore = useSettingsStore();
const voiceEventStore = useVoiceEventStore();
const tts = useTTS();

// 화면 단계
type Step = "select" | "phone-input" | "member-register";
const currentStep = ref<Step>("select");

// 회원 정보
const foundMember = ref<{ id: number; name: string; phone: string; points: number } | null>(null);
const phoneInput = ref("010");
const memberName = ref("");
const isLoading = ref(false);
const errorMsg = ref("");

// 포인트 설정 확인
const pointEnabled = computed(() => settingsStore.get("point.salePoint", "0") === "1");

// 결제 화면으로 이동
function goToPayment(memberId?: number) {
  const query: Record<string, string> = {};
  if (memberId) query.memberId = String(memberId);
  router.push({ path: "/payment", query });
}

// 미적립 (바로 결제)
function skipPoint() {
  goToPayment();
}

// 포인트 적립 → 전화번호 입력
function selectPointEarn() {
  currentStep.value = "phone-input";
  phoneInput.value = "";
  errorMsg.value = "";
}

// 회원등록
function selectRegister() {
  currentStep.value = "member-register";
  phoneInput.value = "010-";
  memberName.value = "";
  errorMsg.value = "";
}

// 전화번호로 회원 조회
async function handlePhoneLookup(phone: string) {
  phoneInput.value = phone;
  isLoading.value = true;
  errorMsg.value = "";

  try {
    const res = await apiClient.get<{
      success: boolean;
      data: { id: number; name: string; phone: string; points: number } | null;
    }>("/api/v1/members/lookup", { params: { phone } });

    if (res.data.success && res.data.data) {
      foundMember.value = res.data.data;
      goToPayment(res.data.data.id);
    } else {
      errorMsg.value = t("point.notRegistered");
    }
  } catch {
    errorMsg.value = t("point.lookupFailed");
  } finally {
    isLoading.value = false;
  }
}

// 회원 간편등록
async function handleRegister() {
  if (!phoneInput.value || phoneInput.value.length < 10) {
    errorMsg.value = t("point.enterPhoneFirst");
    return;
  }

  isLoading.value = true;
  errorMsg.value = "";

  try {
    const res = await apiClient.post<{
      success: boolean;
      data: { id: number; name: string; phone: string; points: number };
    }>("/api/v1/members/register", {
      phone: phoneInput.value,
      name: memberName.value || t("point.defaultMemberName"),
    });

    if (res.data.success) {
      foundMember.value = res.data.data;
      goToPayment(res.data.data.id);
    } else {
      errorMsg.value = t("point.registerFailed");
    }
  } catch {
    errorMsg.value = t("point.registerFailed");
  } finally {
    isLoading.value = false;
  }
}

// 뒤로가기
function goBack() {
  if (currentStep.value !== "select") {
    currentStep.value = "select";
    errorMsg.value = "";
  } else {
    router.push("/order-confirm");
  }
}

// 음성 포인트 적립/미적립: Pinia store 구독
watch(
  () => voiceEventStore.pointAction,
  (event) => {
    if (!event) return;
    if (event.action === "earn") {
      selectPointEarn();
    } else if (event.action === "skip") {
      skipPoint();
    }
  },
);

// 포인트 비활성이면 바로 결제로
onMounted(() => {
  if (!pointEnabled.value) {
    goToPayment();
  } else {
    tts.speak(t("a11y.tts.pointAsk"));
  }
});

onUnmounted(() => {
  voiceEventStore.$reset();
});
</script>

<template>
  <div
    class="flex h-full flex-col"
    style="background: linear-gradient(to bottom, var(--theme-primary, #f87171), var(--theme-primary-hover, #ef4444))"
  >
    <!-- Top bar -->
    <header class="flex items-center justify-between px-6 pb-2 pt-6">
      <span
        class="text-sm"
        style="color: var(--theme-primary-text, #fff); opacity: 0.8"
      >{{ t("point.purchaseInProgress") }}</span>
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
      <!-- Step: 포인트 적립/사용 선택 -->
      <template v-if="currentStep === 'select'">
        <div class="flex flex-1 flex-col items-center justify-center px-8">
          <h1
            class="mb-12 text-center text-2xl font-extrabold"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("point.askPointUsage") }}
          </h1>

          <div class="flex w-full max-w-sm flex-col gap-4">
            <button
              class="rounded-2xl px-6 py-5 text-center transition-colors area-point-no-earn"
              style="background: var(--theme-bg-secondary, #f3f4f6)"
              @click="skipPoint"
            >
              <span
                class="block text-xl font-extrabold"
                style="color: var(--theme-text, #1e293b)"
              >{{
                t("point.noEarn")
              }}</span>
              <span
                class="block text-sm"
                style="color: var(--theme-text-muted, #94a3b8)"
              >{{ t("point.directPayment") }}</span>
            </button>

            <button
              class="rounded-2xl px-6 py-5 text-center transition-colors"
              style="background: var(--theme-primary, #ef4444)"
              @click="selectPointEarn"
            >
              <span
                class="block text-xl font-extrabold"
                style="color: var(--theme-primary-text, #fff)"
              >{{
                t("point.earnPoints")
              }}</span>
              <span
                class="block text-sm"
                style="color: var(--theme-primary-text, #fff); opacity: 0.8"
              >{{ t("point.memberPayment") }}</span>
            </button>

            <button
              class="rounded-2xl px-6 py-5 text-center transition-colors"
              style="background: var(--theme-accent, #f59e0b)"
              @click="selectRegister"
            >
              <span
                class="block text-xl font-extrabold"
                style="color: var(--theme-primary-text, #fff)"
              >{{
                t("point.memberRegister")
              }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Step: 전화번호 입력 (포인트 적립) -->
      <template v-else-if="currentStep === 'phone-input'">
        <div class="flex flex-1 flex-col items-center justify-center px-8">
          <h1
            class="mb-2 text-center text-xl font-extrabold"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("point.enterPhone") }}
          </h1>
          <h1
            class="mb-8 text-center text-xl font-extrabold"
            style="color: var(--theme-text, #1e293b)"
          >
            {{ t("point.pressConfirm") }}
          </h1>

          <NumberPad
            v-model="phoneInput"
            :max-length="11"
            placeholder="010-0000-0000"
            format="phone"
            @confirm="handlePhoneLookup"
          />

          <p
            v-if="errorMsg"
            class="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
            style="background: color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent); color: var(--theme-error, #ef4444)"
          >
            {{ errorMsg }}
          </p>

          <p
            class="mt-4 text-center text-sm"
            style="color: var(--theme-accent, #f59e0b)"
          >
            {{ t("point.newMemberGuide") }}
          </p>
        </div>
      </template>

      <!-- Step: 회원등록 -->
      <template v-else-if="currentStep === 'member-register'">
        <div class="flex flex-1 flex-col items-center px-8 pt-8">
          <h1
            class="mb-6 text-center text-2xl font-extrabold"
            style="color: var(--theme-primary, #ef4444)"
          >
            {{ t("point.registerTitle") }}
          </h1>

          <div class="w-full max-w-sm space-y-4">
            <div>
              <label
                class="mb-1 block text-sm font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                {{ t("point.phoneRequired") }}
              </label>
              <input
                v-model="phoneInput"
                type="tel"
                maxlength="11"
                placeholder="01012345678"
                class="w-full rounded-xl border-2 px-4 py-3 text-lg focus:outline-none"
                style="border-color: var(--theme-border, #e2e8f0); color: var(--theme-text, #1e293b)"
              >
            </div>

            <div>
              <label
                class="mb-1 block text-sm font-bold"
                style="color: var(--theme-text-secondary, #64748b)"
              >
                {{ t("point.nameOptional") }}
              </label>
              <input
                v-model="memberName"
                type="text"
                maxlength="20"
                :placeholder="t('point.namePlaceholder')"
                class="w-full rounded-xl border-2 px-4 py-3 text-lg focus:outline-none"
                style="border-color: var(--theme-border, #e2e8f0); color: var(--theme-text, #1e293b)"
              >
            </div>

            <p
              class="text-sm"
              style="color: var(--theme-text-muted, #94a3b8)"
            >
              {{ t("point.registerGuide") }}
            </p>

            <p
              v-if="errorMsg"
              class="rounded-lg px-4 py-2 text-sm font-medium"
              style="background: color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent); color: var(--theme-error, #ef4444)"
            >
              {{ errorMsg }}
            </p>
          </div>
        </div>
      </template>

      <!-- Loading overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center"
        style="background: color-mix(in srgb, var(--theme-surface, #fff) 80%, transparent)"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4"
          style="border-color: color-mix(in srgb, var(--theme-primary, #ef4444) 30%, transparent); border-top-color: var(--theme-primary, #ef4444)"
        />
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="flex gap-4 px-6 pb-10 pt-2"
    >
      <button
        class="flex-1 rounded-xl border-2 py-4 text-base font-bold transition-colors"
        style="background: var(--theme-bg-secondary, #f3f4f6); color: var(--theme-text-secondary, #64748b); border-color: var(--theme-primary, #ef4444)"
        @click="goBack"
      >
        {{ t("orderConfirm.goBack") }}
      </button>
      <template v-if="currentStep === 'phone-input'">
        <button
          class="flex-1 rounded-xl py-4 text-base font-bold transition-colors"
          style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
          @click="skipPoint"
        >
          {{ t("point.directPayBtn") }}
        </button>
      </template>
      <template v-else-if="currentStep === 'member-register'">
        <button
          class="flex-1 rounded-xl py-4 text-base font-bold transition-colors disabled:opacity-40"
          style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
          :disabled="!phoneInput || phoneInput.length < 10"
          @click="handleRegister"
        >
          {{ t("point.completeBtn") }}
        </button>
      </template>
    </footer>
    </div>
  </div>
</template>
<style>
.area-point-no-earn{
  border: 2px solid var(--theme-primary, #fff);
}
</style>