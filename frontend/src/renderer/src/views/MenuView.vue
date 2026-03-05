<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { useProductsStore } from "@/stores/products";
import { useSettingsStore } from "@/stores/settings";
import { useTTS } from "@/composables/useTTS";
import { useVoiceCommand } from "@/composables/useVoiceCommand";
import { OptionModal } from "@/components";
import CategorySidebar from "@/components/kiosk/CategorySidebar.vue";
import CartSummary from "@/components/kiosk/CartSummary.vue";
import type { Product, ProductOption, Category } from "@/types";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName } from "@/utils/i18n";
import { formatPrice } from "@/utils/format";

const router = useRouter();
const { locale, t } = useI18n();
const cartStore = useCartStore();
const productsStore = useProductsStore();
const settingsStore = useSettingsStore();
const tts = useTTS();
const voiceCommand = useVoiceCommand();

// 장바구니 aria-live 안내 메시지
const cartAnnouncement = ref("");

// 옵션 모달 상태
const showOptionModal = ref(false);
const selectedProduct = ref<Product | null>(null);

// 토스트 알림 상태
const showToast = ref(false);
const toastMessage = ref("");
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * 카테고리 선택
 */
function handleCategorySelect(categoryId: number | null): void {
  productsStore.selectCategory(categoryId);
  // TTS: 선택된 카테고리명 발화
  const cat = categoriesWithAll.value.find((c) =>
    categoryId === null ? c.id === 0 : c.id === categoryId,
  );
  if (cat) tts.speak(getLocalizedName(cat, locale.value), { fallbackText: cat.name });
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
    const name = getLocalizedName(product, locale.value);
    const price = Number(product.discountPrice || product.sellPrice).toLocaleString();
    // 현지화 이름이 없으면 (한국어 fallback) 전체 메시지를 한국어로 발화
    // 일본어/중국어 TTS에서 한국어 상품명이 무음 처리되는 문제 방지
    const hasLocalizedName =
      locale.value === "ko" ||
      (locale.value === "en" && !!product.nameEn) ||
      (locale.value === "ja" && !!product.nameJa) ||
      (locale.value === "zh" && !!product.nameZh);
    if (hasLocalizedName) {
      tts.speak(t("a11y.tts.cartAdded", { name, count: 1, price }), {
        fallbackKey: "a11y.tts.cartAdded",
        fallbackParams: { name: product.name, count: 1, price },
      });
    } else {
      // 현지화 이름 없음 → 한국어로 전체 메시지 발화
      tts.speak(
        t("a11y.tts.cartAdded", { name: product.name, count: 1, price }, { locale: "ko" }),
      );
    }
    cartAnnouncement.value = t("a11y.tts.cartAdded", { name, count: 1, price });
    showAddedToast(name);
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

  const separator = t("option.optionSeparator");
  const optionNames = Object.values(selectedOptions)
    .map((o) => o.name)
    .join(separator);
  const displayName = optionNames
    ? t("option.withOptions", { name: getLocalizedName(product, locale.value), options: optionNames })
    : getLocalizedName(product, locale.value);
  const price = (
    Number(productWithOptions.discountPrice || productWithOptions.sellPrice) * quantity
  ).toLocaleString();
  const koDisplayName = optionNames
    ? t("option.withOptions", { name: product.name, options: optionNames }, { locale: "ko" })
    : product.name;
  const hasLocalizedNameOpt =
    locale.value === "ko" ||
    (locale.value === "en" && !!product.nameEn) ||
    (locale.value === "ja" && !!product.nameJa) ||
    (locale.value === "zh" && !!product.nameZh);
  if (hasLocalizedNameOpt) {
    tts.speak(t("a11y.tts.cartAdded", { name: displayName, count: quantity, price }), {
      fallbackKey: "a11y.tts.cartAdded",
      fallbackParams: { name: koDisplayName, count: quantity, price },
    });
  } else {
    tts.speak(
      t("a11y.tts.cartAdded", { name: koDisplayName, count: quantity, price }, { locale: "ko" }),
    );
  }
  cartAnnouncement.value = t("a11y.tts.cartAdded", { name: displayName, count: quantity, price });
  showAddedToast(displayName);

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

// 장바구니 삭제 시에만 TTS 안내 (추가는 handleAddToCart에서 직접 발화)
watch(
  () => cartStore.totalItems,
  (newCount, oldCount) => {
    if (oldCount !== undefined && newCount < oldCount) {
      const msg = t("a11y.tts.cartUpdated", {
        count: newCount,
        total: cartStore.totalAmount.toLocaleString(),
      });
      tts.speak(msg);
      cartAnnouncement.value = msg;
    }
  },
);

// 초기 데이터 로드
onMounted(async () => {
  await productsStore.initialize();
  // 전체 표시를 위해 카테고리 선택 해제
  productsStore.selectCategory(null);
  // TTS 메뉴 안내
  tts.speak(t("a11y.tts.menuGuide"));
});
</script>

<template>
  <div class="flex h-full flex-col" style="background: var(--theme-bg, #FDF9F3)">
    <!-- Screen Reader + TTS aria-live 공지 영역 -->
    <div
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ cartAnnouncement }}
    </div>

    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 shadow-sm" style="background: var(--theme-surface, #fff)">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
        :style="{ borderColor: 'var(--theme-primary, #8E3524)', color: 'var(--theme-primary, #8E3524)' }"
        @click="router.push('/')"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <h1 class="text-xl font-bold" style="color: var(--theme-text, #111827)">
        {{ settingsStore.get("biz.name") || "POSON Kiosk" }}
      </h1>

      <div class="w-10" />
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Category Sidebar -->
      <CategorySidebar
        :categories="categoriesWithAll"
        :selected-id="effectiveSelectedId"
        @select="handleCategorySelect"
      />

      <!-- Product Grid -->
      <main class="flex-1 overflow-y-auto p-4">
        <!-- Loading State -->
        <div
          v-if="productsStore.isLoading"
          class="flex h-full items-center justify-center"
        >
          <div
            class="h-10 w-10 animate-spin rounded-full border-4"
            style="border-color: var(--theme-border, #e2e8f0); border-top-color: var(--theme-primary, #8E3524)"
          />
        </div>

        <!-- Products -->
        <div
          v-else
          class="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        >
          <article
            v-for="product in productsStore.filteredProducts"
            :key="product.id"
            role="button"
            :tabindex="isUnavailable(product) ? -1 : 0"
            :aria-label="`${getLocalizedName(product, locale.value)}, ${formatPrice(Number(product.discountPrice || product.sellPrice))}${isUnavailable(product) ? ', ' + (product.status === 'PENDING' ? t('menu.preparing') : t('menu.soldOut')) : ''}`"
            class="group relative flex flex-col overflow-hidden rounded-2xl shadow-sm transition-all"
            style="background: var(--theme-surface, #fff)"
            :class="[
              isUnavailable(product) ? 'opacity-60' : 'cursor-pointer hover:shadow-lg',
              voiceCommand.highlightedProductId.value === product.id ? 'voice-highlight' : '',
            ]"
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
            <div class="relative aspect-square" style="background: var(--theme-bg-secondary, #f5ede0)">
              <img
                v-if="product.imageUrl"
                :src="getImageSrc(product.imageUrl)"
                :alt="getLocalizedName(product, locale.value)"
                class="border-add-area h-full w-full object-cover"
              >
              <div
                v-else
                class="border-add-area flex h-full w-full items-center justify-center text-4xl text-gray-300"
              >
                {{ getLocalizedName(product, locale.value).charAt(0) }}
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
              <h3 class="mb-1 line-clamp-1 text-sm font-bold" style="color: var(--theme-text, #111827)">
                {{ getLocalizedName(product, locale.value) }}
              </h3>
              <!-- 할인 상품: 원가 취소선 + 할인가 표시 -->
              <template v-if="product.isDiscount && product.discountPrice">
                <p class="text-xs line-through" style="color: var(--theme-text-muted, #94a3b8)">
                  {{ formatPrice(product.sellPrice) }}
                </p>
                <p class="text-base font-bold" style="color: var(--theme-primary, #8E3524)">
                  {{ formatPrice(product.discountPrice) }}
                </p>
              </template>
              <!-- 일반 상품: 판매가 표시 -->
              <p
                v-else
                class="text-base font-bold"
                style="color: var(--theme-primary, #8E3524)"
              >
                {{ formatPrice(product.sellPrice) }}
              </p>
            </div>

            <!-- Add Button -->
            <button
              v-if="!isUnavailable(product)"
              class="flex items-center justify-center gap-1 py-2.5 text-sm font-medium text-white transition-colors"
              style="background: var(--theme-primary, #ef4444)"
              @click.stop="handleAddToCart(product)"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
    <CartSummary
      @proceed="goToPayment"
      @cancel="cancelOrder"
    />

    <!-- Toast Notification -->
    <Transition name="slide-fade">
      <div
        v-if="showToast"
        class="fixed right-4 top-16 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg"
        style="background: var(--theme-success, #22c55e)"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
        <button
          class="ml-2 opacity-70 hover:opacity-100"
          @click="showToast = false"
        >
          ✕
        </button>
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
.icon-sale-badge {
  font-size: var(--kiosk-font-base);
}
.span-unavailable-overlay {
  font-size: var(--kiosk-font-2xl);
  text-align: center;
  padding: 0.5em;
}
.border-add-area {
  border: 2px solid #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
.voice-highlight {
  outline: 3px solid #22c55e;
  outline-offset: 2px;
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
  animation: voice-highlight-pulse 0.6s ease-in-out 2;
}
@keyframes voice-highlight-pulse {
  0%,
  100% {
    outline-color: #22c55e;
  }
  50% {
    outline-color: #86efac;
  }
}
</style>
