<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Product } from "@/types";
import type { SupportedLocale } from "@/stores/locale";

const props = defineProps<{
  products: Product[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  addToCart: [product: Product];
  showOptions: [product: Product];
}>();

const { locale, t } = useI18n();

/**
 * 현재 언어에 맞는 상품 이름 반환
 */
function getProductName(product: Product): string {
  const currentLocale = locale.value as SupportedLocale;

  switch (currentLocale) {
    case "en":
      return product.nameEn || product.name;
    case "ja":
      return product.nameJa || product.name;
    case "zh":
      return product.nameZh || product.name;
    default:
      return product.name;
  }
}

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 상품 클릭 핸들러
 */
function handleProductClick(product: Product): void {
  if (product.stock <= 0) return;

  // 옵션이 있는 상품은 옵션 모달 표시
  if (product.options && product.options.length > 0) {
    emit("showOptions", product);
  } else {
    emit("addToCart", product);
  }
}

/**
 * 품절 여부
 */
function isSoldOut(product: Product): boolean {
  return product.stock <= 0;
}
</script>

<template>
  <main class="flex-1 overflow-y-auto bg-gray-50 p-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
        />
        <span class="text-kiosk-base text-gray-600">{{ t("common.loading") }}</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="flex h-full items-center justify-center">
      <p class="text-kiosk-lg text-gray-500">상품이 없습니다</p>
    </div>

    <!-- Product Grid -->
    <div v-else class="menu-grid">
      <article
        v-for="product in products"
        :key="product.id"
        class="group relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-200"
        :class="[
          isSoldOut(product)
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]',
        ]"
        @click="handleProductClick(product)"
      >
        <!-- Product Image -->
        <div class="relative aspect-square bg-gray-200">
          <img
            v-if="product.imageUrl"
            :src="product.imageUrl"
            :alt="getProductName(product)"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
          >
            <span class="text-4xl text-gray-400">{{ getProductName(product).charAt(0) }}</span>
          </div>

          <!-- Sold Out Overlay -->
          <div
            v-if="isSoldOut(product)"
            class="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <span class="rounded-lg bg-red-600 px-4 py-2 text-kiosk-lg font-bold text-white">
              {{ t("menu.soldOut") }}
            </span>
          </div>

          <!-- Options Badge -->
          <div
            v-if="product.options && product.options.length > 0 && !isSoldOut(product)"
            class="absolute right-2 top-2 rounded-full bg-primary-600 px-2 py-1 text-xs font-medium text-white"
          >
            옵션
          </div>
        </div>

        <!-- Product Info -->
        <div class="p-4">
          <h3 class="mb-2 line-clamp-2 text-kiosk-base font-medium leading-tight text-gray-900">
            {{ getProductName(product) }}
          </h3>

          <p class="text-kiosk-lg font-bold text-primary-600">
            {{ formatPrice(product.sellPrice) }}
            <span class="text-kiosk-sm font-normal">원</span>
          </p>
        </div>

        <!-- Quick Add Button (visible on hover, desktop only) -->
        <div
          v-if="!isSoldOut(product)"
          class="absolute bottom-0 left-0 right-0 translate-y-full bg-primary-600 py-3 text-center text-white transition-transform duration-200 group-hover:translate-y-0"
        >
          <span class="text-kiosk-base font-medium">{{ t("menu.addToCart") }}</span>
        </div>
      </article>
    </div>
  </main>
</template>
