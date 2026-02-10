<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import type { PurchaseProduct, TaxType } from "@/types";
import { apiClient } from "@/services/api/client";
import BranchSelectModal from "@/components/BranchSelectModal.vue";

const taxTypeConfig: Record<TaxType, { label: string; bg: string; text: string }> = {
  TAXABLE: { label: "과세", bg: "bg-blue-100", text: "text-blue-700" },
  TAX_FREE: { label: "면세", bg: "bg-green-100", text: "text-green-700" },
};

const products = ref<PurchaseProduct[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const filterTaxType = ref<TaxType | "">("");

// 모달
const showModal = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const editingProduct = ref<PurchaseProduct | null>(null);

const productTypeOptions = [
  { value: "", label: "선택" },
  { value: "GENERAL", label: "공산품" },
  { value: "WEIGHT", label: "저울상품" },
  { value: "ETC", label: "기타" },
];

const form = ref({
  barcode: "",
  name: "",
  spec: "",
  productType: "",
  sellPrice: 0,
  costPrice: 0,
  purchaseCost: 0,
  vatAmount: 0,
  taxType: "TAXABLE" as TaxType,
  lCode: "",
  mCode: "",
  sCode: "",
  branchLabel: "",
  isActive: true,
  usePurchase: true,
  useOrder: true,
  useSales: true,
  useInventory: true,
});

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

// 상품구분 변경 시 공산품이 아니면 매입원가/부가세 초기화
watch(
  () => form.value.productType,
  (newType) => {
    if (newType !== "GENERAL") {
      form.value.purchaseCost = 0;
      form.value.vatAmount = 0;
    }
  },
);

const showBranchModal = ref(false);

// 필터링된 상품
const filteredProducts = computed(() => {
  let list = products.value;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q),
    );
  }
  return list;
});

// 통계
const stats = computed(() => {
  const list = filteredProducts.value;
  const totalCost = list.reduce((s, p) => s + Number(p.costPrice), 0);
  const totalSell = list.reduce((s, p) => s + Number(p.sellPrice), 0);
  return {
    count: list.length,
    avgCost: list.length > 0 ? Math.round(totalCost / list.length) : 0,
    avgSell: list.length > 0 ? Math.round(totalSell / list.length) : 0,
    avgMargin: totalSell > 0 ? (((totalSell - totalCost) / totalSell) * 100).toFixed(1) : "0.0",
  };
});

async function loadProducts(): Promise<void> {
  isLoading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filterTaxType.value) params.taxType = filterTaxType.value;

    const res = await apiClient.get<{ success: boolean; data: PurchaseProduct[] }>(
      "/api/v1/purchase-products",
      { params },
    );
    if (res.data.success) {
      products.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load products:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddModal(): void {
  isEditing.value = false;
  editingProduct.value = null;
  form.value = {
    barcode: "",
    name: "",
    spec: "",
    productType: "",
    sellPrice: 0,
    costPrice: 0,
    purchaseCost: 0,
    vatAmount: 0,
    taxType: "TAXABLE",
    lCode: "",
    mCode: "",
    sCode: "",
    branchLabel: "",
    isActive: true,
    usePurchase: true,
    useOrder: true,
    useSales: true,
    useInventory: true,
  };
  showModal.value = true;
}

function openEditModal(product: PurchaseProduct): void {
  isEditing.value = true;
  editingProduct.value = product;
  const branchParts: string[] = [];
  if (product.lCode) branchParts.push(product.lCode);
  if (product.mCode) branchParts.push(product.mCode);
  if (product.sCode) branchParts.push(product.sCode);
  form.value = {
    barcode: product.barcode,
    name: product.name,
    spec: product.spec ?? "",
    productType: product.productType ?? "",
    sellPrice: Number(product.sellPrice),
    costPrice: Number(product.costPrice),
    purchaseCost: Number(product.purchaseCost ?? 0),
    vatAmount: Number(product.vatAmount ?? 0),
    taxType: product.taxType,
    lCode: product.lCode ?? "",
    mCode: product.mCode ?? "",
    sCode: product.sCode ?? "",
    branchLabel: branchParts.join("-"),
    isActive: product.isActive ?? true,
    usePurchase: product.usePurchase ?? true,
    useOrder: product.useOrder ?? true,
    useSales: product.useSales ?? true,
    useInventory: product.useInventory ?? true,
  };
  showModal.value = true;
}

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

function formatBranchCode(product: PurchaseProduct): string {
  if (!product.lCode) return "";
  const parts = [product.lCode];
  if (product.mCode) parts.push(product.mCode);
  if (product.sCode) parts.push(product.sCode);
  return parts.join("-");
}

async function saveProduct(): Promise<void> {
  if (!form.value.barcode || !form.value.name) {
    alert("바코드, 상품명은 필수입니다");
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      barcode: form.value.barcode,
      name: form.value.name,
      spec: form.value.spec || null,
      productType: form.value.productType || null,
      sellPrice: form.value.sellPrice,
      costPrice: form.value.costPrice,
      purchaseCost: form.value.purchaseCost,
      vatAmount: form.value.vatAmount,
      taxType: form.value.taxType,
      lCode: form.value.lCode || null,
      mCode: form.value.mCode || null,
      sCode: form.value.sCode || null,
      isActive: form.value.isActive,
      usePurchase: form.value.usePurchase,
      useOrder: form.value.useOrder,
      useSales: form.value.useSales,
      useInventory: form.value.useInventory,
    };
    if (isEditing.value && editingProduct.value) {
      await apiClient.patch(`/api/v1/purchase-products/${editingProduct.value.id}`, payload);
    } else {
      await apiClient.post("/api/v1/purchase-products", payload);
    }
    showModal.value = false;
    await loadProducts();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "저장에 실패했습니다";
    alert(`상품 저장 실패: ${msg}`);
  } finally {
    isSaving.value = false;
  }
}

async function deleteProduct(product: PurchaseProduct): Promise<void> {
  if (!confirm(`'${product.name}' 상품을 삭제하시겠습니까?`)) return;
  try {
    await apiClient.delete(`/api/v1/purchase-products/${product.id}`);
    await loadProducts();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "삭제에 실패했습니다";
    alert(`삭제 실패: ${msg}`);
  }
}

function formatPrice(price: number | string): string {
  return new Intl.NumberFormat("ko-KR").format(Number(price));
}

function calcMargin(sell: number, cost: number): string {
  if (sell <= 0) return "-";
  return (((sell - cost) / sell) * 100).toFixed(1) + "%";
}

watch([filterTaxType], () => {
  loadProducts();
});

onMounted(() => {
  loadProducts();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매입상품관리</h2>
        <p class="mt-1 text-sm text-slate-500">
          매입 상품의 매입가, 판매가, 과세정보를 관리합니다
          <span v-if="filteredProducts.length > 0" class="font-medium text-slate-700">
            ({{ filteredProducts.length }}건)
          </span>
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        @click="openAddModal"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        상품 등록
      </button>
    </div>

    <!-- 통계 카드 -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">상품수</p>
        <p class="mt-1 text-xl font-bold text-slate-800">{{ stats.count }}건</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">평균 매입가</p>
        <p class="mt-1 text-xl font-bold text-indigo-600">{{ formatPrice(stats.avgCost) }}원</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">평균 판매가</p>
        <p class="mt-1 text-xl font-bold text-emerald-600">{{ formatPrice(stats.avgSell) }}원</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">평균 마진율</p>
        <p class="mt-1 text-xl font-bold text-orange-600">{{ stats.avgMargin }}%</p>
      </div>
    </div>

    <!-- 검색 & 필터 -->
    <div class="flex flex-wrap gap-3">
      <select
        v-model="filterTaxType"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">전체 과세유형</option>
        <option value="TAXABLE">과세</option>
        <option value="TAX_FREE">면세</option>
      </select>
      <div class="relative flex-1" style="min-width: 200px">
        <svg
          class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="상품명, 바코드로 검색..."
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <!-- 상품 테이블 -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50">
              <th
                class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                상품
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                규격
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                구분
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                분류
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                과세
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매입원가
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                부가세
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매입가
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                판매가
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                마진율
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                사용여부
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                관리
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="product in filteredProducts"
              :key="product.id"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-slate-800">
                  {{ product.name }}
                </p>
                <p class="font-mono text-xs text-slate-400">
                  {{ product.barcode }}
                </p>
              </td>
              <td class="px-4 py-3 text-center text-sm text-slate-600">
                {{ product.spec || "-" }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="product.productType"
                  class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {{
                    productTypeOptions.find((o) => o.value === product.productType)?.label ||
                    product.productType
                  }}
                </span>
                <span v-else class="text-sm text-slate-300">-</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="formatBranchCode(product)"
                  class="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 font-mono text-xs font-medium text-purple-700"
                >
                  {{ formatBranchCode(product) }}
                </span>
                <span v-else class="text-sm text-slate-300">-</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="[
                    taxTypeConfig[product.taxType]?.bg,
                    taxTypeConfig[product.taxType]?.text,
                  ]"
                >
                  {{ taxTypeConfig[product.taxType ?? "TAXABLE"]?.label }}
                </span>
              </td>
              <td class="px-4 py-3 text-right text-sm text-slate-600">
                {{ formatPrice(product.purchaseCost ?? 0) }}
              </td>
              <td class="px-4 py-3 text-right text-sm text-slate-600">
                {{ formatPrice(product.vatAmount ?? 0) }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium text-slate-800">
                {{ formatPrice(product.costPrice) }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium text-indigo-600">
                {{ formatPrice(product.sellPrice) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="text-sm font-medium"
                  :class="
                    Number(product.sellPrice) - Number(product.costPrice) > 0
                      ? 'text-green-600'
                      : 'text-red-500'
                  "
                >
                  {{ calcMargin(Number(product.sellPrice), Number(product.costPrice)) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex flex-wrap items-center justify-center gap-1">
                  <span
                    v-if="product.isActive"
                    class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700"
                    >사용여부</span
                  >
                  <span
                    v-if="product.usePurchase"
                    class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                    >매입</span
                  >
                  <span
                    v-if="product.useOrder"
                    class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                    >발주</span
                  >
                  <span
                    v-if="product.useSales"
                    class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"
                    >판매</span
                  >
                  <span
                    v-if="product.useInventory"
                    class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"
                    >재고</span
                  >
                  <span
                    v-if="
                      !product.isActive &&
                      !product.usePurchase &&
                      !product.useOrder &&
                      !product.useSales &&
                      !product.useInventory
                    "
                    class="text-xs text-slate-300"
                    >-</span
                  >
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    title="수정"
                    @click="openEditModal(product)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="삭제"
                    @click="deleteProduct(product)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredProducts.length === 0 && !isLoading">
              <td colspan="12" class="px-6 py-12 text-center text-slate-400">
                <svg
                  class="mx-auto mb-3 h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                등록된 매입상품이 없습니다
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 등록/수정 모달 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showModal = false"
        >
          <div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <header class="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 class="text-lg font-bold text-slate-800">
                {{ isEditing ? "상품 수정" : "매입상품 등록" }}
              </h3>
            </header>
            <div class="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <!-- 바코드 / 상품명 -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">바코드 *</label>
                  <input
                    v-model="form.barcode"
                    type="text"
                    placeholder="상품 바코드"
                    :disabled="isEditing"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">상품명 *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="상품명 입력"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <!-- 규격 / 상품구분 -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">규격</label>
                  <input
                    v-model="form.spec"
                    type="text"
                    placeholder="ex) 500ml, 1kg, 10개입"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">상품구분</label>
                  <select
                    v-model="form.productType"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option v-for="opt in productTypeOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>
              <!-- 분류코드 선택 -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">분류코드</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="
                      form.branchLabel ||
                      (form.lCode ? `${form.lCode}-${form.mCode}-${form.sCode}` : '')
                    "
                    type="text"
                    readonly
                    placeholder="분류를 선택해주세요"
                    class="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                    @click="showBranchModal = true"
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
              </div>
              <!-- 과세유형 -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">과세유형</label>
                <select
                  v-model="form.taxType"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="TAXABLE">과세</option>
                  <option value="TAX_FREE">면세</option>
                  <option value="ZERO_RATE">영세</option>
                </select>
              </div>
              <!-- 매입원가 / 부가세 -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >매입원가 (원)</label
                  >
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
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >판매가 (원) *</label
                  >
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
              <!-- 사용여부 체크박스 -->
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">사용 설정</label>
                <div
                  class="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
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
              </div>
            </div>
            <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-100"
                @click="showModal = false"
              >
                취소
              </button>
              <button
                class="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                :disabled="isSaving"
                @click="saveProduct"
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
  </div>
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
