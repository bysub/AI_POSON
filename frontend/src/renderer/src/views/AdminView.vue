<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { Product, Category } from "@/types";
import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/stores/auth";
import { showWarningToast, showApiError, showConfirm } from "@/utils/AlertUtils";

const router = useRouter();
const authStore = useAuthStore();

// 현재 탭
type AdminTab = "products" | "categories" | "orders" | "settings";
const currentTab = ref<AdminTab>("products");

// 상품 관련 상태
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// 상품 폼
const showProductForm = ref(false);
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

// 카테고리 폼
const showCategoryForm = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryForm = ref({
  name: "",
  nameEn: "",
  sortOrder: 0,
});

/**
 * 데이터 로드
 */
async function loadData(): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      apiClient.get<{ success: boolean; data: Product[] }>("/api/v1/products"),
      apiClient.get<{ success: boolean; data: Category[] }>("/api/v1/categories"),
    ]);

    if (productsRes.data.success) {
      products.value = productsRes.data.data;
    }
    if (categoriesRes.data.success) {
      categories.value = categoriesRes.data.data;
    }
  } catch (err) {
    error.value = "데이터를 불러오는데 실패했습니다";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return "₩" + new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 카테고리 이름 가져오기
 */
function getCategoryName(categoryId: number): string {
  const category = categories.value.find((c) => c.id === categoryId);
  return category?.name ?? "-";
}

// ========== 상품 관리 ==========

/**
 * 상품 추가 폼 열기
 */
function openAddProductForm(): void {
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
  showProductForm.value = true;
}

/**
 * 상품 수정 폼 열기
 */
function openEditProductForm(product: Product): void {
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
  showProductForm.value = true;
}

/**
 * 상품 저장
 */
async function saveProduct(): Promise<void> {
  if (!productForm.value.barcode || !productForm.value.name || !productForm.value.categoryId) {
    showWarningToast("바코드, 상품명, 카테고리는 필수입니다");
    return;
  }

  isLoading.value = true;

  try {
    if (editingProduct.value) {
      // 수정
      await apiClient.patch(`/api/v1/products/${editingProduct.value.id}`, productForm.value);
    } else {
      // 추가
      await apiClient.post("/api/v1/products", productForm.value);
    }

    showProductForm.value = false;
    await loadData();
  } catch (err) {
    showApiError(err, "저장에 실패했습니다");
  } finally {
    isLoading.value = false;
  }
}

/**
 * 상품 삭제
 */
async function deleteProduct(product: Product): Promise<void> {
  const { isConfirmed } = await showConfirm("상품 삭제");
  if (!isConfirmed) return;

  isLoading.value = true;

  try {
    await apiClient.delete(`/api/v1/products/${product.id}`);
    await loadData();
  } catch (err) {
    showApiError(err, "삭제에 실패했습니다");
  } finally {
    isLoading.value = false;
  }
}

// ========== 카테고리 관리 ==========

/**
 * 카테고리 추가 폼 열기
 */
function openAddCategoryForm(): void {
  editingCategory.value = null;
  categoryForm.value = {
    name: "",
    nameEn: "",
    sortOrder: categories.value.length + 1,
  };
  showCategoryForm.value = true;
}

/**
 * 카테고리 수정 폼 열기
 */
function openEditCategoryForm(category: Category): void {
  editingCategory.value = category;
  categoryForm.value = {
    name: category.name,
    nameEn: category.nameEn ?? "",
    sortOrder: category.sortOrder,
  };
  showCategoryForm.value = true;
}

/**
 * 카테고리 저장
 */
async function saveCategory(): Promise<void> {
  if (!categoryForm.value.name) {
    showWarningToast("카테고리명은 필수입니다");
    return;
  }

  isLoading.value = true;

  try {
    if (editingCategory.value) {
      await apiClient.patch(`/api/v1/categories/${editingCategory.value.id}`, categoryForm.value);
    } else {
      await apiClient.post("/api/v1/categories", categoryForm.value);
    }

    showCategoryForm.value = false;
    await loadData();
  } catch (err) {
    showApiError(err, "저장에 실패했습니다");
  } finally {
    isLoading.value = false;
  }
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(category: Category): Promise<void> {
  const { isConfirmed } = await showConfirm("카테고리 삭제");
  if (!isConfirmed) return;

  isLoading.value = true;

  try {
    await apiClient.delete(`/api/v1/categories/${category.id}`);
    await loadData();
  } catch (err) {
    showApiError(err, "삭제에 실패했습니다 (연결된 상품이 있을 수 있습니다)");
  } finally {
    isLoading.value = false;
  }
}

/**
 * 로그아웃
 */
function handleLogout(): void {
  authStore.logout();
  router.push("/");
}

/**
 * 관리자 종료 (로그아웃 없이)
 */
function exitAdmin(): void {
  router.push("/");
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="flex h-full flex-col bg-gray-100">
    <!-- Header -->
    <header class="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
      <h1 class="text-xl font-bold">관리자 모드</h1>
      <div class="flex items-center gap-4">
        <!-- 로그인 사용자 정보 -->
        <div v-if="authStore.admin" class="flex items-center gap-2 text-sm">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-bold">
            {{ (authStore.admin.name ?? authStore.admin.username).charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-medium">
              {{ authStore.admin.name ?? authStore.admin.username }}
            </p>
            <p class="text-xs text-gray-400">
              {{ authStore.admin.role }}
            </p>
          </div>
        </div>
        <div class="h-8 w-px bg-gray-600" />
        <button
          class="rounded-lg bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
          @click="exitAdmin"
        >
          키오스크로
        </button>
        <button
          class="rounded-lg bg-red-500 px-4 py-2 font-medium transition-colors hover:bg-red-600"
          @click="handleLogout"
        >
          로그아웃
        </button>
      </div>
    </header>

    <!-- Tab Navigation -->
    <nav class="flex border-b border-gray-200 bg-white">
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="
          currentTab === 'products'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="currentTab = 'products'"
      >
        상품 관리
      </button>
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="
          currentTab === 'categories'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="currentTab = 'categories'"
      >
        카테고리 관리
      </button>
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="
          currentTab === 'orders'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="currentTab = 'orders'"
      >
        주문 내역
      </button>
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="
          currentTab === 'settings'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="currentTab = 'settings'"
      >
        설정
      </button>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-600">
        {{ error }}
        <button class="ml-4 underline" @click="loadData">다시 시도</button>
      </div>

      <!-- Products Tab -->
      <template v-else-if="currentTab === 'products'">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-800">상품 목록 ({{ products.length }}개)</h2>
          <button
            class="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            @click="openAddProductForm"
          >
            + 상품 추가
          </button>
        </div>

        <div class="overflow-hidden rounded-lg bg-white shadow">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">바코드</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">상품명</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">카테고리</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-gray-600">가격</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-gray-600">재고</th>
                <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ product.barcode }}
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">
                    {{ product.name }}
                  </div>
                  <div v-if="product.nameEn" class="text-xs text-gray-400">
                    {{ product.nameEn }}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ getCategoryName(product.categoryId) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-gray-800">
                  {{ formatPrice(product.sellPrice) }}
                </td>
                <td class="px-4 py-3 text-right text-sm">
                  <span :class="product.stock > 0 ? 'text-green-600' : 'text-red-500'">
                    {{ product.stock }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-block rounded-full px-2 py-1 text-xs font-medium"
                    :class="
                      product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    "
                  >
                    {{ product.isActive ? "판매중" : "숨김" }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    class="mr-2 text-sm text-blue-500 hover:underline"
                    @click="openEditProductForm(product)"
                  >
                    수정
                  </button>
                  <button
                    class="text-sm text-red-500 hover:underline"
                    @click="deleteProduct(product)"
                  >
                    삭제
                  </button>
                </td>
              </tr>
              <tr v-if="products.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                  등록된 상품이 없습니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Categories Tab -->
      <template v-else-if="currentTab === 'categories'">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-800">카테고리 목록 ({{ categories.length }}개)</h2>
          <button
            class="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            @click="openAddCategoryForm"
          >
            + 카테고리 추가
          </button>
        </div>

        <div class="overflow-hidden rounded-lg bg-white shadow">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">순서</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">카테고리명</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">영문명</th>
                <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ category.sortOrder }}
                </td>
                <td class="px-4 py-3 font-medium text-gray-800">
                  {{ category.name }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ category.nameEn ?? "-" }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-block rounded-full px-2 py-1 text-xs font-medium"
                    :class="
                      category.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    "
                  >
                    {{ category.isActive ? "활성" : "비활성" }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    class="mr-2 text-sm text-blue-500 hover:underline"
                    @click="openEditCategoryForm(category)"
                  >
                    수정
                  </button>
                  <button
                    class="text-sm text-red-500 hover:underline"
                    @click="deleteCategory(category)"
                  >
                    삭제
                  </button>
                </td>
              </tr>
              <tr v-if="categories.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                  등록된 카테고리가 없습니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Orders Tab -->
      <template v-else-if="currentTab === 'orders'">
        <div class="rounded-lg bg-white p-8 text-center shadow">
          <p class="text-gray-500">주문 내역 기능 준비 중...</p>
        </div>
      </template>

      <!-- Settings Tab -->
      <template v-else-if="currentTab === 'settings'">
        <div class="rounded-lg bg-white p-8 text-center shadow">
          <p class="text-gray-500">설정 기능 준비 중...</p>
        </div>
      </template>
    </main>

    <!-- Product Form Modal -->
    <div
      v-if="showProductForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showProductForm = false"
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-bold text-gray-800">
          {{ editingProduct ? "상품 수정" : "상품 추가" }}
        </h3>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">바코드 *</label>
              <input
                v-model="productForm.barcode"
                type="text"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="상품 바코드"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">카테고리 *</label>
              <select
                v-model="productForm.categoryId"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">상품명 (한글) *</label>
              <input
                v-model="productForm.name"
                type="text"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="상품명"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">상품명 (영문)</label>
              <input
                v-model="productForm.nameEn"
                type="text"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Product Name"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">판매가 *</label>
              <input
                v-model.number="productForm.sellPrice"
                type="number"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">원가</label>
              <input
                v-model.number="productForm.costPrice"
                type="number"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-600">재고</label>
              <input
                v-model.number="productForm.stock"
                type="number"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-600">이미지 URL</label>
            <input
              v-model="productForm.imageUrl"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-600">설명</label>
            <textarea
              v-model="productForm.description"
              rows="2"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="상품 설명"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50"
            @click="showProductForm = false"
          >
            취소
          </button>
          <button
            class="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            @click="saveProduct"
          >
            저장
          </button>
        </div>
      </div>
    </div>

    <!-- Category Form Modal -->
    <div
      v-if="showCategoryForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCategoryForm = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-bold text-gray-800">
          {{ editingCategory ? "카테고리 수정" : "카테고리 추가" }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-600">카테고리명 (한글) *</label>
            <input
              v-model="categoryForm.name"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="카테고리명"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-600">카테고리명 (영문)</label>
            <input
              v-model="categoryForm.nameEn"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Category Name"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-600">정렬 순서</label>
            <input
              v-model.number="categoryForm.sortOrder"
              type="number"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="1"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50"
            @click="showCategoryForm = false"
          >
            취소
          </button>
          <button
            class="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            @click="saveCategory"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
