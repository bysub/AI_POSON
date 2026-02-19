<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { PurchaseProduct, TaxType } from "@/types";
import { apiClient } from "@/services/api/client";
import { showApiError } from "@/utils/AlertUtils";
import BranchSelectModal from "@/components/BranchSelectModal.vue";

const props = defineProps<{
  visible: boolean;
  product?: PurchaseProduct | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [product: PurchaseProduct];
}>();

const productTypeOptions = [
  { value: "", label: "선택" },
  { value: "GENERAL", label: "공산품" },
  { value: "WEIGHT", label: "저울상품" },
  { value: "ETC", label: "기타" },
];

const isSaving = ref(false);
const barcodePrefix = ref("");
const isLoadingBarcode = ref(false);
const showBranchModal = ref(false);
const formErrors = ref<Record<string, string>>({});

const form = ref({
  barcode: "",
  name: "",
  spec: "",
  productType: "",
  sellPrice: 0,
  costPrice: 0,
  purchaseCost: 0,
  vatAmount: 0,
  taxType: "" as TaxType | "",
  lCode: "",
  mCode: "",
  sCode: "",
  branchLabel: "",
  safeStock: 0,
  isActive: true,
  usePurchase: true,
  useOrder: true,
  useSales: true,
  useInventory: true,
});

const isEditing = computed(() => !!props.product);
const isGeneral = computed(() => form.value.productType === "GENERAL");

const estimatedMargin = computed(() => {
  const sell = form.value.sellPrice;
  const cost = form.value.purchaseCost + form.value.vatAmount;
  if (sell <= 0) return { amount: 0, rate: "0.0" };
  return {
    amount: sell - cost,
    rate: (((sell - cost) / sell) * 100).toFixed(1),
  };
});

// 매입원가 + 부가세 = 매입가 자동계산
watch(
  () => [form.value.purchaseCost, form.value.vatAmount],
  ([pc, va]) => {
    form.value.costPrice = (Number(pc) || 0) + (Number(va) || 0);
  },
);

// 상품구분 변경 시 공산품이 아니면 매입원가/부가세 초기화 + 바코드 재생성
watch(
  () => form.value.productType,
  async (newType, oldType) => {
    if (newType !== "GENERAL") {
      form.value.purchaseCost = 0;
      form.value.vatAmount = 0;
    }
    if (!isEditing.value && oldType !== undefined) {
      form.value.barcode = await fetchNextBarcode(newType || undefined);
    }
  },
);

// 분류 명칭 조회
type BranchNames = { lName: string | null; mName: string | null; sName: string | null };

async function resolveBranchLabel(
  lCode: string,
  mCode?: string | null,
  sCode?: string | null,
): Promise<string> {
  if (!lCode) return "";
  try {
    const res = await apiClient.post<{
      success: boolean;
      data: (BranchNames & { lCode: string; mCode: string | null; sCode: string | null })[];
    }>("/api/v1/branches/resolve", [{ lCode, mCode, sCode }]);
    if (res.data.success && res.data.data.length > 0) {
      const b = res.data.data[0];
      const parts: string[] = [];
      if (b.lName) parts.push(`${b.lName}(${lCode})`);
      else parts.push(lCode);
      if (mCode) {
        if (b.mName) parts.push(`${b.mName}(${mCode})`);
        else parts.push(mCode);
      }
      if (sCode) {
        if (b.sName) parts.push(`${b.sName}(${sCode})`);
        else parts.push(sCode);
      }
      return parts.join("-");
    }
  } catch {
    // ignore
  }
  return lCode;
}

async function fetchNextBarcode(productType?: string): Promise<string> {
  try {
    isLoadingBarcode.value = true;
    const params: Record<string, string> = {};
    if (productType) params.productType = productType;
    const res = await apiClient.get<{
      success: boolean;
      data: { barcode: string; prefix: string };
    }>("/api/v1/purchase-products/next-barcode", { params });
    if (res.data.success) {
      barcodePrefix.value = res.data.data.prefix;
      return res.data.data.barcode;
    }
  } catch (err) {
    console.error("Failed to fetch next barcode:", err);
  } finally {
    isLoadingBarcode.value = false;
  }
  return "";
}

watch(
  () => props.visible,
  async (val) => {
    if (!val) return;
    formErrors.value = {};
    if (props.product) {
      const label = await resolveBranchLabel(
        props.product.lCode ?? "",
        props.product.mCode,
        props.product.sCode,
      );
      form.value = {
        barcode: props.product.barcode,
        name: props.product.name,
        spec: props.product.spec ?? "",
        productType: props.product.productType ?? "",
        sellPrice: Number(props.product.sellPrice),
        costPrice: Number(props.product.costPrice),
        purchaseCost: Number(props.product.purchaseCost ?? 0),
        vatAmount: Number(props.product.vatAmount ?? 0),
        taxType: props.product.taxType,
        lCode: props.product.lCode ?? "",
        mCode: props.product.mCode ?? "",
        sCode: props.product.sCode ?? "",
        branchLabel: label,
        safeStock: Number(props.product.safeStock ?? 0),
        isActive: props.product.isActive ?? true,
        usePurchase: props.product.usePurchase ?? true,
        useOrder: props.product.useOrder ?? true,
        useSales: props.product.useSales ?? true,
        useInventory: props.product.useInventory ?? true,
      };
    } else {
      form.value = {
        barcode: "",
        name: "",
        spec: "",
        productType: "",
        sellPrice: 0,
        costPrice: 0,
        purchaseCost: 0,
        vatAmount: 0,
        taxType: "",
        lCode: "",
        mCode: "",
        sCode: "",
        branchLabel: "",
        safeStock: 0,
        isActive: true,
        usePurchase: true,
        useOrder: true,
        useSales: true,
        useInventory: true,
      };
      form.value.barcode = await fetchNextBarcode();
    }
  },
);

function onBranchSelect(val: { lCode: string; mCode: string; sCode: string; label: string }): void {
  form.value.lCode = val.lCode;
  form.value.mCode = val.mCode;
  form.value.sCode = val.sCode;
  form.value.branchLabel = val.label;
  showBranchModal.value = false;
}

function clearBranch(): void {
  form.value.lCode = "";
  form.value.mCode = "";
  form.value.sCode = "";
  form.value.branchLabel = "";
}

function validateForm(): boolean {
  const errors: Record<string, string> = {};
  if (!form.value.barcode.trim()) errors.barcode = "바코드는 필수입니다";
  if (!form.value.name.trim()) errors.name = "상품명은 필수입니다";
  if (!form.value.productType) errors.productType = "상품구분을 선택해주세요";
  if (!form.value.lCode) errors.branch = "분류코드를 선택해주세요";
  if (!form.value.taxType) errors.taxType = "과세유형을 선택해주세요";
  const hasUsage =
    form.value.isActive ||
    form.value.usePurchase ||
    form.value.useOrder ||
    form.value.useSales ||
    form.value.useInventory;
  if (!hasUsage) errors.usage = "사용 설정을 최소 1개 이상 선택해주세요";
  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

async function save(): Promise<void> {
  if (!validateForm()) return;
  isSaving.value = true;
  try {
    const payload = {
      barcode: form.value.barcode,
      name: form.value.name,
      spec: form.value.spec || null,
      productType: form.value.productType,
      sellPrice: form.value.sellPrice,
      costPrice: form.value.costPrice,
      purchaseCost: form.value.purchaseCost,
      vatAmount: form.value.vatAmount,
      taxType: form.value.taxType,
      lCode: form.value.lCode,
      mCode: form.value.mCode || null,
      sCode: form.value.sCode || null,
      safeStock: form.value.safeStock,
      isActive: form.value.isActive,
      usePurchase: form.value.usePurchase,
      useOrder: form.value.useOrder,
      useSales: form.value.useSales,
      useInventory: form.value.useInventory,
    };
    let saved: PurchaseProduct;
    if (props.product) {
      const res = await apiClient.patch<{ success: boolean; data: PurchaseProduct }>(
        `/api/v1/purchase-products/${props.product.id}`,
        payload,
      );
      saved = res.data.data;
    } else {
      const res = await apiClient.post<{ success: boolean; data: PurchaseProduct }>(
        "/api/v1/purchase-products",
        payload,
      );
      saved = res.data.data;
    }
    emit("saved", saved);
    emit("close");
  } catch (err) {
    showApiError(err, "상품 저장에 실패했습니다");
  } finally {
    isSaving.value = false;
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
        <div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <header class="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 class="text-lg font-bold text-slate-800">
              {{ isEditing ? "상품 수정" : "매입상품 등록" }}
            </h3>
          </header>
          <div class="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            <!-- 바코드 / 상품구분 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">바코드 *</label>
                <div class="flex gap-2">
                  <input
                    v-model="form.barcode"
                    type="text"
                    placeholder="상품 바코드"
                    :disabled="isEditing"
                    :class="
                      formErrors.barcode ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                    "
                    class="flex-1 rounded-xl border px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                    @input="formErrors.barcode = ''"
                  />
                  <button
                    v-if="!isEditing"
                    type="button"
                    class="whitespace-nowrap rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                    :disabled="isLoadingBarcode"
                    @click="
                      form.barcode = '';
                      fetchNextBarcode(form.productType || undefined).then(
                        (v) => (form.barcode = v),
                      );
                    "
                  >
                    {{ isLoadingBarcode ? "..." : "자동생성" }}
                  </button>
                </div>
                <p v-if="barcodePrefix && !isEditing" class="mt-1 text-xs text-slate-400">
                  {{ form.productType === "WEIGHT" ? "중량상품" : "일반" }} 프리픽스:
                  {{ barcodePrefix }} (환경설정 > 바코드/중량)
                </p>
                <p v-if="formErrors.barcode" class="mt-1 text-xs text-red-500">
                  {{ formErrors.barcode }}
                </p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">상품구분 *</label>
                <select
                  v-model="form.productType"
                  :disabled="isEditing"
                  :class="
                    formErrors.productType
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-200'
                  "
                  class="w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                  @change="formErrors.productType = ''"
                >
                  <option v-for="opt in productTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="formErrors.productType" class="mt-1 text-xs text-red-500">
                  {{ formErrors.productType }}
                </p>
              </div>
            </div>
            <!-- 상품명 / 규격 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">상품명 *</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="상품명 입력"
                  :class="
                    formErrors.name ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                  "
                  class="w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  @input="formErrors.name = ''"
                />
                <p v-if="formErrors.name" class="mt-1 text-xs text-red-500">
                  {{ formErrors.name }}
                </p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">규격</label>
                <input
                  v-model="form.spec"
                  type="text"
                  placeholder="ex) 500ml, 1kg, 10개입"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <!-- 분류코드 선택 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">분류코드 *</label>
              <div class="flex items-center gap-2">
                <input
                  :value="form.branchLabel"
                  type="text"
                  readonly
                  placeholder="분류를 선택해주세요"
                  :class="
                    formErrors.branch ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                  "
                  class="flex-1 cursor-pointer rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                  @click="
                    showBranchModal = true;
                    formErrors.branch = '';
                  "
                />
                <button
                  type="button"
                  class="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                  @click="showBranchModal = true"
                >
                  분류선택
                </button>
                <button
                  v-if="form.lCode"
                  type="button"
                  class="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200"
                  @click="clearBranch"
                >
                  초기화
                </button>
              </div>
              <p v-if="formErrors.branch" class="mt-1 text-xs text-red-500">
                {{ formErrors.branch }}
              </p>
            </div>
            <!-- 과세유형 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">과세유형 *</label>
              <select
                v-model="form.taxType"
                :class="
                  formErrors.taxType ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                "
                class="w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                @change="formErrors.taxType = ''"
              >
                <option value="">선택</option>
                <option value="TAXABLE">과세</option>
                <option value="TAX_FREE">면세</option>
              </select>
              <p v-if="formErrors.taxType" class="mt-1 text-xs text-red-500">
                {{ formErrors.taxType }}
              </p>
            </div>
            <!-- 매입원가 / 부가세 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">매입원가 (원)</label>
                <input
                  v-model.number="form.purchaseCost"
                  type="number"
                  min="0"
                  :disabled="!isGeneral"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">부가세 (원)</label>
                <input
                  v-model.number="form.vatAmount"
                  type="number"
                  min="0"
                  :disabled="!isGeneral"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
            <!-- 매입가(자동계산) / 판매가 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">
                  매입가 (원)
                  <span class="text-xs text-slate-400">= 매입원가 + 부가세</span>
                </label>
                <input
                  :value="form.costPrice"
                  type="number"
                  min="0"
                  disabled
                  class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">판매가 (원) *</label>
                <input
                  v-model.number="form.sellPrice"
                  type="number"
                  min="0"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <!-- 예상마진 미리보기 -->
            <div v-if="form.sellPrice > 0" class="rounded-xl bg-slate-50 px-4 py-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">예상 마진 (판매가 - 매입원가 - 부가세)</span>
                <span
                  class="font-semibold"
                  :class="estimatedMargin.amount > 0 ? 'text-green-600' : 'text-red-500'"
                >
                  {{ formatPrice(estimatedMargin.amount) }}원 ({{ estimatedMargin.rate }}%)
                </span>
              </div>
            </div>
            <!-- 적정재고 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">적정재고</label>
                <input
                  v-model.number="form.safeStock"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p class="mt-1 text-xs text-slate-400">
                  재고가 적정재고 이하로 떨어지면 부족 경고가 표시됩니다
                </p>
              </div>
            </div>
            <!-- 사용여부 체크박스 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">사용 설정 *</label>
              <div
                :class="
                  formErrors.usage ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                "
                class="flex flex-wrap gap-4 rounded-xl border bg-slate-50 px-4 py-3"
                @click="formErrors.usage = ''"
              >
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input
                    v-model="form.isActive"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span class="text-sm text-slate-700">사용</span>
                </label>
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input
                    v-model="form.usePurchase"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-slate-700">매입</span>
                </label>
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input
                    v-model="form.useOrder"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span class="text-sm text-slate-700">발주</span>
                </label>
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input
                    v-model="form.useSales"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span class="text-sm text-slate-700">판매</span>
                </label>
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input
                    v-model="form.useInventory"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span class="text-sm text-slate-700">재고</span>
                </label>
              </div>
              <p v-if="formErrors.usage" class="mt-1 text-xs text-red-500">
                {{ formErrors.usage }}
              </p>
            </div>
          </div>
          <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-100"
              @click="emit('close')"
            >
              취소
            </button>
            <button
              class="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              :disabled="isSaving"
              @click="save"
            >
              {{ isSaving ? "저장 중..." : isEditing ? "수정" : "등록" }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 분류 선택 모달 -->
  <BranchSelectModal
    :visible="showBranchModal"
    :initial-l-code="form.lCode"
    :initial-m-code="form.mCode"
    :initial-s-code="form.sCode"
    @close="showBranchModal = false"
    @select="onBranchSelect"
  />
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
