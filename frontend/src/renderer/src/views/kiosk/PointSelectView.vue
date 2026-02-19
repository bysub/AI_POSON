<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settings";
import { apiClient } from "@/services/api/client";
import NumberPad from "@/components/kiosk/NumberPad.vue";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const settingsStore = useSettingsStore();

// 이전 화면에서 전달받은 데이터
const orderType = computed(() => (route.query.orderType as string) ?? null);
const tableNo = computed(() => (route.query.tableNo as string) ?? null);

// 화면 단계
type Step = "select" | "phone-input" | "member-register";
const currentStep = ref<Step>("select");

// 회원 정보
const foundMember = ref<{ id: number; name: string; phone: string; points: number } | null>(null);
const phoneInput = ref("");
const memberName = ref("");
const isLoading = ref(false);
const errorMsg = ref("");

// 포인트 설정 확인
const pointEnabled = computed(() => settingsStore.get("point.salePoint", "0") === "1");

// 결제 화면으로 이동 (query params 유지)
function goToPayment(memberId?: number) {
  const query: Record<string, string> = {};
  if (orderType.value) query.orderType = orderType.value;
  if (tableNo.value) query.tableNo = tableNo.value;
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
    }>(`/api/v1/members/lookup?phone=${phone}`);

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
    const tableSelectEnabled = settingsStore.get("sale.tableSelectEnabled", "0") === "1";
    if (tableSelectEnabled) {
      router.push("/order-confirm");
    } else {
      router.push("/menu");
    }
  }
}

// 포인트 비활성이면 바로 결제로
onMounted(() => {
  if (!pointEnabled.value) {
    goToPayment();
  }
});
</script>

<template>
  <div class="flex h-full flex-col bg-gradient-to-b from-red-400 to-red-500">
    <!-- Top bar -->
    <header class="flex items-center justify-between px-4 py-3">
      <span class="text-sm text-white/80">{{ t("point.purchaseInProgress") }}</span>
      <span class="text-sm text-white/80">POSON Kiosk</span>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 flex-col bg-white">
      <!-- Step: 포인트 적립/사용 선택 -->
      <template v-if="currentStep === 'select'">
        <div class="flex flex-1 flex-col items-center justify-center px-8">
          <h1 class="mb-12 text-center text-2xl font-extrabold text-gray-800">
            {{ t("point.askPointUsage") }}
          </h1>

          <div class="flex w-full max-w-sm flex-col gap-4">
            <button
              class="rounded-2xl bg-gray-100 px-6 py-5 text-center transition-colors hover:bg-gray-200"
              @click="skipPoint"
            >
              <span class="block text-xl font-extrabold text-gray-800">{{
                t("point.noEarn")
              }}</span>
              <span class="block text-sm text-gray-500">{{ t("point.directPayment") }}</span>
            </button>

            <button
              class="rounded-2xl bg-red-500 px-6 py-5 text-center transition-colors hover:bg-red-600"
              @click="selectPointEarn"
            >
              <span class="block text-xl font-extrabold text-white">{{
                t("point.earnPoints")
              }}</span>
              <span class="block text-sm text-white/80">{{ t("point.memberPayment") }}</span>
            </button>

            <button
              class="rounded-2xl bg-amber-400 px-6 py-5 text-center transition-colors hover:bg-amber-500"
              @click="selectRegister"
            >
              <span class="block text-xl font-extrabold text-gray-800">{{
                t("point.memberRegister")
              }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Step: 전화번호 입력 (포인트 적립) -->
      <template v-else-if="currentStep === 'phone-input'">
        <div class="flex flex-1 flex-col items-center justify-center px-8">
          <h1 class="mb-2 text-center text-xl font-extrabold text-gray-800">
            {{ t("point.enterPhone") }}
          </h1>
          <h1 class="mb-8 text-center text-xl font-extrabold text-gray-800">
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
            class="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600"
          >
            {{ errorMsg }}
          </p>

          <p class="mt-4 text-center text-sm text-amber-600">
            {{ t("point.newMemberGuide") }}
          </p>
        </div>
      </template>

      <!-- Step: 회원등록 -->
      <template v-else-if="currentStep === 'member-register'">
        <div class="flex flex-1 flex-col items-center px-8 pt-8">
          <h1 class="mb-6 text-center text-2xl font-extrabold text-red-500">
            {{ t("point.registerTitle") }}
          </h1>

          <div class="w-full max-w-sm space-y-4">
            <div>
              <label class="mb-1 block text-sm font-bold text-gray-700">
                {{ t("point.phoneRequired") }}
              </label>
              <input
                v-model="phoneInput"
                type="tel"
                maxlength="11"
                placeholder="01012345678"
                class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-red-400 focus:outline-none"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-bold text-gray-700">
                {{ t("point.nameOptional") }}
              </label>
              <input
                v-model="memberName"
                type="text"
                maxlength="20"
                :placeholder="t('point.namePlaceholder')"
                class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-red-400 focus:outline-none"
              />
            </div>

            <p class="text-sm text-gray-500">
              {{ t("point.registerGuide") }}
            </p>

            <p
              v-if="errorMsg"
              class="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600"
            >
              {{ errorMsg }}
            </p>
          </div>
        </div>
      </template>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/80">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-red-200 border-t-red-500" />
      </div>
    </main>

    <!-- Footer -->
    <footer class="flex gap-4 bg-white px-6 pb-6 pt-2">
      <button
        class="flex-1 rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-600 transition-colors hover:bg-gray-200"
        @click="goBack"
      >
        {{ currentStep === "select" ? t("common.cancel") : t("common.back") }}
      </button>
      <template v-if="currentStep === 'phone-input'">
        <button
          class="flex-1 rounded-xl bg-red-500 py-4 text-base font-bold text-white transition-colors hover:bg-red-600"
          @click="skipPoint"
        >
          {{ t("point.directPayBtn") }}
        </button>
      </template>
      <template v-else-if="currentStep === 'member-register'">
        <button
          class="flex-1 rounded-xl bg-red-500 py-4 text-base font-bold text-white transition-colors hover:bg-red-600"
          :disabled="!phoneInput || phoneInput.length < 10"
          @click="handleRegister"
        >
          {{ t("point.completeBtn") }}
        </button>
      </template>
    </footer>
  </div>
</template>
