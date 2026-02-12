<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCartStore } from "@/stores/cart";
import { getImageSrc } from "@/utils/image";

const router = useRouter();
const { t } = useI18n();
const cartStore = useCartStore();

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}
</script>

<template>
  <div class="flex h-full flex-col bg-kiosk-background">
    <!-- Header -->
    <header class="flex items-center justify-between bg-white p-4 shadow-sm">
      <button class="btn-kiosk-secondary" @click="router.push('/menu')">
        {{ t("common.back") }}
      </button>
      <h1 class="text-kiosk-xl font-bold">
        {{ t("cart.title") }}
      </h1>
      <div class="w-24" />
    </header>

    <!-- Cart items -->
    <main class="flex-1 overflow-y-auto p-4">
      <div v-if="cartStore.isEmpty" class="flex h-full items-center justify-center">
        <p class="text-kiosk-lg text-kiosk-muted">
          {{ t("cart.empty") }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in cartStore.items"
          :key="item.id"
          class="card-kiosk flex items-center gap-4 p-4"
        >
          <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-200">
            <img
              v-if="item.imageUrl"
              :src="getImageSrc(item.imageUrl)"
              :alt="item.name"
              class="h-full w-full rounded-lg object-cover"
            />
          </div>

          <div class="flex-1">
            <h3 class="text-kiosk-base font-medium">
              {{ item.name }}
            </h3>
            <p class="text-kiosk-lg font-bold text-primary-600">
              {{ formatPrice(item.price * item.quantity) }}원
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xl font-bold"
              @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
            >
              −
            </button>
            <span class="w-8 text-center text-kiosk-lg font-medium">{{ item.quantity }}</span>
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xl font-bold"
              @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
            >
              +
            </button>
          </div>

          <button class="text-red-500" @click="cartStore.removeItem(item.id)">✕</button>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white p-4 shadow-lg">
      <div class="mb-4 flex items-center justify-between">
        <span class="text-kiosk-lg text-kiosk-muted">{{ t("cart.total") }}</span>
        <span class="text-kiosk-2xl font-bold">{{ formatPrice(cartStore.totalAmount) }}원</span>
      </div>
      <div class="flex gap-4">
        <button class="btn-kiosk-secondary flex-1" @click="router.push('/menu')">
          {{ t("cart.continueShopping") }}
        </button>
        <button
          class="btn-kiosk-primary flex-1"
          :disabled="cartStore.isEmpty"
          @click="router.push('/payment')"
        >
          {{ t("cart.checkout") }}
        </button>
      </div>
    </footer>
  </div>
</template>
