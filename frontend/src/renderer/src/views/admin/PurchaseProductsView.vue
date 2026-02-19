<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import type { PurchaseProduct, TaxType } from "@/types";
import { apiClient } from "@/services/api/client";
import { showConfirm } from "@/utils/AlertUtils";
import PurchaseProductFormModal from "@/components/PurchaseProductFormModal.vue";

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
const editingProduct = ref<PurchaseProduct | null>(null);

const productTypeOptions = [
  { value: "", label: "선택" },
  { value: "GENERAL", label: "공산품" },
  { value: "WEIGHT", label: "저울상품" },
  { value: "ETC", label: "기타" },
];

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

// ─── 분류 명칭 캐시 ───
type BranchNames = { lName: string | null; mName: string | null; sName: string | null };
const branchNameMap = ref<Map<string, BranchNames>>(new Map());

function branchKey(lCode: string, mCode?: string | null, sCode?: string | null): string {
  return [lCode, mCode || "", sCode || ""].join("|");
}

async function resolveBranchNames(
  items: { lCode: string; mCode?: string | null; sCode?: string | null }[],
): Promise<void> {
  const toResolve = items.filter(
    (i) => i.lCode && !branchNameMap.value.has(branchKey(i.lCode, i.mCode, i.sCode)),
  );
  if (toResolve.length === 0) return;
  try {
    const res = await apiClient.post<{
      success: boolean;
      data: (BranchNames & { lCode: string; mCode: string | null; sCode: string | null })[];
    }>("/api/v1/branches/resolve", toResolve);
    if (res.data.success) {
      for (const b of res.data.data) {
        branchNameMap.value.set(branchKey(b.lCode, b.mCode, b.sCode), {
          lName: b.lName,
          mName: b.mName,
          sName: b.sName,
        });
      }
    }
  } catch (err) {
    console.error("Failed to resolve branch names:", err);
  }
}

function formatBranchLabel(
  lCode?: string | null,
  mCode?: string | null,
  sCode?: string | null,
): string {
  if (!lCode) return "";
  const names = branchNameMap.value.get(branchKey(lCode, mCode, sCode));
  const parts: string[] = [];
  if (names?.lName) parts.push(`${names.lName}(${lCode})`);
  else parts.push(lCode);
  if (mCode) {
    if (names?.mName) parts.push(`${names.mName}(${mCode})`);
    else parts.push(mCode);
  }
  if (sCode) {
    if (names?.sName) parts.push(`${names.sName}(${sCode})`);
    else parts.push(sCode);
  }
  return parts.join("-");
}

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
      // 분류 명칭 일괄 조회
      const branchItems = products.value
        .filter((p) => p.lCode)
        .map((p) => ({ lCode: p.lCode!, mCode: p.mCode, sCode: p.sCode }));
      if (branchItems.length > 0) {
        await resolveBranchNames(branchItems);
      }
    }
  } catch (err) {
    console.error("Failed to load products:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddModal(): void {
  editingProduct.value = null;
  showModal.value = true;
}

function openEditModal(product: PurchaseProduct): void {
  editingProduct.value = product;
  showModal.value = true;
}

function onProductSaved(): void {
  showModal.value = false;
  loadProducts();
}

async function deleteProduct(product: PurchaseProduct): Promise<void> {
  const { isConfirmed } = await showConfirm("상품 삭제");
  if (!isConfirmed) return;
  try {
    await apiClient.delete(`/api/v1/purchase-products/${product.id}`);
    await loadProducts();
  } catch (err) {
    console.error("Failed to delete product:", err);
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
                재고/적정
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
              <td class="cursor-pointer px-4 py-3" @click="openEditModal(product)">
                <p class="font-medium text-slate-800 hover:text-indigo-600">
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
                  v-if="product.lCode"
                  class="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                >
                  {{ formatBranchLabel(product.lCode, product.mCode, product.sCode) }}
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
                <span
                  class="text-sm"
                  :class="
                    product.safeStock > 0 && product.stock <= product.safeStock
                      ? 'font-medium text-amber-600'
                      : 'text-slate-600'
                  "
                >
                  {{ product.stock }} / {{ product.safeStock ?? 0 }}
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
              <td colspan="13" class="px-6 py-12 text-center text-slate-400">
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

    <!-- 등록/수정 모달 (공용 컴포넌트) -->
    <PurchaseProductFormModal
      :visible="showModal"
      :product="editingProduct"
      @close="showModal = false"
      @saved="onProductSaved"
    />
  </div>
</template>
