<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useProductsStore } from "@/stores/products";
import { OptionModal } from "@/components";
import type { Product, ProductOption, Category } from "@/types";
import type { SupportedLocale } from "@/stores/locale";

const router = useRouter();
const { locale, t } = useI18n();
const cartStore = useCartStore();
const productsStore = useProductsStore();

// 옵션 모달 상태
const showOptionModal = ref(false);
const selectedProduct = ref<Product | null>(null);

// 토스트 알림 상태
const showToast = ref(false);
const toastMessage = ref("");
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, string> = {
  all: "apps",
  fruit: "nutrition",
  snack: "cookie",
  cigarette: "smoking_rooms",
  drink: "local_cafe",
  default: "restaurant",
};

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return "₩" + new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 현재 언어에 맞는 이름 반환
 */
function getLocalizedName(item: {
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
}): string {
  const currentLocale = locale.value as SupportedLocale;
  switch (currentLocale) {
    case "en":
      return item.nameEn || item.name;
    case "ja":
      return item.nameJa || item.name;
    case "zh":
      return item.nameZh || item.name;
    default:
      return item.name;
  }
}

/**
 * 카테고리 선택
 */
function handleCategorySelect(categoryId: number | null): void {
  productsStore.selectCategory(categoryId);
}

/**
 * 장바구니에 추가
 */
function handleAddToCart(product: Product): void {
  if (product.stock <= 0) return;

  if (product.options && product.options.length > 0) {
    selectedProduct.value = product;
    showOptionModal.value = true;
  } else {
    cartStore.addItem(product);
    showAddedToast(product.name);
  }
}

/**
 * 옵션 선택 완료
 */
function handleOptionConfirm(
  product: Product,
  quantity: number,
  selectedOptions: Record<string, ProductOption>,
): void {
  const optionsPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0);
  const productWithOptions = {
    ...product,
    sellPrice: product.sellPrice + optionsPrice,
  };

  const optionsData = Object.entries(selectedOptions).reduce(
    (acc, [key, opt]) => {
      acc[key] = { id: opt.id, name: opt.name, price: opt.price };
      return acc;
    },
    {} as Record<string, unknown>,
  );

  cartStore.addItem(productWithOptions, quantity, optionsData);

  const optionNames = Object.values(selectedOptions)
    .map((o) => o.name)
    .join(" + ");
  showAddedToast(`${product.name}${optionNames ? " + " + optionNames : ""}`);

  showOptionModal.value = false;
  selectedProduct.value = null;
}

/**
 * 토스트 알림 표시
 */
function showAddedToast(productName: string): void {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastMessage.value = productName;
  showToast.value = true;

  toastTimeout = setTimeout(() => {
    showToast.value = false;
  }, 2500);
}

/**
 * 결제 페이지로 이동
 */
function goToPayment(): void {
  if (!cartStore.isEmpty) {
    router.push("/payment");
  }
}

/**
 * 주문 취소
 */
function cancelOrder(): void {
  cartStore.clear();
  router.push("/");
}

/**
 * 옵션 문자열 생성
 */
function getOptionsString(options?: Record<string, unknown>): string {
  if (!options) return "";
  return Object.values(options)
    .map((opt: any) => opt.name)
    .filter(Boolean)
    .join(" + ");
}

// ALL 카테고리 포함한 카테고리 목록
const categoriesWithAll = computed(() => {
  const allCategory: Category = {
    id: 0,
    name: "전체",
    nameEn: "ALL",
    nameJa: "全て",
    nameZh: "全部",
    sortOrder: 0,
    isActive: true,
  };
  return [allCategory, ...productsStore.activeCategories];
});

// 선택된 카테고리 ID (null이면 전체)
const effectiveSelectedId = computed(() => productsStore.selectedCategoryId ?? 0);

// 초기 데이터 로드
onMounted(async () => {
  await productsStore.initialize();
  // 전체 표시를 위해 카테고리 선택 해제
  productsStore.selectCategory(null);
});
</script>

<template>
  <div class="flex h-full flex-col bg-cream">
    <!-- Header -->
    <header class="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-white"
        @click="router.push('/')"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <h1 class="text-xl font-bold text-gray-900">POSON Kiosk</h1>

      <div class="w-10" />
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Category Sidebar -->
      <aside class="flex w-20 flex-col items-center gap-2 overflow-y-auto bg-white py-4 shadow-sm">
        <button
          v-for="category in categoriesWithAll"
          :key="category.id"
          class="flex w-16 flex-col items-center gap-1 rounded-xl p-2 transition-all"
          :class="[
            effectiveSelectedId === category.id
              ? 'bg-amber-400 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
          @click="handleCategorySelect(category.id === 0 ? null : category.id)"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full"
            :class="effectiveSelectedId === category.id ? 'bg-amber-500' : 'bg-gray-100'"
          >
            <span class="material-symbols-outlined text-xl">
              {{ category.id === 0 ? "apps" : categoryIcons.default }}
            </span>
          </div>
          <span class="text-center text-[11px] font-medium leading-tight">
            {{ getLocalizedName(category) }}
          </span>
        </button>
      </aside>

      <!-- Product Grid -->
      <main class="flex-1 overflow-y-auto p-4">
        <!-- Loading State -->
        <div v-if="productsStore.isLoading" class="flex h-full items-center justify-center">
          <div
            class="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
          />
        </div>

        <!-- Products -->
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <article
            v-for="product in productsStore.filteredProducts"
            :key="product.id"
            class="group relative flex flex-col overflow-hidden rounded-2xl bg-rose-50 shadow-sm transition-all"
            :class="product.stock <= 0 ? 'opacity-60' : 'cursor-pointer hover:shadow-lg'"
          >
            <!-- Sale Badge -->
            <div
              v-if="product.id % 3 === 1"
              class="absolute left-2 top-2 z-10 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white"
            >
              Sale
            </div>

            <!-- Product Image -->
            <div class="relative aspect-square bg-rose-100/50">
              <img
                v-if="product.imageUrl"
                :src="product.imageUrl"
                :alt="getLocalizedName(product)"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-4xl text-gray-300"
              >
                {{ getLocalizedName(product).charAt(0) }}
              </div>

              <!-- Sold Out Overlay -->
              <div
                v-if="product.stock <= 0"
                class="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <span class="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white">
                  {{ t("menu.soldOut") }}
                </span>
              </div>
            </div>

            <!-- Product Info -->
            <div class="flex flex-1 flex-col p-3">
              <h3 class="mb-1 line-clamp-1 text-sm font-medium text-gray-900">
                {{ getLocalizedName(product) }}
              </h3>
              <p class="text-base font-bold text-red-500">
                {{ formatPrice(product.sellPrice) }}
              </p>
            </div>

            <!-- Add Button -->
            <button
              v-if="product.stock > 0"
              class="flex items-center justify-center gap-1 bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 active:bg-red-700"
              @click.stop="handleAddToCart(product)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {{ t("menu.addToCart") }}
            </button>
          </article>
        </div>
      </main>
    </div>

    <!-- Bottom: Order Summary + Total -->
    <footer class="flex gap-4 bg-cream p-4">
      <!-- Order Summary (Left) -->
      <div class="flex-1 rounded-2xl border-2 border-red-400 bg-white p-4">
        <h2 class="mb-3 text-base font-bold text-red-500">
          {{ t("cart.orderSummary") }}
        </h2>

        <div v-if="cartStore.isEmpty" class="py-4 text-center text-sm text-gray-400">
          {{ t("cart.empty") }}
        </div>

        <div v-else class="max-h-32 space-y-2 overflow-y-auto">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"
          >
            <div class="flex-1">
              <span class="text-gray-800">{{ item.name }}</span>
              <span v-if="item.options" class="text-xs text-gray-500">
                {{ getOptionsString(item.options) ? " + " + getOptionsString(item.options) : "" }}
              </span>
            </div>

            <!-- Quantity Controls -->
            <div class="flex items-center gap-2">
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
              >
                -
              </button>
              <span class="w-6 text-center font-medium">{{ item.quantity }}</span>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
              >
                +
              </button>
              <button
                class="ml-2 text-gray-400 hover:text-red-500"
                @click="cartStore.removeItem(item.id)"
              >
                ✕
              </button>
              <span class="ml-2 w-16 text-right text-xs text-gray-500">
                <span class="block text-[10px] text-gray-400">{{
                  t("cart.total").toUpperCase()
                }}</span>
                {{ formatPrice(item.price * item.quantity) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Total & Actions (Right) -->
      <div
        class="flex w-56 flex-col justify-between rounded-2xl border-2 border-red-400 bg-white p-4"
      >
        <div class="text-center">
          <p class="text-sm text-red-500">
            {{ t("cart.totalAmount") }} :
            <span class="font-bold">{{ cartStore.totalItems }} {{ t("cart.items") }}</span>
          </p>
          <p class="text-xs text-gray-400">
            {{ t("cart.total").toUpperCase() }}
          </p>
          <p class="text-3xl font-bold text-gray-900">
            {{ formatPrice(cartStore.totalAmount) }}
          </p>
        </div>

        <div class="space-y-2">
          <button
            class="w-full rounded-full bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            :disabled="cartStore.isEmpty"
            @click="goToPayment"
          >
            {{ t("cart.proceedToPayment") }}
          </button>
          <button
            class="flex w-full items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-red-500"
            @click="cancelOrder"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t("common.cancel") }}
          </button>
        </div>
      </div>
    </footer>

    <!-- Toast Notification -->
    <Transition name="slide-fade">
      <div
        v-if="showToast"
        class="fixed right-4 top-16 z-50 flex items-center gap-3 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <div>
          <p class="font-medium">
            {{ toastMessage }}
          </p>
          <p class="text-sm opacity-90">
            {{ t("cart.added") }}
          </p>
        </div>
        <button class="ml-2 opacity-70 hover:opacity-100" @click="showToast = false">✕</button>
      </div>
    </Transition>

    <!-- Option Modal -->
    <OptionModal
      :product="selectedProduct"
      :is-open="showOptionModal"
      @close="
        showOptionModal = false;
        selectedProduct = null;
      "
      @confirm="handleOptionConfirm"
    />
  </div>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
