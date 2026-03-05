<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName } from "@/utils/i18n";
import type { CartItem } from "@/types";
import { formatNumber as formatPrice } from "@/utils/format";

const { locale, t } = useI18n();
const cartStore = useCartStore();

defineProps<{
  showCheckout?: boolean;
}>();

const emit = defineEmits<{
  checkout: [];
  continueShopping: [];
}>();

/**
 * 수량 증가
 */
function incrementQuantity(itemId: string, currentQuantity: number): void {
  cartStore.updateQuantity(itemId, currentQuantity + 1);
}

/**
 * 수량 감소
 */
function decrementQuantity(itemId: string, currentQuantity: number): void {
  cartStore.updateQuantity(itemId, currentQuantity - 1);
}

/**
 * 아이템 삭제
 */
function removeItem(itemId: string): void {
  cartStore.removeItem(itemId);
}

function itemName(item: CartItem): string {
  return getLocalizedName(item, locale.value);
}
</script>

<template>
  <div class="flex h-full flex-col" style="background: var(--theme-surface, #fff)">
    <!-- Header -->
    <header class="border-b px-6 py-4" style="border-color: var(--theme-border, #e5e7eb)">
      <h2 class="text-kiosk-xl font-bold" style="color: var(--theme-text, #111827)">
        {{ t("cart.title") }}
        <span v-if="cartStore.totalItems > 0" style="color: var(--theme-primary, #8E3524)">
          ({{ cartStore.totalItems }})
        </span>
      </h2>
    </header>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Empty Cart -->
      <div
        v-if="cartStore.isEmpty"
        class="flex h-full flex-col items-center justify-center gap-4"
        style="color: var(--theme-text-muted, #9ca3af)"
      >
        <svg class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p class="text-kiosk-lg">
          {{ t("cart.empty") }}
        </p>
      </div>

      <!-- Cart Items List -->
      <ul v-else class="space-y-4">
        <li
          v-for="item in cartStore.items"
          :key="item.id"
          class="flex gap-4 rounded-xl p-4"
          style="background: var(--theme-bg-secondary, #f9fafb)"
        >
          <!-- Item Image -->
          <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg" style="background: var(--theme-bg-secondary, #e5e7eb)">
            <img
              v-if="item.imageUrl"
              :src="getImageSrc(item.imageUrl)"
              :alt="itemName(item)"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-2xl"
              style="color: var(--theme-text-muted, #9ca3af)"
            >
              {{ itemName(item).charAt(0) }}
            </div>
          </div>

          <!-- Item Info -->
          <div class="flex flex-1 flex-col justify-between">
            <div>
              <h3 class="text-kiosk-base font-medium" style="color: var(--theme-text, #111827)">
                {{ itemName(item) }}
              </h3>
              <p class="text-kiosk-sm" style="color: var(--theme-text-secondary, #6b7280)">
                {{ formatPrice(item.price) }}{{ t("common.currency") }}
              </p>
            </div>

            <!-- Quantity Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold transition-colors"
                  style="background: var(--theme-bg-secondary, #e5e7eb); color: var(--theme-text, #111827)"
                  @click="decrementQuantity(item.id, item.quantity)"
                >
                  -
                </button>
                <span class="w-12 text-center text-kiosk-lg font-bold">
                  {{ item.quantity }}
                </span>
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold transition-colors"
                  style="background: var(--theme-primary, #8E3524); color: var(--theme-primary-text, #fff)"
                  @click="incrementQuantity(item.id, item.quantity)"
                >
                  +
                </button>
              </div>

              <!-- Remove Button -->
              <button
                class="text-kiosk-sm"
                style="color: var(--theme-error, #ef4444)"
                @click="removeItem(item.id)"
              >
                {{ t("cart.delete") }}
              </button>
            </div>
          </div>

          <!-- Item Total -->
          <div class="flex flex-col items-end justify-center">
            <span class="text-kiosk-lg font-bold" style="color: var(--theme-primary, #8E3524)">
              {{ formatPrice(item.price * item.quantity) }}{{ t("common.currency") }}
            </span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Footer -->
    <footer class="border-t p-6" style="border-color: var(--theme-border, #e5e7eb); background: var(--theme-bg-secondary, #f9fafb)">
      <!-- Total -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-kiosk-lg" style="color: var(--theme-text-secondary, #4b5563)">{{ t("cart.total") }}</span>
        <span class="text-kiosk-2xl font-bold" style="color: var(--theme-primary, #8E3524)">
          {{ formatPrice(cartStore.totalAmount) }}
          <span class="text-kiosk-lg font-normal">{{ t("common.currency") }}</span>
        </span>
      </div>

      <!-- Action Buttons -->
      <div v-if="showCheckout" class="flex gap-3">
        <button class="btn-kiosk-secondary flex-1" @click="emit('continueShopping')">
          {{ t("cart.continueShopping") }}
        </button>
        <button
          class="btn-kiosk-primary flex-1"
          :disabled="cartStore.isEmpty"
          @click="emit('checkout')"
        >
          {{ t("cart.checkout") }}
        </button>
      </div>
    </footer>
  </div>
</template>
