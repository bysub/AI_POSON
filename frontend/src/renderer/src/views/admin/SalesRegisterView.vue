<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { apiClient } from "@/services/api/client";

interface ProductSearchResult {
  id: number;
  barcode: string;
  name: string;
  sellPrice: number;
  category?: { id: number; name: string };
}

interface SaleItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

const router = useRouter();

const isLoading = ref(false);
const isSaving = ref(false);

// 폼 상태
const saleDate = ref(new Date().toISOString().slice(0, 10));
const paymentType = ref<"CARD" | "CASH" | "MIXED">("CARD");
const memo = ref("");

// 상품 검색
const productSearch = ref("");
const showProductDropdown = ref(false);
const searchResults = ref<ProductSearchResult[]>([]);
const isSearching = ref(false);

// 선택된 상품 목록
const saleItems = ref<SaleItem[]>([]);

// 합계금액
const totalAmount = computed(() => saleItems.value.reduce((sum, item) => sum + item.subtotal, 0));

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
      data: ProductSearchResult[];
    }>(`/api/v1/products?search=${encodeURIComponent(query)}`);

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

function addProduct(product: ProductSearchResult): void {
  const existing = saleItems.value.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.unitPrice;
    productSearch.value = "";
    showProductDropdown.value = false;
    return;
  }

  const unitPrice = Number(product.sellPrice);
  saleItems.value.push({
    productId: product.id,
    name: product.name,
    unitPrice,
    quantity: 1,
    subtotal: unitPrice,
  });
  productSearch.value = "";
  showProductDropdown.value = false;
}

function updateQuantity(index: number, delta: number): void {
  const item = saleItems.value[index];
  const newQty = item.quantity + delta;
  if (newQty < 1) return;
  item.quantity = newQty;
  item.subtotal = item.quantity * item.unitPrice;
}

function removeItem(index: number): void {
  saleItems.value.splice(index, 1);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

async function submitSale(): Promise<void> {
  if (saleItems.value.length === 0) {
    alert("판매 상품을 추가해주세요");
    return;
  }

  isSaving.value = true;
  try {
    await apiClient.post("/api/v1/orders", {
      items: saleItems.value.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      memo: memo.value || null,
    });
    alert("매출이 등록되었습니다.");
    router.push("/admin/sales/history");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "등록에 실패했습니다";
    alert(`매출 등록 실패: ${msg}`);
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  // 초기 로드 불필요 (상품은 검색 시 조회)
  isLoading.value = false;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매출 등록</h2>
        <p class="mt-1 text-sm text-slate-500">수동으로 매출을 등록합니다</p>
      </div>
      <router-link
        to="/admin/sales/history"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        매출내역
      </router-link>
    </div>

    <!-- 기본 정보 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">기본 정보</h3>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">매출일자</label>
          <input
            v-model="saleDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">결제수단</label>
          <select
            v-model="paymentType"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="CARD">카드</option>
            <option value="CASH">현금</option>
            <option value="MIXED">복합</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
          <textarea
            v-model="memo"
            rows="1"
            placeholder="메모 (선택)"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>
    </div>

    <!-- 상품 추가 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">판매 상품</h3>

      <!-- 상품 검색 -->
      <div class="relative mb-4">
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
          placeholder="상품명 또는 바코드로 검색..."
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
            <p class="text-sm font-medium text-indigo-600">
              {{ formatPrice(Number(product.sellPrice)) }}원
            </p>
          </button>
        </div>

        <!-- 검색중 인디케이터 -->
        <div v-if="isSearching" class="absolute right-4 top-1/2 -translate-y-1/2">
          <div
            class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
          />
        </div>
      </div>

      <!-- 추가된 상품 테이블 -->
      <div v-if="saleItems.length > 0" class="overflow-hidden rounded-xl border border-slate-200">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">상품명</th>
              <th class="w-28 px-3 py-3 text-right text-xs font-semibold text-slate-500">단가</th>
              <th class="w-32 px-3 py-3 text-center text-xs font-semibold text-slate-500">수량</th>
              <th class="w-28 px-3 py-3 text-right text-xs font-semibold text-slate-500">소계</th>
              <th class="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(item, index) in saleItems" :key="item.productId">
              <td class="px-4 py-3 text-sm font-medium text-slate-800">
                {{ item.name }}
              </td>
              <td class="px-3 py-3 text-right text-sm text-slate-600">
                {{ formatPrice(item.unitPrice) }}원
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                    @click="updateQuantity(index, -1)"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <span class="w-10 text-center text-sm font-medium text-slate-800">
                    {{ item.quantity }}
                  </span>
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                    @click="updateQuantity(index, 1)"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </button>
                </div>
              </td>
              <td class="px-3 py-3 text-right text-sm font-medium text-slate-800">
                {{ formatPrice(item.subtotal) }}원
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
          <tfoot>
            <tr class="border-t-2 border-slate-200 bg-slate-50">
              <td class="px-4 py-3 text-sm font-semibold text-slate-700">
                합계 ({{ saleItems.length }}건)
              </td>
              <td class="px-3 py-3" />
              <td class="px-3 py-3 text-center text-sm font-semibold text-slate-700">
                {{ saleItems.reduce((s, i) => s + i.quantity, 0) }}
              </td>
              <td class="px-3 py-3 text-right text-sm font-bold text-indigo-600">
                {{ formatPrice(totalAmount) }}원
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
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
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
        <p class="text-sm text-slate-500">상품을 검색하여 추가하세요</p>
      </div>
    </div>

    <!-- 합계 & 등록 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4">
        <span class="text-lg font-semibold text-slate-700">합계금액</span>
        <span class="text-2xl font-bold text-indigo-600">{{ formatPrice(totalAmount) }}원</span>
      </div>

      <div class="mt-4 flex justify-end gap-3">
        <router-link
          to="/admin/sales/history"
          class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          취소
        </router-link>
        <button
          class="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || saleItems.length === 0"
          @click="submitSale"
        >
          {{ isSaving ? "등록 중..." : "매출 등록" }}
        </button>
      </div>
    </div>
  </div>
</template>
