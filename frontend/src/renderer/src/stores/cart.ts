import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { CartItem, Product, Order } from "@/types";
import { apiClient } from "@/services/api/client";
import { useSettingsStore } from "./settings";

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);
  const currentOrder = ref<Order | null>(null);
  const isSubmitting = ref(false);
  const orderError = ref<string | null>(null);

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

  const totalAmount = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  const isEmpty = computed(() => items.value.length === 0);

  function addItem(product: Product, quantity: number = 1, options?: Record<string, unknown>) {
    const existingItem = items.value.find(
      (item) =>
        item.productId === product.id && JSON.stringify(item.options) === JSON.stringify(options),
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const effectivePrice =
        product.isDiscount && product.discountPrice ? product.discountPrice : product.sellPrice;
      items.value.push({
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        quantity,
        options,
        imageUrl: product.imageUrl,
      });
    }
  }

  function updateQuantity(itemId: string, quantity: number) {
    const item = items.value.find((i) => i.id === itemId);
    if (item) {
      if (quantity <= 0) {
        removeItem(itemId);
      } else {
        item.quantity = quantity;
      }
    }
  }

  function removeItem(itemId: string) {
    const index = items.value.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      items.value.splice(index, 1);
    }
  }

  function clear() {
    items.value = [];
    currentOrder.value = null;
    orderError.value = null;
  }

  /**
   * 주문 생성 (서버 전송)
   */
  async function submitOrder(kioskId?: string): Promise<Order | null> {
    if (items.value.length === 0) {
      orderError.value = "장바구니가 비어 있습니다";
      return null;
    }

    isSubmitting.value = true;
    orderError.value = null;

    try {
      const orderItems = items.value.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        options: item.options ?? null,
      }));

      const settingsStore = useSettingsStore();
      const resolvedKioskId = (kioskId ?? settingsStore.deviceId) || "KIOSK-001";

      const response = await apiClient.post<{ success: boolean; data: Order }>("/api/v1/orders", {
        items: orderItems,
        kioskId: resolvedKioskId,
      });

      if (response.data.success) {
        currentOrder.value = response.data.data;
        return response.data.data;
      }

      orderError.value = "주문 생성에 실패했습니다";
      return null;
    } catch (error) {
      console.error("Failed to submit order:", error);
      orderError.value = error instanceof Error ? error.message : "주문 생성에 실패했습니다";
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * 현재 주문 조회
   */
  async function getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Order }>(
        `/api/v1/orders/${orderId}`,
      );

      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  return {
    // State
    items,
    currentOrder,
    isSubmitting,
    orderError,

    // Getters
    totalItems,
    totalAmount,
    isEmpty,

    // Actions
    addItem,
    updateQuantity,
    removeItem,
    clear,
    submitOrder,
    getOrder,
  };
});
