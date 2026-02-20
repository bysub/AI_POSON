<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import type { Supplier } from "@/types";
import { apiClient } from "@/services/api/client";
import { showWarningToast, showApiError } from "@/utils/AlertUtils";
import SupplierFormModal from "@/components/SupplierFormModal.vue";
import PurchaseProductFormModal from "@/components/PurchaseProductFormModal.vue";

interface ProductSearchResult {
  id: number;
  barcode: string;
  name: string;
  sellPrice: number;
  costPrice: number | null;
}

interface PurchaseFormItem {
  purchaseProductId: number;
  barcode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  sellPrice: number;
  amount: number;
}

const router = useRouter();

const suppliers = ref<Supplier[]>([]);
const products = ref<ProductSearchResult[]>([]);
const isSaving = ref(false);

// 폼 상태
const selectedSupplierId = ref<number | "">("");
const purchaseDate = ref(new Date().toISOString().slice(0, 10));
const memo = ref("");
const taxIncluded = ref(true);
const purchaseItems = ref<PurchaseFormItem[]>([]);

// 상품 검색
const productSearch = ref("");
const showProductDropdown = ref(false);
const filteredProducts = computed(() => {
  if (!productSearch.value.trim()) return [];
  const q = productSearch.value.toLowerCase();
  return products.value
    .filter((p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q))
    .slice(0, 10);
});

// 합계 계산
const totalAmount = computed(() => purchaseItems.value.reduce((sum, item) => sum + item.amount, 0));
const taxAmount = computed(() =>
  taxIncluded.value ? Math.round(totalAmount.value / 11) : Math.round(totalAmount.value * 0.1),
);
const supplyAmount = computed(() =>
  taxIncluded.value ? totalAmount.value - taxAmount.value : totalAmount.value,
);
const grandTotal = computed(() =>
  taxIncluded.value ? totalAmount.value : totalAmount.value + taxAmount.value,
);

// 검색어 입력 시 드롭다운 자동 표시
watch(productSearch, (val) => {
  if (val.trim()) {
    showProductDropdown.value = true;
  }
});

// 판매가 합계 (마진 참고용)
const totalSellAmount = computed(() =>
  purchaseItems.value.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0),
);
const marginAmount = computed(() => totalSellAmount.value - grandTotal.value);
const marginRate = computed(() =>
  totalSellAmount.value > 0
    ? ((marginAmount.value / totalSellAmount.value) * 100).toFixed(1)
    : "0.0",
);

async function loadSuppliers(): Promise<void> {
  try {
    const res = await apiClient.get<{ success: boolean; data: Supplier[] }>("/api/v1/suppliers");
    if (res.data.success) {
      suppliers.value = res.data.data.filter((s) => s.isActive);
    }
  } catch (err) {
    console.error("Failed to load suppliers:", err);
  }
}

async function loadProducts(): Promise<void> {
  try {
    const res = await apiClient.get<{
      success: boolean;
      data: ProductSearchResult[];
    }>("/api/v1/purchase-products");
    if (res.data.success) {
      products.value = res.data.data as unknown as ProductSearchResult[];
    }
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

function hideDropdown(): void {
  setTimeout(() => {
    showProductDropdown.value = false;
  }, 200);
}

function addProduct(product: ProductSearchResult): void {
  const existing = purchaseItems.value.find((item) => item.purchaseProductId === product.id);
  if (existing) {
    existing.quantity += 1;
    existing.amount = existing.quantity * existing.unitPrice;
    productSearch.value = "";
    showProductDropdown.value = false;
    return;
  }

  const unitPrice = Number(product.costPrice ?? product.sellPrice);
  const sellPrice = Number(product.sellPrice);
  purchaseItems.value.push({
    purchaseProductId: product.id,
    barcode: product.barcode,
    name: product.name,
    quantity: 1,
    unitPrice,
    sellPrice,
    amount: unitPrice,
  });
  productSearch.value = "";
  showProductDropdown.value = false;
}

function removeItem(index: number): void {
  purchaseItems.value.splice(index, 1);
}

function updateItemAmount(index: number): void {
  const item = purchaseItems.value[index];
  item.amount = item.quantity * item.unitPrice;
}

async function savePurchase(): Promise<void> {
  if (!selectedSupplierId.value) {
    showWarningToast("거래처를 선택해주세요");
    return;
  }
  if (purchaseItems.value.length === 0) {
    showWarningToast("매입 상품을 추가해주세요");
    return;
  }

  isSaving.value = true;
  try {
    await apiClient.post("/api/v1/purchases", {
      supplierId: selectedSupplierId.value,
      purchaseDate: purchaseDate.value,
      memo: memo.value || null,
      taxIncluded: taxIncluded.value,
      items: purchaseItems.value.map((item) => ({
        purchaseProductId: item.purchaseProductId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sellPrice: item.sellPrice,
      })),
    });
    router.push("/admin/purchase/history");
  } catch (err) {
    showApiError(err, "매입 등록에 실패했습니다");
  } finally {
    isSaving.value = false;
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

// ===== 거래처 등록 모달 (SupplierFormModal 컴포넌트 사용) =====
const showSupplierModal = ref(false);

function openSupplierModal(): void {
  showSupplierModal.value = true;
}

async function onSupplierSaved(saved: Supplier): Promise<void> {
  await loadSuppliers();
  selectedSupplierId.value = saved.id;
}

// ===== 매입상품 등록 모달 (PurchaseProductFormModal 컴포넌트 사용) =====
const showProductModal = ref(false);

function openProductModal(): void {
  showProductModal.value = true;
}

async function onProductSaved(): Promise<void> {
  await loadProducts();
}

onMounted(() => {
  loadSuppliers();
  loadProducts();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매입 등록</h2>
        <p class="mt-1 text-sm text-slate-500">새로운 매입 내역을 등록합니다</p>
      </div>
      <router-link
        to="/admin/purchase/history"
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
        매입내역
      </router-link>
    </div>

    <!-- 기본 정보 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">기본 정보</h3>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">거래처 *</label>
          <div class="flex gap-2">
            <select
              v-model="selectedSupplierId"
              class="select-custom-arrow flex-1 appearance-none rounded-xl border border-slate-200 px-4 py-2.5 pr-8 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">거래처 선택</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.code }})
              </option>
            </select>
            <button
              type="button"
              class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
              title="거래처 추가"
              @click="openSupplierModal"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">매입일자 *</label>
          <input
            v-model="purchaseDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">부가세</label>
          <div class="flex h-[42px] items-center gap-4">
            <label class="flex cursor-pointer items-center gap-2">
              <input
                v-model="taxIncluded"
                type="radio"
                :value="true"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-700">포함</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2">
              <input
                v-model="taxIncluded"
                type="radio"
                :value="false"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-700">별도</span>
            </label>
          </div>
        </div>
      </div>
      <div class="mt-4">
        <label class="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
        <input
          v-model="memo"
          type="text"
          placeholder="매입 관련 메모 (선택)"
          class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>

    <!-- 상품 추가 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 font-semibold text-slate-700">매입 상품</h3>

      <!-- 상품 검색 -->
      <div class="mb-4 flex gap-2">
        <div class="relative flex-1">
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
            @focus="showProductDropdown = true"
            @blur="hideDropdown"
          />

          <!-- 검색 결과 드롭다운 -->
          <div
            v-if="showProductDropdown && filteredProducts.length > 0"
            class="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <button
              v-for="product in filteredProducts"
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
                <p class="text-xs text-slate-400">
                  매입 {{ formatPrice(Number(product.costPrice ?? product.sellPrice)) }}원
                </p>
                <p class="text-xs text-slate-400">
                  판매 {{ formatPrice(Number(product.sellPrice)) }}원
                </p>
              </div>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
          title="매입상품 등록 (매입상품관리)"
          @click="openProductModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <!-- 추가된 상품 테이블 -->
      <div
        v-if="purchaseItems.length > 0"
        class="overflow-hidden rounded-xl border border-slate-200"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">상품</th>
                <th class="w-24 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                  수량
                </th>
                <th class="w-32 px-3 py-3 text-right text-xs font-semibold text-slate-500">
                  매입가
                </th>
                <th class="w-32 px-3 py-3 text-right text-xs font-semibold text-slate-500">
                  판매가
                </th>
                <th class="w-32 px-3 py-3 text-right text-xs font-semibold text-slate-500">
                  매입금액
                </th>
                <th class="w-20 px-3 py-3 text-right text-xs font-semibold text-slate-500">마진</th>
                <th class="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(item, index) in purchaseItems" :key="item.purchaseProductId">
                <td class="px-4 py-3">
                  <p class="text-sm font-medium text-slate-800">
                    {{ item.name }}
                  </p>
                  <p class="font-mono text-xs text-slate-400">
                    {{ item.barcode }}
                  </p>
                </td>
                <td class="px-3 py-3">
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    @input="updateItemAmount(index)"
                  />
                </td>
                <td class="px-3 py-3">
                  <input
                    v-model.number="item.unitPrice"
                    type="number"
                    min="0"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    @input="updateItemAmount(index)"
                  />
                </td>
                <td class="px-3 py-3">
                  <input
                    v-model.number="item.sellPrice"
                    type="number"
                    min="0"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </td>
                <td class="px-3 py-3 text-right text-sm font-medium text-slate-800">
                  {{ formatPrice(item.amount) }}원
                </td>
                <td class="px-3 py-3 text-right">
                  <span
                    v-if="item.sellPrice > 0"
                    class="text-xs font-medium"
                    :class="item.sellPrice - item.unitPrice > 0 ? 'text-green-600' : 'text-red-500'"
                  >
                    {{ (((item.sellPrice - item.unitPrice) / item.sellPrice) * 100).toFixed(1) }}%
                  </span>
                  <span v-else class="text-xs text-slate-400">-</span>
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
                  합계 ({{ purchaseItems.length }}건)
                </td>
                <td class="px-3 py-3 text-center text-sm font-semibold text-slate-700">
                  {{ purchaseItems.reduce((s, i) => s + i.quantity, 0) }}
                </td>
                <td class="px-3 py-3" />
                <td class="px-3 py-3" />
                <td class="px-3 py-3 text-right text-sm font-bold text-slate-800">
                  {{ formatPrice(totalAmount) }}원
                </td>
                <td class="px-3 py-3 text-right">
                  <span
                    v-if="totalSellAmount > 0"
                    class="text-xs font-semibold"
                    :class="marginAmount > 0 ? 'text-green-600' : 'text-red-500'"
                  >
                    {{ marginRate }}%
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
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
    </div>

    <!-- 합계 & 저장 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-6 sm:grid-cols-2">
        <!-- 매입 금액 -->
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-600">매입 금액</h4>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">공급가액</span>
            <span class="font-medium text-slate-800">{{ formatPrice(supplyAmount) }}원</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">
              부가세 <span class="text-xs">({{ taxIncluded ? "포함" : "별도" }})</span>
            </span>
            <span class="font-medium text-slate-800">{{ formatPrice(taxAmount) }}원</span>
          </div>
          <div class="flex justify-between border-t border-slate-200 pt-2 text-lg">
            <span class="font-semibold text-slate-700">합계금액</span>
            <span class="font-bold text-indigo-600">{{ formatPrice(grandTotal) }}원</span>
          </div>
        </div>

        <!-- 마진 정보 -->
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-600">마진 정보</h4>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">판매가 합계</span>
            <span class="font-medium text-slate-800">{{ formatPrice(totalSellAmount) }}원</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">매입가 합계</span>
            <span class="font-medium text-slate-800">{{ formatPrice(grandTotal) }}원</span>
          </div>
          <div class="flex justify-between border-t border-slate-200 pt-2 text-lg">
            <span class="font-semibold text-slate-700">예상 마진</span>
            <span class="font-bold" :class="marginAmount >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ formatPrice(marginAmount) }}원
              <span class="text-sm font-normal">({{ marginRate }}%)</span>
            </span>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <router-link
          to="/admin/purchase/history"
          class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          취소
        </router-link>
        <button
          class="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || purchaseItems.length === 0 || !selectedSupplierId"
          @click="savePurchase"
        >
          {{ isSaving ? "저장 중..." : "매입 등록" }}
        </button>
      </div>
    </div>
  </div>

  <!-- 거래처 등록 모달 (공용 컴포넌트) -->
  <SupplierFormModal
    :visible="showSupplierModal"
    @close="showSupplierModal = false"
    @saved="onSupplierSaved"
  />

  <!-- 매입상품 등록 모달 (공용 컴포넌트) -->
  <PurchaseProductFormModal
    :visible="showProductModal"
    @close="showProductModal = false"
    @saved="onProductSaved"
  />
</template>

<style scoped>
.select-custom-arrow {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
</style>
