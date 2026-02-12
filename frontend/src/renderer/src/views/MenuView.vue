<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useProductsStore } from "@/stores/products";
import { useSettingsStore } from "@/stores/settings";
import { OptionModal } from "@/components";
import type { Product, ProductOption, Category } from "@/types";
import type { SupportedLocale } from "@/stores/locale";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName as getLocalizedItemName } from "@/utils/i18n";

const router = useRouter();
const { locale, t } = useI18n();
const cartStore = useCartStore();
const productsStore = useProductsStore();
const settingsStore = useSettingsStore();

// 옵션 모달 상태
const showOptionModal = ref(false);
const selectedProduct = ref<Product | null>(null);

// 토스트 알림 상태
const showToast = ref(false);
const toastMessage = ref("");
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// 아이콘 색상 맵
const iconColors: Record<string, { bg: string; text: string }> = {
  tag: { bg: "bg-purple-100", text: "text-purple-600" },
  coffee: { bg: "bg-amber-100", text: "text-amber-700" },
  drink: { bg: "bg-blue-100", text: "text-blue-600" },
  food: { bg: "bg-orange-100", text: "text-orange-600" },
  dessert: { bg: "bg-pink-100", text: "text-pink-600" },
  bread: { bg: "bg-yellow-100", text: "text-yellow-700" },
  ice: { bg: "bg-cyan-100", text: "text-cyan-600" },
  salad: { bg: "bg-green-100", text: "text-green-600" },
  pizza: { bg: "bg-red-100", text: "text-red-600" },
  burger: { bg: "bg-orange-100", text: "text-orange-700" },
  noodle: { bg: "bg-amber-100", text: "text-amber-600" },
  rice: { bg: "bg-emerald-100", text: "text-emerald-600" },
  apps: { bg: "bg-amber-400", text: "text-white" },
};

/**
 * 이미지 URL에서 아이콘 ID 추출
 */
function getIconFromUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return "tag";
  if (imageUrl.startsWith("icon:")) {
    return imageUrl.replace("icon:", "");
  }
  return "custom";
}

/**
 * 프리셋 아이콘인지 확인
 */
function isPresetIcon(imageUrl: string | undefined): boolean {
  return !imageUrl || imageUrl.startsWith("icon:");
}

function getIconColors(iconId: string): { bg: string; text: string } {
  return iconColors[iconId] || iconColors.tag;
}

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
 * 상품 재고 확인 (매입상품 연결 시 해당 재고, 미연결 시 무제한)
 */
function getStock(product: Product): number {
  return product.purchaseProduct?.stock ?? Infinity;
}

function isUnavailable(product: Product): boolean {
  if (product.status === "SOLD_OUT" || product.status === "PENDING") return true;
  return getStock(product) <= 0;
}

/**
 * 장바구니에 추가
 */
function handleAddToCart(product: Product): void {
  if (isUnavailable(product)) return;

  if (product.options && product.options.length > 0) {
    selectedProduct.value = product;
    showOptionModal.value = true;
  } else {
    cartStore.addItem(product);
    showAddedToast(getLocalizedName(product));
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
  const optionsPrice = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + Number(opt.price),
    0,
  );
  const productWithOptions = {
    ...product,
    sellPrice: Number(product.sellPrice) + optionsPrice,
    discountPrice: product.discountPrice ? Number(product.discountPrice) + optionsPrice : undefined,
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
  showAddedToast(`${getLocalizedName(product)}${optionNames ? " + " + optionNames : ""}`);

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
    router.push("/order-confirm");
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
    .map((opt: Record<string, unknown>) => opt.name)
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

      <h1 class="text-xl font-bold text-gray-900">
        {{ settingsStore.get("biz.name") || "POSON Kiosk" }}
      </h1>

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
          <!-- 전체 카테고리 (apps 아이콘) -->
          <div
            v-if="category.id === 0"
            class="flex h-10 w-10 items-center justify-center rounded-full"
            :class="effectiveSelectedId === 0 ? 'bg-amber-500' : 'bg-gray-100'"
          >
            <svg
              class="h-5 w-5"
              :class="effectiveSelectedId === 0 ? 'text-white' : 'text-gray-600'"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
              />
            </svg>
          </div>
          <!-- 프리셋 아이콘 -->
          <div
            v-else-if="isPresetIcon(category.imageUrl)"
            class="flex h-10 w-10 items-center justify-center rounded-full"
            :class="
              effectiveSelectedId === category.id
                ? 'bg-amber-500'
                : getIconColors(getIconFromUrl(category.imageUrl)).bg
            "
          >
            <!-- Coffee -->
            <svg
              v-if="getIconFromUrl(category.imageUrl) === 'coffee'"
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('coffee').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 8h1a4 4 0 010 8h-1M6 8h12v9a4 4 0 01-4 4H10a4 4 0 01-4-4V8z"
              />
            </svg>
            <!-- Drink -->
            <svg
              v-else-if="getIconFromUrl(category.imageUrl) === 'drink'"
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('drink').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <!-- Food -->
            <svg
              v-else-if="getIconFromUrl(category.imageUrl) === 'food'"
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('food').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <!-- Dessert -->
            <svg
              v-else-if="getIconFromUrl(category.imageUrl) === 'dessert'"
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('dessert').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
              />
            </svg>
            <!-- Bread -->
            <svg
              v-else-if="getIconFromUrl(category.imageUrl) === 'bread'"
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('bread').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <!-- Default Tag -->
            <svg
              v-else
              class="h-5 w-5"
              :class="
                effectiveSelectedId === category.id ? 'text-white' : getIconColors('tag').text
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <!-- 커스텀 이미지 -->
          <div
            v-else
            class="h-10 w-10 overflow-hidden rounded-full"
            :class="effectiveSelectedId === category.id ? 'ring-2 ring-amber-500' : 'bg-gray-100'"
          >
            <img
              :src="getImageSrc(category.imageUrl)"
              :alt="getLocalizedName(category)"
              class="h-full w-full object-cover"
            />
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
            :class="isUnavailable(product) ? 'opacity-60' : 'cursor-pointer hover:shadow-lg'"
            @click="handleAddToCart(product)"
          >
            <!-- Sale Badge -->
            <div
              v-if="product.isDiscount && product.discountPrice"
              class="icon-sale-badge absolute left-2 top-2 z-10 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white"
            >
              Sale
            </div>

            <!-- Product Image -->
            <div class="relative aspect-square bg-rose-100/50">
              <img
                v-if="product.imageUrl"
                :src="getImageSrc(product.imageUrl)"
                :alt="getLocalizedName(product)"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-4xl text-gray-300"
              >
                {{ getLocalizedName(product).charAt(0) }}
              </div>

              <!-- Unavailable Overlay (품절/준비중) -->
              <div
                v-if="isUnavailable(product)"
                class="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <span
                  class="span-unavailable-overlay w-full rounded px-3 py-1 text-sm font-bold text-white"
                  :class="product.status === 'PENDING' ? 'bg-orange-500' : 'bg-gray-600'"
                >
                  {{ product.status === "PENDING" ? t("menu.preparing") : t("menu.soldOut") }}
                </span>
              </div>
            </div>

            <!-- Product Info -->
            <div class="flex flex-1 flex-col p-3">
              <h3 class="mb-1 line-clamp-1 text-sm font-medium text-gray-900">
                {{ getLocalizedName(product) }}
              </h3>
              <!-- 할인 상품: 원가 취소선 + 할인가 표시 -->
              <template v-if="product.isDiscount && product.discountPrice">
                <p class="text-xs text-gray-400 line-through">
                  {{ formatPrice(product.sellPrice) }}
                </p>
                <p class="text-base font-bold text-red-500">
                  {{ formatPrice(product.discountPrice) }}
                </p>
              </template>
              <!-- 일반 상품: 판매가 표시 -->
              <p v-else class="text-base font-bold text-red-500">
                {{ formatPrice(product.sellPrice) }}
              </p>
            </div>

            <!-- Add Button -->
            <button
              v-if="!isUnavailable(product)"
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
              <span class="text-gray-800">{{ getLocalizedItemName(item, locale) }}</span>
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
              <span class="text-order-summany-quantity w-6 text-center font-medium">{{
                item.quantity
              }}</span>
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
              <span
                class="text-order-summany-amount ml-2 mr-2 w-20 text-right text-xs text-gray-500"
              >
                <!--
                <span class="block text-[10px] text-gray-400">{{
                  t("cart.total").toUpperCase()
                }}</span>
                -->
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
.text-order-summany-quantity,
.text-order-summany-amount {
  font-weight: 700;
  font-size: 14px;
}
.icon-sale-badge {
  font-size: 16px;
}
.span-unavailable-overlay {
  font-size: 24px;
  text-align: center;
  padding: 0.5em;
}
</style>
