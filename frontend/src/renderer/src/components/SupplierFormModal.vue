<script setup lang="ts">
import { ref, watch } from "vue";
import type { Supplier, SupplierType } from "@/types";
import { apiClient } from "@/services/api/client";
import { showWarningToast, showApiError } from "@/utils/AlertUtils";

const props = defineProps<{
  visible: boolean;
  supplier?: Supplier | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [supplier: Supplier];
}>();

const supplierTypes: { value: SupplierType; label: string }[] = [
  { value: "FOOD", label: "식품" },
  { value: "BEVERAGE", label: "음료" },
  { value: "SUPPLIES", label: "용품" },
  { value: "PACKAGING", label: "포장재" },
  { value: "ETC", label: "기타" },
];

const isLoading = ref(false);
const form = ref({
  name: "",
  type: "ETC" as SupplierType,
  businessNumber: "",
  businessType: "",
  businessItem: "",
  representative: "",
  contactName: "",
  contactPhone: "010-",
  contactEmail: "",
  address: "",
  addressDetail: "",
  discountRate: 0,
  paymentTerms: "",
  memo: "",
});

watch(
  () => props.visible,
  (val) => {
    if (!val) return;
    if (props.supplier) {
      form.value = {
        name: props.supplier.name,
        type: props.supplier.type,
        businessNumber: props.supplier.businessNumber ?? "",
        businessType: props.supplier.businessType ?? "",
        businessItem: props.supplier.businessItem ?? "",
        representative: props.supplier.representative ?? "",
        contactName: props.supplier.contactName ?? "",
        contactPhone: props.supplier.contactPhone ?? "",
        contactEmail: props.supplier.contactEmail ?? "",
        address: props.supplier.address ?? "",
        addressDetail: props.supplier.addressDetail ?? "",
        discountRate: Number(props.supplier.discountRate) || 0,
        paymentTerms: props.supplier.paymentTerms ?? "",
        memo: props.supplier.memo ?? "",
      };
    } else {
      form.value = {
        name: "",
        type: "ETC",
        businessNumber: "",
        businessType: "",
        businessItem: "",
        representative: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        address: "",
        addressDetail: "",
        discountRate: 0,
        paymentTerms: "",
        memo: "",
      };
    }
  },
);

async function save(): Promise<void> {
  if (!form.value.name) {
    showWarningToast("거래처명은 필수입니다");
    return;
  }

  isLoading.value = true;
  try {
    let saved: Supplier;
    if (props.supplier) {
      const res = await apiClient.patch<{ success: boolean; data: Supplier }>(
        `/api/v1/suppliers/${props.supplier.id}`,
        form.value,
      );
      saved = res.data.data;
    } else {
      const res = await apiClient.post<{ success: boolean; data: Supplier }>(
        "/api/v1/suppliers",
        form.value,
      );
      saved = res.data.data;
    }
    emit("saved", saved);
    emit("close");
  } catch (err) {
    showApiError(err, "저장에 실패했습니다");
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        >
          <div class="mb-6 flex items-center justify-between">
            <h3 class="text-lg font-bold text-slate-800">
              {{ supplier ? "거래처 수정" : "거래처 추가" }}
            </h3>
            <button
              class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <!-- 기본 정보 -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="mb-3 text-sm font-semibold text-slate-700">기본 정보</h4>
              <div v-if="supplier" class="mb-3 flex items-center gap-2">
                <span class="text-sm font-medium text-slate-500">거래처 코드:</span>
                <span
                  class="rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-semibold text-indigo-700"
                  >{{ supplier.code }}</span
                >
              </div>
              <div v-else class="mb-3">
                <p class="text-xs text-slate-400">거래처 코드는 저장 시 자동으로 생성됩니다.</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">거래처명 *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="거래처명"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">거래처 구분</label>
                  <select
                    v-model="form.type"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option v-for="t in supplierTypes" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 사업자 정보 -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="mb-3 text-sm font-semibold text-slate-700">사업자 정보</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">사업자번호</label>
                  <input
                    v-model="form.businessNumber"
                    type="text"
                    maxlength="20"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="000-00-00000"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">대표자</label>
                  <input
                    v-model="form.representative"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="대표자명"
                  />
                </div>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">업태</label>
                  <input
                    v-model="form.businessType"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="예: 제조업, 도소매업, 서비스업"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">종목</label>
                  <input
                    v-model="form.businessItem"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="예: 식품, 커피원두, 포장재"
                  />
                </div>
              </div>
              <div class="mt-4">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">주소</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="사업장 주소"
                />
              </div>
              <div class="mt-4">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">상세주소</label>
                <input
                  v-model="form.addressDetail"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="동/호수, 층 등 상세주소"
                />
              </div>
            </div>

            <!-- 담당자 정보 -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="mb-3 text-sm font-semibold text-slate-700">담당자 정보</h4>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">담당자명</label>
                  <input
                    v-model="form.contactName"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="담당자명"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">연락처</label>
                  <input
                    v-model="form.contactPhone"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
                  <input
                    v-model="form.contactEmail"
                    type="email"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            <!-- 거래 조건 -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="mb-3 text-sm font-semibold text-slate-700">거래 조건</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">할인율 (%)</label>
                  <input
                    v-model.number="form.discountRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">결제 조건</label>
                  <input
                    v-model="form.paymentTerms"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="예: 월말 정산, 즉시 결제"
                  />
                </div>
              </div>
            </div>

            <!-- 메모 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
              <textarea
                v-model="form.memo"
                rows="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="거래처 관련 메모"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
              @click="emit('close')"
            >
              취소
            </button>
            <button
              class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
              :disabled="isLoading"
              @click="save"
            >
              {{ isLoading ? "저장 중..." : "저장" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
