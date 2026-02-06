<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Product, Category } from "@/types";
import { apiClient } from "@/services/api/client";

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");

// 모달 상태
const showForm = ref(false);
const editingProduct = ref<Product | null>(null);
const productForm = ref({
  barcode: "",
  name: "",
  nameEn: "",
  sellPrice: 0,
  costPrice: 0,
  stock: 0,
  categoryId: 0,
  imageUrl: "",
  description: "",
});

// 필터링된 상품
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
      apiClient.get<{ success: boolean; data: Product[] }>("/api/v1/products"),
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(price);
}

function getCategoryName(categoryId: number): string {
  return categories.value.find((c) => c.id === categoryId)?.name ?? "-";
}

function openAddForm(): void {
  editingProduct.value = null;
  productForm.value = {
    barcode: "",
    name: "",
    nameEn: "",
    sellPrice: 0,
    costPrice: 0,
    stock: 0,
    categoryId: categories.value[0]?.id ?? 0,
    imageUrl: "",
    description: "",
  };
  showForm.value = true;
}

function openEditForm(product: Product): void {
  editingProduct.value = product;
  productForm.value = {
    barcode: product.barcode,
    name: product.name,
    nameEn: product.nameEn ?? "",
    sellPrice: product.sellPrice,
    costPrice: 0,
    stock: product.stock,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl ?? "",
    description: product.description ?? "",
  };
  showForm.value = true;
}

async function saveProduct(): Promise<void> {
  if (!productForm.value.barcode || !productForm.value.name || !productForm.value.categoryId) {
    alert("바코드, 상품명, 카테고리는 필수입니다");
    return;
  }

  isLoading.value = true;
  try {
    if (editingProduct.value) {
      await apiClient.patch(`/api/v1/products/${editingProduct.value.id}`, productForm.value);
    } else {
      await apiClient.post("/api/v1/products", productForm.value);
    }
    showForm.value = false;
    await loadData();
  } catch (err) {
    alert("저장에 실패했습니다");
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function deleteProduct(product: Product): Promise<void> {
  if (!confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) return;

  isLoading.value = true;
  try {
    await apiClient.delete(`/api/v1/products/${product.id}`);
    await loadData();
  } catch (err) {
    alert("삭제에 실패했습니다");
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
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
              class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              재고
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              상태
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
            <td class="px-6 py-4">
              <div class="flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400"
                >
                  {{ product.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-slate-800">
                    {{ product.name }}
                  </p>
                  <p class="text-sm text-slate-500">
                    {{ product.barcode }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-700"
              >
                {{ getCategoryName(product.categoryId) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <p class="font-semibold text-slate-800">
                {{ formatPrice(product.sellPrice) }}
              </p>
            </td>
            <td class="px-6 py-4 text-right">
              <span
                class="font-medium"
                :class="
                  product.stock > 10
                    ? 'text-green-600'
                    : product.stock > 0
                      ? 'text-amber-600'
                      : 'text-red-600'
                "
              >
                {{ product.stock }}
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  product.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                "
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="product.isActive ? 'bg-green-500' : 'bg-slate-400'"
                />
                {{ product.isActive ? "판매중" : "숨김" }}
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
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showForm = false"
        >
          <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div class="mb-6 flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-800">
                {{ editingProduct ? "상품 수정" : "상품 추가" }}
              </h3>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="showForm = false"
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
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">바코드 *</label>
                  <input
                    v-model="productForm.barcode"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="상품 바코드"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">카테고리 *</label>
                  <select
                    v-model="productForm.categoryId"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >상품명 (한글) *</label
                  >
                  <input
                    v-model="productForm.name"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="상품명"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >상품명 (영문)</label
                  >
                  <input
                    v-model="productForm.nameEn"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Product Name"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">판매가 *</label>
                  <input
                    v-model.number="productForm.sellPrice"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">원가</label>
                  <input
                    v-model.number="productForm.costPrice"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">재고</label>
                  <input
                    v-model.number="productForm.stock"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">이미지 URL</label>
                <input
                  v-model="productForm.imageUrl"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">설명</label>
                <textarea
                  v-model="productForm.description"
                  rows="2"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="상품 설명"
                />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
                @click="showForm = false"
              >
                취소
              </button>
              <button
                class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
                @click="saveProduct"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
