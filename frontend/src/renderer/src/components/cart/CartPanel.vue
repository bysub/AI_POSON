<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";

const { t } = useI18n();
const cartStore = useCartStore();

defineProps<{
  showCheckout?: boolean;
}>();

const emit = defineEmits<{
  checkout: [];
  continueShopping: [];
}>();

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

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
</script>

<template>
  <div class="flex h-full flex-col bg-white">
    <!-- Header -->
    <header class="border-b border-gray-200 px-6 py-4">
      <h2 class="text-kiosk-xl font-bold text-gray-900">
        {{ t("cart.title") }}
        <span
          v-if="cartStore.totalItems > 0"
          class="text-primary-600"
        >
          ({{ cartStore.totalItems }})
        </span>
      </h2>
    </header>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Empty Cart -->
      <div
        v-if="cartStore.isEmpty"
        class="flex h-full flex-col items-center justify-center gap-4 text-gray-400"
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
      <ul
        v-else
        class="space-y-4"
      >
        <li
          v-for="item in cartStore.items"
          :key="item.id"
          class="flex gap-4 rounded-xl bg-gray-50 p-4"
        >
          <!-- Item Image -->
          <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.name"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-2xl text-gray-400"
            >
              {{ item.name.charAt(0) }}
            </div>
          </div>

          <!-- Item Info -->
          <div class="flex flex-1 flex-col justify-between">
            <div>
              <h3 class="text-kiosk-base font-medium text-gray-900">
                {{ item.name }}
              </h3>
              <p class="text-kiosk-sm text-gray-500">{{ formatPrice(item.price) }}원</p>
            </div>

            <!-- Quantity Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xl font-bold transition-colors hover:bg-gray-300 active:bg-gray-400"
                  @click="decrementQuantity(item.id, item.quantity)"
                >
                  -
                </button>
                <span class="w-12 text-center text-kiosk-lg font-bold">
                  {{ item.quantity }}
                </span>
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white transition-colors hover:bg-primary-700 active:bg-primary-800"
                  @click="incrementQuantity(item.id, item.quantity)"
                >
                  +
                </button>
              </div>

              <!-- Remove Button -->
              <button
                class="text-kiosk-sm text-red-500 hover:text-red-600"
                @click="removeItem(item.id)"
              >
                삭제
              </button>
            </div>
          </div>

          <!-- Item Total -->
          <div class="flex flex-col items-end justify-center">
            <span class="text-kiosk-lg font-bold text-primary-600">
              {{ formatPrice(item.price * item.quantity) }}원
            </span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 bg-gray-50 p-6">
      <!-- Total -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-kiosk-lg text-gray-600">{{ t("cart.total") }}</span>
        <span class="text-kiosk-2xl font-bold text-primary-600">
          {{ formatPrice(cartStore.totalAmount) }}
          <span class="text-kiosk-lg font-normal">원</span>
        </span>
      </div>

      <!-- Action Buttons -->
<<<<<<< ours
      <div v-if="showCheckout" class="flex gap-3">
        <button class="btn-kiosk-secondary flex-1" @click="emit('continueShopping')">
=======
      <div
        v-if="showCheckout"
        class="flex gap-3"
      >
        <button
          class="btn-kiosk-secondary flex-1"
          @click="emit('continueShopping')"
        >
>>>>>>> theirs
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
