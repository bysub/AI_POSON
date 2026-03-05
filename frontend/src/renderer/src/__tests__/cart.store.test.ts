import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCartStore } from "@/stores/cart";
import type { Product } from "@/types";

// apiClient 모킹
vi.mock("@/services/api/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// settings store 모킹
vi.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({ deviceId: "TEST-KIOSK" }),
}));

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    barcode: "1234567890",
    name: "아메리카노",
    sellPrice: 4500,
    isDiscount: false,
    status: "SELLING",
    isActive: true,
    ...overrides,
  };
}

describe("useCartStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // ── 초기 상태 ──
  describe("초기 상태", () => {
    it("장바구니가 비어 있어야 함", () => {
      const cart = useCartStore();
      expect(cart.items).toEqual([]);
      expect(cart.isEmpty).toBe(true);
      expect(cart.totalItems).toBe(0);
      expect(cart.totalAmount).toBe(0);
    });
  });

  // ── addItem ──
  describe("addItem", () => {
    it("상품을 추가하면 장바구니에 들어감", () => {
      const cart = useCartStore();
      const product = createProduct();

      cart.addItem(product);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe(1);
      expect(cart.items[0].name).toBe("아메리카노");
      expect(cart.items[0].price).toBe(4500);
      expect(cart.items[0].quantity).toBe(1);
      expect(cart.isEmpty).toBe(false);
    });

    it("수량을 지정하여 추가", () => {
      const cart = useCartStore();
      cart.addItem(createProduct(), 3);

      expect(cart.items[0].quantity).toBe(3);
      expect(cart.totalItems).toBe(3);
    });

    it("동일 상품 재추가 시 수량 증가", () => {
      const cart = useCartStore();
      const product = createProduct();

      cart.addItem(product, 1);
      cart.addItem(product, 2);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(3);
    });

    it("옵션이 다르면 별도 항목으로 추가", () => {
      const cart = useCartStore();
      const product = createProduct();

      cart.addItem(product, 1, { shot: "extra" });
      cart.addItem(product, 1, { shot: "none" });

      expect(cart.items).toHaveLength(2);
    });

    it("할인가 상품은 discountPrice 사용", () => {
      const cart = useCartStore();
      const product = createProduct({ isDiscount: true, discountPrice: 3000 });

      cart.addItem(product);

      expect(cart.items[0].price).toBe(3000);
    });

    it("할인 없는 상품은 sellPrice 사용", () => {
      const cart = useCartStore();
      const product = createProduct({ isDiscount: false, sellPrice: 5000 });

      cart.addItem(product);

      expect(cart.items[0].price).toBe(5000);
    });

    it("다국어 이름 필드가 전달됨", () => {
      const cart = useCartStore();
      const product = createProduct({
        nameEn: "Americano",
        nameJa: "アメリカーノ",
        nameZh: "美式咖啡",
      });

      cart.addItem(product);

      expect(cart.items[0].nameEn).toBe("Americano");
      expect(cart.items[0].nameJa).toBe("アメリカーノ");
      expect(cart.items[0].nameZh).toBe("美式咖啡");
    });
  });

  // ── totalAmount ──
  describe("totalAmount", () => {
    it("여러 상품의 합계 계산", () => {
      const cart = useCartStore();
      cart.addItem(createProduct({ id: 1, sellPrice: 4500 }), 2); // 9000
      cart.addItem(createProduct({ id: 2, sellPrice: 3000 }), 1); // 3000

      expect(cart.totalAmount).toBe(12000);
    });
  });

  // ── updateQuantity ──
  describe("updateQuantity", () => {
    it("수량 변경", () => {
      const cart = useCartStore();
      cart.addItem(createProduct());
      const itemId = cart.items[0].id;

      cart.updateQuantity(itemId, 5);

      expect(cart.items[0].quantity).toBe(5);
    });

    it("수량 0 이하면 항목 제거", () => {
      const cart = useCartStore();
      cart.addItem(createProduct());
      const itemId = cart.items[0].id;

      cart.updateQuantity(itemId, 0);

      expect(cart.items).toHaveLength(0);
    });

    it("존재하지 않는 ID는 무시", () => {
      const cart = useCartStore();
      cart.addItem(createProduct());

      cart.updateQuantity("non-existent-id", 10);

      expect(cart.items[0].quantity).toBe(1);
    });
  });

  // ── removeItem ──
  describe("removeItem", () => {
    it("항목 제거", () => {
      const cart = useCartStore();
      cart.addItem(createProduct());
      const itemId = cart.items[0].id;

      cart.removeItem(itemId);

      expect(cart.items).toHaveLength(0);
      expect(cart.isEmpty).toBe(true);
    });

    it("존재하지 않는 ID 제거는 무시", () => {
      const cart = useCartStore();
      cart.addItem(createProduct());

      cart.removeItem("non-existent-id");

      expect(cart.items).toHaveLength(1);
    });
  });

  // ── clear ──
  describe("clear", () => {
    it("장바구니 초기화", () => {
      const cart = useCartStore();
      cart.addItem(createProduct({ id: 1 }));
      cart.addItem(createProduct({ id: 2 }));

      cart.clear();

      expect(cart.items).toHaveLength(0);
      expect(cart.isEmpty).toBe(true);
      expect(cart.totalItems).toBe(0);
      expect(cart.totalAmount).toBe(0);
      expect(cart.currentOrder).toBeNull();
      expect(cart.orderError).toBeNull();
    });
  });

  // ── submitOrder ──
  describe("submitOrder", () => {
    it("빈 장바구니 주문 시 에러", async () => {
      const cart = useCartStore();

      const result = await cart.submitOrder();

      expect(result).toBeNull();
      expect(cart.orderError).toBe("장바구니가 비어 있습니다");
    });

    it("주문 성공 시 currentOrder 저장", async () => {
      const { apiClient } = await import("@/services/api/client");
      const mockOrder = {
        id: "order-1",
        orderNumber: "001",
        totalAmount: 4500,
        status: "PENDING",
        items: [],
      };
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockOrder },
      });

      const cart = useCartStore();
      cart.addItem(createProduct());

      const result = await cart.submitOrder({ orderType: "DINE_IN" });

      expect(result).toEqual(mockOrder);
      expect(cart.currentOrder).toEqual(mockOrder);
      expect(cart.isSubmitting).toBe(false);
    });

    it("주문 실패 시 에러 메시지 저장", async () => {
      const { apiClient } = await import("@/services/api/client");
      vi.mocked(apiClient.post).mockRejectedValue(new Error("Network error"));

      const cart = useCartStore();
      cart.addItem(createProduct());

      const result = await cart.submitOrder();

      expect(result).toBeNull();
      expect(cart.orderError).toBe("Network error");
      expect(cart.isSubmitting).toBe(false);
    });

    it("서버 success:false 응답 처리", async () => {
      const { apiClient } = await import("@/services/api/client");
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: false },
      });

      const cart = useCartStore();
      cart.addItem(createProduct());

      const result = await cart.submitOrder();

      expect(result).toBeNull();
      expect(cart.orderError).toBe("주문 생성에 실패했습니다");
    });
  });
});
