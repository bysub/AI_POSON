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
    return products.value.filter((p) => p.categoryId === selectedCategoryId.value);
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
      error.value = "카테고리를 불러오는데 실패했습니다";
      console.error("Failed to fetch categories:", err);

      // 오프라인 또는 에러 시 기본 데이터 사용
      categories.value = getDefaultCategories();
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
      error.value = "상품을 불러오는데 실패했습니다";
      console.error("Failed to fetch products:", err);

      // 오프라인 또는 에러 시 기본 데이터 사용
      products.value = getDefaultProducts();
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

  /**
   * 기본 카테고리 데이터 (오프라인용)
   */
  function getDefaultCategories(): Category[] {
    return [
      { id: 1, name: "추천 메뉴", nameEn: "Recommended", sortOrder: 1, isActive: true },
      { id: 2, name: "세트 메뉴", nameEn: "Set Menu", sortOrder: 2, isActive: true },
      { id: 3, name: "단품", nameEn: "Single Items", sortOrder: 3, isActive: true },
      { id: 4, name: "사이드", nameEn: "Sides", sortOrder: 4, isActive: true },
      { id: 5, name: "음료", nameEn: "Drinks", sortOrder: 5, isActive: true },
    ];
  }

  /**
   * 기본 상품 데이터 (오프라인용)
   */
  function getDefaultProducts(): Product[] {
    return [
      {
        id: 1,
        barcode: "001",
        name: "불고기버거 세트",
        nameEn: "Bulgogi Burger Set",
        sellPrice: 8500,
        categoryId: 2,
        stock: 10,
        isActive: true,
      },
      {
        id: 2,
        barcode: "002",
        name: "치킨버거 세트",
        nameEn: "Chicken Burger Set",
        sellPrice: 7500,
        categoryId: 2,
        stock: 10,
        isActive: true,
      },
      {
        id: 3,
        barcode: "003",
        name: "불고기버거",
        nameEn: "Bulgogi Burger",
        sellPrice: 5500,
        categoryId: 3,
        stock: 10,
        isActive: true,
      },
      {
        id: 4,
        barcode: "004",
        name: "치킨버거",
        nameEn: "Chicken Burger",
        sellPrice: 5000,
        categoryId: 3,
        stock: 8,
        isActive: true,
      },
      {
        id: 5,
        barcode: "005",
        name: "감자튀김 (대)",
        nameEn: "French Fries (L)",
        sellPrice: 3000,
        categoryId: 4,
        stock: 20,
        isActive: true,
      },
      {
        id: 6,
        barcode: "006",
        name: "감자튀김 (중)",
        nameEn: "French Fries (M)",
        sellPrice: 2500,
        categoryId: 4,
        stock: 20,
        isActive: true,
      },
      {
        id: 7,
        barcode: "007",
        name: "콜라 (대)",
        nameEn: "Cola (L)",
        sellPrice: 2500,
        categoryId: 5,
        stock: 30,
        isActive: true,
      },
      {
        id: 8,
        barcode: "008",
        name: "콜라 (중)",
        nameEn: "Cola (M)",
        sellPrice: 2000,
        categoryId: 5,
        stock: 30,
        isActive: true,
      },
      {
        id: 9,
        barcode: "009",
        name: "사이다 (대)",
        nameEn: "Sprite (L)",
        sellPrice: 2500,
        categoryId: 5,
        stock: 30,
        isActive: true,
      },
    ];
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
