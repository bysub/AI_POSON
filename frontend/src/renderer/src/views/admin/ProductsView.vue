<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Product, Category, ProductStatus } from "@/types";
import { apiClient } from "@/services/api/client";
import { useSettingsStore } from "@/stores/settings";
import { showSuccessToast, showConfirm, showApiError } from "@/utils/AlertUtils";
import { formatPrice } from "@/utils/format";
import ProductFormModal from "@/components/ProductFormModal.vue";

const settingsStore = useSettingsStore();
const kitchenCallEnabled = computed(() => settingsStore.get("sale.kitchenCallEnabled") === "1");

const statusConfig: Record<ProductStatus, { label: string; bg: string; text: string }> = {
  SELLING: { label: "판매중", bg: "bg-green-100", text: "text-green-700" },
  SOLD_OUT: { label: "품절", bg: "bg-red-100", text: "text-red-700" },
  PENDING: { label: "판매대기", bg: "bg-amber-100", text: "text-amber-700" },
  HIDDEN: { label: "숨김", bg: "bg-slate-100", text: "text-slate-500" },
};

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");

const showForm = ref(false);
const editingProduct = ref<Product | null>(null);

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value;
  const query = searchQuery.value.toLowerCase();
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query) ||
      (p.nameEn?.toLowerCase().includes(query) ?? false),
  );
});

async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      apiClient.get<{ success: boolean; data: Product[] }>("/api/v1/products?admin=true"),
      apiClient.get<{ success: boolean; data: Category[] }>("/api/v1/categories"),
    ]);

    if (productsRes.data.success) products.value = productsRes.data.data;
    if (categoriesRes.data.success) categories.value = categoriesRes.data.data;
  } catch (err) {
    console.error("Failed to load data:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddForm(): void {
  editingProduct.value = null;
  showForm.value = true;
}

function openEditForm(product: Product): void {
  editingProduct.value = product;
  showForm.value = true;
}

async function deleteProduct(product: Product): Promise<void> {
  const result = await showConfirm(`"${product.name}" 삭제`, "delete");
  if (!result.isConfirmed) return;

  isLoading.value = true;
  try {
    await apiClient.delete(`/api/v1/products/${product.id}`);
    showSuccessToast("상품이 삭제되었습니다");
    await loadData();
  } catch (err) {
    showApiError(err, "삭제에 실패했습니다");
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

function handleSaved(): void {
  showForm.value = false;
  loadData();
}

onMounted(() => {
  settingsStore.initialize();
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">상품 관리</h2>
        <p class="mt-1 text-sm text-slate-500">
          총 {{ products.length }}개의 상품이 등록되어 있습니다
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        @click="openAddForm"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        상품 추가
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="flex gap-4">
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
          v-model="searchQuery"
          type="text"
          placeholder="상품명, 바코드로 검색..."
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>

    <!-- Products Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
        />
      </div>

      <!-- Table -->
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              상품
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              카테고리
            </th>
            <th
              class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              가격
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              재고
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              판매상태
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
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
            <td class="cursor-pointer px-6 py-4" @click="openEditForm(product)">
              <div class="flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400"
                >
                  {{ product.name.charAt(0) }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-slate-800 hover:text-indigo-600">
                      {{ product.name }}
                    </p>
                    <span
                      v-if="product.options && product.options.length > 0"
                      class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      옵션 {{ product.options.length }}
                    </span>
                    <span
                      v-if="kitchenCallEnabled && product.kitchenCall"
                      class="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
                    >
                      주방
                    </span>
                    <span
                      v-if="product.isDiscount"
                      class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                    >
                      할인
                    </span>
                  </div>
                  <p class="text-sm text-slate-500">
                    {{ product.barcode }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="cat in product.categories"
                  :key="cat.id"
                  class="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-700"
                >
                  {{ cat.name }}
                </span>
                <span v-if="!product.categories?.length" class="text-sm text-slate-400">-</span>
              </div>
            </td>
            <td class="px-6 py-4 text-right">
              <div>
                <p
                  class="font-semibold"
                  :class="
                    product.isDiscount ? 'text-sm text-slate-400 line-through' : 'text-slate-800'
                  "
                >
                  {{ formatPrice(product.sellPrice) }}
                </p>
                <p
                  v-if="product.isDiscount && product.discountPrice"
                  class="font-semibold text-rose-600"
                >
                  {{ formatPrice(product.discountPrice) }}
                </p>
              </div>
            </td>
            <td class="px-6 py-4 text-center">
              <template v-if="product.purchaseProduct">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    product.purchaseProduct.stock <= product.purchaseProduct.safeStock
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  "
                >
                  {{ product.purchaseProduct.stock }}
                </span>
              </template>
              <span v-else class="text-xs text-slate-400">-</span>
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="[
                  statusConfig[product.status]?.bg ?? 'bg-slate-100',
                  statusConfig[product.status]?.text ?? 'text-slate-500',
                ]"
              >
                {{ statusConfig[product.status]?.label ?? product.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                  @click="openEditForm(product)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  @click="deleteProduct(product)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <tr v-if="filteredProducts.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-slate-400">
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
              {{ searchQuery ? "검색 결과가 없습니다" : "등록된 상품이 없습니다" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Product Form Modal -->
    <ProductFormModal
      :show="showForm"
      :product="editingProduct"
      :categories="categories"
      @close="showForm = false"
      @saved="handleSaved"
    />
  </div>
</template>
