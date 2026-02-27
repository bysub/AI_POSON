<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { getLocalizedName } from "@/utils/i18n";
import { formatPrice } from "@/utils/format";

const { locale, t } = useI18n();
const cartStore = useCartStore();

const emit = defineEmits<{
  proceed: [];
  cancel: [];
}>();

function getOptionsString(options?: Record<string, unknown>): string {
  if (!options) return "";
  return Object.values(options)
    .map((opt: Record<string, unknown>) => opt.name)
    .filter(Boolean)
    .join(" + ");
}
</script>

<template>
  <footer class="flex gap-4 bg-cream p-4">
    <!-- Order Summary (Left) -->
    <div class="flex-1 rounded-2xl border-2 border-red-400 bg-white p-4">
      <h2 class="mb-3 text-base font-bold text-red-500">
        {{ t("cart.orderSummary") }}
      </h2>

      <div
        v-if="cartStore.isEmpty"
        class="py-4 text-center text-sm text-gray-400"
      >
        {{ t("cart.empty") }}
      </div>

      <div
        v-else
        class="max-h-48 space-y-2 overflow-y-auto"
      >
        <div
          v-for="item in cartStore.items"
          :key="item.id"
          class="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"
        >
          <div class="cart-store-product-name flex-1">
            <span class="text-gray-800">{{ getLocalizedName(item, locale) }}</span>
            <span
              v-if="item.options"
              class="text-xs text-gray-500"
            >
              {{ getOptionsString(item.options) ? " + " + getOptionsString(item.options) : "" }}
            </span>
          </div>

          <!-- Quantity Controls -->
          <div class="flex items-center gap-2">
            <button
              class="product-area-minus flex h-6 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
            >
              -
            </button>
            <span class="text-order-summany-quantity w-6 text-center font-medium">{{
              item.quantity
            }}</span>
            <button
              class="product-area-plus flex h-6 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
            >
              +
            </button>
            <button
              class="product-area-close ml-2 text-gray-400 hover:text-red-500"
              @click="cartStore.removeItem(item.id)"
            >
              ✕
            </button>
            <span
              class="text-order-summany-amount ml-2 mr-2 w-20 text-right text-xs text-gray-500"
            >
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
        <p class="mt-8 text-3xl font-bold text-gray-900">
          {{ formatPrice(cartStore.totalAmount) }}
        </p>
      </div>

      <div class="mt-8 space-y-2">
        <button
          class="w-full rounded-full bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          :disabled="cartStore.isEmpty"
          @click="emit('proceed')"
        >
          {{ t("cart.proceedToPayment") }}
        </button>
        <button
          class="flex w-full items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-red-500"
          @click="emit('cancel')"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {{ t("common.cancel") }}
        </button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.text-order-summany-quantity,
.text-order-summany-amount {
  font-weight: 700;
  font-size: var(--kiosk-font-base);
}
.cart-store-product-name span {
  font-size: var(--kiosk-font-base);
}
.product-area-minus,
.product-area-plus {
  font-size: var(--kiosk-font-lg);
  font-weight: 700;
  line-height: 1.2em;
  padding-bottom: 0.25rem;
}
.product-area-close {
  padding: 0.15rem 0.6rem;
  border-radius: 6px;
}
</style>
