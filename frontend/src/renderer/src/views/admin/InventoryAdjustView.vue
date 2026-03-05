<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { apiClient } from "@/services/api/client";
import { showWarningToast, showSuccessToast, showApiError, showConfirm } from "@/utils/AlertUtils";
import { formatPrice } from "@/utils/format";

interface PurchaseProductResult {
  id: number;
  barcode: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  stock?: number;
}

interface AdjustItem {
  productId: number;
  barcode: string;
  name: string;
  currentStock: number;
  adjustQty: number;
  afterStock: number;
}

const isLoading = ref(false);
const isSaving = ref(false);

// 조정 사유
const adjustReason = ref("");
const adjustMemo = ref("");
const reasonOptions = [
  { value: "inventory_check", label: "재고실사" },
  { value: "damage", label: "파손/폐기" },
  { value: "gift", label: "증정/샘플" },
  { value: "etc", label: "기타" },
];

// 상품 검색
const productSearch = ref("");
const showProductDropdown = ref(false);
const searchResults = ref<PurchaseProductResult[]>([]);
const isSearching = ref(false);

// 조정 상품 목록
const adjustItems = ref<AdjustItem[]>([]);

// 상품 검색 디바운스
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(productSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!val.trim()) {
    searchResults.value = [];
    showProductDropdown.value = false;
    return;
  }
  searchTimer = setTimeout(() => {
    searchProducts(val.trim());
  }, 300);
});

async function searchProducts(query: string): Promise<void> {
  isSearching.value = true;
  try {
    const res = await apiClient.get<{
      success: boolean;
      data: PurchaseProductResult[];
    }>(`/api/v1/purchase-products?search=${encodeURIComponent(query)}`);

    if (res.data.success) {
      searchResults.value = res.data.data.slice(0, 10);
      showProductDropdown.value = searchResults.value.length > 0;
    }
  } catch (err) {
    console.error("Product search failed:", err);
  } finally {
    isSearching.value = false;
  }
}

function hideDropdown(): void {
  setTimeout(() => {
    showProductDropdown.value = false;
  }, 200);
}

function addProduct(product: PurchaseProductResult): void {
  // 이미 추가된 상품인지 확인
  if (adjustItems.value.find((item) => item.productId === product.id)) {
    productSearch.value = "";
    showProductDropdown.value = false;
    return;
  }

  const currentStock = product.stock ?? 0;
  adjustItems.value.push({
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    currentStock,
    adjustQty: 0,
    afterStock: currentStock,
  });
  productSearch.value = "";
  showProductDropdown.value = false;
}

function updateAfterStock(index: number): void {
  const item = adjustItems.value[index];
  item.afterStock = item.currentStock + item.adjustQty;
}

function removeItem(index: number): void {
  adjustItems.value.splice(index, 1);
}

// 조정이 필요한 항목만 (adjustQty !== 0)
const itemsToAdjust = computed(() => adjustItems.value.filter((item) => item.adjustQty !== 0));

async function submitAdjust(): Promise<void> {
  if (itemsToAdjust.value.length === 0) {
    showWarningToast("조정할 상품이 없습니다. 조정수량을 입력해주세요.");
    return;
  }
  if (!adjustReason.value) {
    showWarningToast("조정 사유를 선택해주세요.");
    return;
  }

  const { isConfirmed } = await showConfirm("재고 조정");
  if (!isConfirmed) return;

  isSaving.value = true;
  try {
    await apiClient.post("/api/v1/stock-movements/adjust", {
      items: itemsToAdjust.value.map((item) => ({
        productId: item.productId,
        adjustQty: item.adjustQty,
      })),
      reason: adjustReason.value,
      memo: adjustMemo.value || undefined,
    });
    showSuccessToast("재고 조정이 완료되었습니다.");
    adjustItems.value = [];
    adjustReason.value = "";
    adjustMemo.value = "";
  } catch (err) {
    showApiError(err, "재고 조정에 실패했습니다");
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  isLoading.value = false;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">재고조정</h2>
      <p class="mt-1 text-sm text-slate-500">재고 수량을 조정합니다</p>
    </div>

    <!-- 검색 & 사유 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">조정 정보</h3>
      <div class="grid gap-4 md:grid-cols-3">
        <!-- 상품 검색 -->
        <div class="relative">
          <label class="mb-1.5 block text-sm font-medium text-slate-700">상품 검색</label>
          <div class="relative">
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
              v-model="productSearch"
              type="text"
              placeholder="바코드 또는 상품명으로 검색..."
              class="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              @focus="showProductDropdown = searchResults.length > 0"
              @blur="hideDropdown"
            />

            <!-- 검색 결과 드롭다운 -->
            <div
              v-if="showProductDropdown && searchResults.length > 0"
              class="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <button
                v-for="product in searchResults"
                :key="product.id"
                class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-indigo-50"
                @mousedown.prevent="addProduct(product)"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    {{ product.name }}
                  </p>
                  <p class="font-mono text-xs text-slate-400">
                    {{ product.barcode }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-500">재고: {{ product.stock ?? 0 }}</p>
                  <p class="text-xs text-slate-400">
                    {{ formatPrice(Number(product.sellPrice)) }}원
                  </p>
                </div>
              </button>
            </div>

            <!-- 검색중 인디케이터 -->
            <div v-if="isSearching" class="absolute right-4 top-1/2 -translate-y-1/2">
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
              />
            </div>
          </div>
        </div>

        <!-- 조정 사유 -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">조정 사유 *</label>
          <select
            v-model="adjustReason"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">선택</option>
            <option v-for="opt in reasonOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- 메모 -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
          <input
            v-model="adjustMemo"
            type="text"
            placeholder="조정 사유 상세..."
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>
    </div>

    <!-- 조정 상품 목록 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">조정 상품</h3>

      <div v-if="adjustItems.length > 0" class="overflow-hidden rounded-xl border border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">상품명</th>
                <th class="w-24 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                  현재고
                </th>
                <th class="w-32 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                  조정수량
                </th>
                <th class="w-24 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                  조정후재고
                </th>
                <th class="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(item, index) in adjustItems" :key="item.productId">
                <td class="px-4 py-3">
                  <p class="text-sm font-medium text-slate-800">
                    {{ item.name }}
                  </p>
                  <p class="font-mono text-xs text-slate-400">
                    {{ item.barcode }}
                  </p>
                </td>
                <td class="px-3 py-3 text-center text-sm font-medium text-slate-600">
                  {{ item.currentStock }}
                </td>
                <td class="px-3 py-3">
                  <input
                    v-model.number="item.adjustQty"
                    type="number"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    @input="updateAfterStock(index)"
                  />
                </td>
                <td class="px-3 py-3 text-center">
                  <span
                    class="text-sm font-semibold"
                    :class="
                      item.afterStock < 0
                        ? 'text-red-600'
                        : item.adjustQty !== 0
                          ? 'text-indigo-600'
                          : 'text-slate-600'
                    "
                  >
                    {{ item.afterStock }}
                  </span>
                </td>
                <td class="px-3 py-3 text-center">
                  <button
                    class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    @click="removeItem(index)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 빈 상태 -->
      <div
        v-else
        class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
      >
        <svg
          class="mx-auto mb-3 h-10 w-10 text-slate-300"
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
        <p class="text-sm text-slate-500">상품을 검색하여 추가하세요</p>
      </div>

      <!-- 조정 요약 & 버튼 -->
      <div v-if="adjustItems.length > 0" class="mt-4">
        <div v-if="itemsToAdjust.length > 0" class="mb-4 rounded-xl bg-indigo-50 p-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-600"> 조정 대상: {{ itemsToAdjust.length }}개 상품 </span>
            <span class="font-medium text-indigo-700">
              증가: {{ itemsToAdjust.filter((i) => i.adjustQty > 0).length }}건 / 감소:
              {{ itemsToAdjust.filter((i) => i.adjustQty < 0).length }}건
            </span>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button
            class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
            @click="
              adjustItems = [];
              adjustReason = '';
            "
          >
            초기화
          </button>
          <button
            class="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            :disabled="isSaving || itemsToAdjust.length === 0 || !adjustReason"
            @click="submitAdjust"
          >
            {{ isSaving ? "조정 중..." : "재고 조정" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
