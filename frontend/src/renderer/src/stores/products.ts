import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Category, Product } from "@/types";
import { apiClient } from "@/services/api/client";

export const useProductsStore = defineStore("products", () => {
  const categories = ref<Category[]>([]);
  const products = ref<Product[]>([]);
  const selectedCategoryId = ref<number | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 선택된 카테고리의 상품 목록
  const filteredProducts = computed(() => {
    if (!selectedCategoryId.value) {
      return products.value;
    }
    return products.value.filter((p) =>
      p.categories?.some((c) => c.id === selectedCategoryId.value),
    );
  });

  // 활성 카테고리만
  const activeCategories = computed(() => categories.value.filter((c) => c.isActive));

  /**
   * 카테고리 목록 조회
   */
  async function fetchCategories(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiClient.get<{ success: boolean; data: Category[] }>(
        "/api/v1/categories",
      );

      if (response.data.success) {
        categories.value = response.data.data;
      }
    } catch (err) {
      error.value = "카테고리를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.";
      console.error("Failed to fetch categories:", err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 상품 목록 조회
   */
  async function fetchProducts(categoryId?: number): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const params = categoryId ? { categoryId } : {};
      const response = await apiClient.get<{ success: boolean; data: Product[] }>(
        "/api/v1/products",
        {
          params,
        },
      );

      if (response.data.success) {
        products.value = response.data.data;
      }
    } catch (err) {
      error.value = "상품을 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.";
      console.error("Failed to fetch products:", err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 바코드로 상품 조회
   */
  async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Product }>(
        `/api/v1/products/barcode/${barcode}`,
      );

      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 카테고리 선택
   */
  function selectCategory(categoryId: number | null): void {
    selectedCategoryId.value = categoryId;
  }

  /**
   * 초기화
   */
  async function initialize(): Promise<void> {
    await Promise.all([fetchCategories(), fetchProducts()]);

    // 첫 번째 카테고리 자동 선택
    if (categories.value.length > 0 && !selectedCategoryId.value) {
      selectedCategoryId.value = categories.value[0].id;
    }
  }

  return {
    // State
    categories,
    products,
    selectedCategoryId,
    isLoading,
    error,

    // Getters
    filteredProducts,
    activeCategories,

    // Actions
    fetchCategories,
    fetchProducts,
    fetchProductByBarcode,
    selectCategory,
    initialize,
  };
});
