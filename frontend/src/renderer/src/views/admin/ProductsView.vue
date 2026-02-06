<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Product, Category, ProductOption, ProductStatus } from "@/types";
import { apiClient } from "@/services/api/client";

// 상품 상태 라벨 및 스타일
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

// 모달 상태
const showForm = ref(false);
const editingProduct = ref<Product | null>(null);
const productForm = ref({
  barcode: "",
  name: "",
  nameEn: "",
  nameJa: "",
  nameZh: "",
  sellPrice: 0,
  costPrice: 0,
  status: "SELLING" as ProductStatus,
  categoryId: 0,
  imageUrl: "",
  description: "",
});

// 옵션 관리 상태
interface OptionFormItem {
  id?: number;
  name: string;
  price: number;
  isRequired: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}
const editingOptions = ref<OptionFormItem[]>([]);

// 이미지 업로드 상태
const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// 이미지 파일 선택
function handleImageSelect(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // 파일 크기 체크 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("파일 크기는 5MB를 초과할 수 없습니다");
    return;
  }

  // 파일 타입 체크
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
    alert("지원하지 않는 파일 형식입니다 (jpg, png, gif, webp만 가능)");
    return;
  }

  imageFile.value = file;

  // 미리보기 생성
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

// 이미지 업로드
async function uploadImage(): Promise<string | null> {
  if (!imageFile.value) return null;

  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("image", imageFile.value);

    const response = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>("/api/v1/uploads/image", formData);

    if (response.data.success && response.data.data) {
      return response.data.data.url;
    }
    return null;
  } catch (err) {
    console.error("Image upload failed:", err);
    return null;
  } finally {
    isUploading.value = false;
  }
}

// 이미지 제거
function removeImage(): void {
  imageFile.value = null;
  imagePreview.value = null;
  productForm.value.imageUrl = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

// 이미지 URL (미리보기 또는 기존 URL)
function getImageDisplay(): string | null {
  if (imagePreview.value) return imagePreview.value;
  if (productForm.value.imageUrl) {
    // 상대 경로면 baseURL 추가
    if (productForm.value.imageUrl.startsWith("/")) {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      return `${baseUrl}${productForm.value.imageUrl}`;
    }
    return productForm.value.imageUrl;
  }
  return null;
}

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
    nameJa: "",
    nameZh: "",
    sellPrice: 0,
    costPrice: 0,
    status: "SELLING",
    categoryId: categories.value[0]?.id ?? 0,
    imageUrl: "",
    description: "",
  };
  editingOptions.value = [];
  // 이미지 상태 초기화
  imageFile.value = null;
  imagePreview.value = null;
  showForm.value = true;
}

function openEditForm(product: Product): void {
  editingProduct.value = product;
  productForm.value = {
    barcode: product.barcode,
    name: product.name,
    nameEn: product.nameEn ?? "",
    nameJa: product.nameJa ?? "",
    nameZh: product.nameZh ?? "",
    sellPrice: product.sellPrice,
    costPrice: 0,
    status: product.status ?? "SELLING",
    categoryId: product.categoryId,
    imageUrl: product.imageUrl ?? "",
    description: product.description ?? "",
  };
  // 기존 옵션 로드
  editingOptions.value = (product.options ?? []).map((opt) => ({
    id: opt.id,
    name: opt.name,
    price: opt.price,
    isRequired: opt.isRequired,
    isNew: false,
    isDeleted: false,
  }));
  // 이미지 상태 초기화 (기존 이미지 URL은 유지)
  imageFile.value = null;
  imagePreview.value = null;
  showForm.value = true;
}

// 옵션 추가
function addOption(): void {
  editingOptions.value.push({
    name: "",
    price: 0,
    isRequired: false,
    isNew: true,
    isDeleted: false,
  });
}

// 옵션 삭제 (토글)
function removeOption(index: number): void {
  const option = editingOptions.value[index];
  if (option.isNew) {
    // 새로 추가된 옵션은 바로 제거
    editingOptions.value.splice(index, 1);
  } else {
    // 기존 옵션은 삭제 표시
    option.isDeleted = !option.isDeleted;
  }
}

// 옵션 저장 (API 호출)
async function saveOptions(productId: number): Promise<void> {
  for (const option of editingOptions.value) {
    if (option.isDeleted && option.id) {
      // 삭제
      await apiClient.delete(`/api/v1/products/${productId}/options/${option.id}`);
    } else if (option.isNew && !option.isDeleted) {
      // 새로 추가
      await apiClient.post(`/api/v1/products/${productId}/options`, {
        name: option.name,
        price: option.price,
        isRequired: option.isRequired,
      });
    } else if (option.id && !option.isDeleted) {
      // 수정
      await apiClient.patch(`/api/v1/products/${productId}/options/${option.id}`, {
        name: option.name,
        price: option.price,
        isRequired: option.isRequired,
      });
    }
  }
}

async function saveProduct(): Promise<void> {
  if (!productForm.value.barcode || !productForm.value.name || !productForm.value.categoryId) {
    alert("바코드, 상품명, 카테고리는 필수입니다");
    return;
  }

  // 옵션 유효성 검사
  const activeOptions = editingOptions.value.filter((opt) => !opt.isDeleted);
  for (const opt of activeOptions) {
    if (!opt.name.trim()) {
      alert("옵션명을 입력해주세요");
      return;
    }
  }

  isLoading.value = true;
  try {
    // 이미지 업로드가 있으면 먼저 처리
    if (imageFile.value) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        productForm.value.imageUrl = uploadedUrl;
      } else {
        alert("이미지 업로드에 실패했습니다");
        isLoading.value = false;
        return;
      }
    }

    let productId: number;

    console.log(
      "[saveProduct] Saving product with data:",
      JSON.stringify(productForm.value, null, 2),
    );

    if (editingProduct.value) {
      // 상품 수정
      console.log("[saveProduct] Updating product ID:", editingProduct.value.id);
      const result = await apiClient.patch(
        `/api/v1/products/${editingProduct.value.id}`,
        productForm.value,
      );
      console.log("[saveProduct] Update result:", result);
      productId = editingProduct.value.id;
      // 옵션 저장
      await saveOptions(productId);
    } else {
      // 상품 추가 (옵션은 별도로 저장)
      const res = await apiClient.post<{ success: boolean; data: Product }>(
        "/api/v1/products",
        productForm.value,
      );
      productId = res.data.data.id;
      // 새 상품의 옵션 저장
      if (activeOptions.length > 0) {
        await saveOptions(productId);
      }
    }

    showForm.value = false;
    await loadData();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "저장에 실패했습니다";
    alert(`저장 실패: ${errorMessage}`);
    console.error("Save product error:", err);
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
            <td class="px-6 py-4">
              <div class="flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400"
                >
                  {{ product.name.charAt(0) }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-slate-800">
                      {{ product.name }}
                    </p>
                    <span
                      v-if="product.options && product.options.length > 0"
                      class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      옵션 {{ product.options.length }}
                    </span>
                  </div>
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
            <td colspan="5" class="px-6 py-12 text-center text-slate-400">
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
          <div
            class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
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

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >상품명 (일본어)</label
                  >
                  <input
                    v-model="productForm.nameJa"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="商品名"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >상품명 (중국어)</label
                  >
                  <input
                    v-model="productForm.nameZh"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="商品名称"
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
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">판매상태 *</label>
                  <select
                    v-model="productForm.status"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="SELLING">판매중</option>
                    <option value="SOLD_OUT">품절</option>
                    <option value="PENDING">판매대기</option>
                    <option value="HIDDEN">숨김</option>
                  </select>
                </div>
              </div>

              <!-- 상품 이미지 -->
              <div class="productsImage">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">상품 이미지</label>
                <div class="flex gap-4">
                  <!-- 이미지 미리보기 -->
                  <div
                    class="relative flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
                  >
                    <img
                      v-if="getImageDisplay()"
                      :src="getImageDisplay()!"
                      alt="상품 이미지"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="text-center text-slate-400">
                      <svg
                        class="mx-auto h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p class="mt-1 text-xs">이미지 없음</p>
                    </div>
                    <!-- 이미지 제거 버튼 -->
                    <button
                      v-if="getImageDisplay()"
                      type="button"
                      class="absolute -right-0 -top-0 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                      @click="removeImage"
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
                  </div>

                  <!-- 업로드 영역 -->
                  <div class="flex flex-1 flex-col justify-center">
                    <input
                      ref="fileInputRef"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      class="hidden"
                      @change="handleImageSelect"
                    />
                    <button
                      type="button"
                      class="mb-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                      :disabled="isUploading"
                      @click="fileInputRef?.click()"
                    >
                      <svg
                        class="h-5 w-5 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      {{ isUploading ? "업로드 중..." : "이미지 선택" }}
                    </button>
                    <p class="text-xs text-slate-400">JPG, PNG, GIF, WEBP (최대 5MB)</p>
                    <p v-if="imageFile" class="mt-1 text-xs text-indigo-600">
                      선택됨: {{ imageFile.name }}
                    </p>
                  </div>
                </div>
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

              <!-- 옵션 관리 섹션 -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="mb-3 flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700">상품 옵션</label>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200"
                    @click="addOption"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    옵션 추가
                  </button>
                </div>

                <!-- 옵션 목록 -->
                <div
                  v-if="editingOptions.length === 0"
                  class="py-4 text-center text-sm text-slate-400"
                >
                  등록된 옵션이 없습니다
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="(option, index) in editingOptions"
                    :key="index"
                    class="flex items-center gap-2 rounded-lg border bg-white p-2 transition-all"
                    :class="
                      option.isDeleted ? 'border-red-200 bg-red-50 opacity-50' : 'border-slate-200'
                    "
                  >
                    <!-- 옵션명 -->
                    <input
                      v-model="option.name"
                      type="text"
                      placeholder="옵션명 (예: 샷 추가)"
                      class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      :disabled="option.isDeleted"
                    />
                    <!-- 가격 -->
                    <div class="relative w-28">
                      <input
                        v-model.number="option.price"
                        type="number"
                        placeholder="0"
                        class="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        :disabled="option.isDeleted"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                        >원</span
                      >
                    </div>
                    <!-- 필수 여부 -->
                    <label class="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                      <input
                        v-model="option.isRequired"
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        :disabled="option.isDeleted"
                      />
                      필수
                    </label>
                    <!-- 삭제 버튼 -->
                    <button
                      type="button"
                      class="rounded-lg p-1.5 transition-colors"
                      :class="
                        option.isDeleted
                          ? 'text-green-600 hover:bg-green-100'
                          : 'text-red-500 hover:bg-red-100'
                      "
                      :title="option.isDeleted ? '복원' : '삭제'"
                      @click="removeOption(index)"
                    >
                      <svg
                        v-if="!option.isDeleted"
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <svg
                        v-else
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
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
.productsImage button.-top-0 {
  top: 0;
}
.productsImage button.-right-0 {
  top: 0;
}
</style>
