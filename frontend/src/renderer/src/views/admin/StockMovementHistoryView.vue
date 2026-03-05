<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import type { StockMovement, StockMovementType } from "@/types";
import { apiClient } from "@/services/api/client";
import { formatPrice } from "@/utils/format";

const route = useRoute();

const movements = ref<StockMovement[]>([]);
const isLoading = ref(false);

// 필터
const filterProductId = ref<number | "">("");
const filterProductName = ref("");
const filterType = ref<StockMovementType | "">("");

// 날짜 범위 (기본: 이번 달)
const now = new Date();
const startDate = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
const endDate = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
);

const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
});

const typeConfig: Record<StockMovementType, { label: string; bg: string; text: string }> = {
  PURCHASE_IN: { label: "매입입고", bg: "bg-green-100", text: "text-green-700" },
  PURCHASE_CANCEL: { label: "매입취소", bg: "bg-red-100", text: "text-red-700" },
  ADJUSTMENT: { label: "재고조정", bg: "bg-blue-100", text: "text-blue-700" },
  SYNC: { label: "재고동기화", bg: "bg-purple-100", text: "text-purple-700" },
  SALE_OUT: { label: "판매출고", bg: "bg-orange-100", text: "text-orange-700" },
  SALE_CANCEL: { label: "판매취소", bg: "bg-pink-100", text: "text-pink-700" },
};

const reasonLabels: Record<string, string> = {
  inventory_check: "재고실사",
  damage: "파손/폐기",
  gift: "증정/샘플",
  sync: "동기화",
  order_paid: "주문결제",
  order_cancelled: "주문취소",
  etc: "기타",
};

// 재고조정 상세 모달
interface AdjustmentDetail {
  adjustmentCode: string;
  reason: string;
  memo: string | null;
  createdBy: string | null;
  createdAt: string;
  items: StockMovement[];
}

const adjustmentDetail = ref<AdjustmentDetail | null>(null);
const isLoadingDetail = ref(false);

async function openAdjustmentDetail(code: string): Promise<void> {
  isLoadingDetail.value = true;
  adjustmentDetail.value = null;
  try {
    const res = await apiClient.get<{ success: boolean; data: AdjustmentDetail }>(
      `/api/v1/stock-movements/adjustment/${encodeURIComponent(code)}`,
    );
    if (res.data.success) {
      adjustmentDetail.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load adjustment detail:", err);
  } finally {
    isLoadingDetail.value = false;
  }
}

function closeAdjustmentDetail(): void {
  adjustmentDetail.value = null;
}

// 매입 상세 모달
interface PurchaseItem {
  id: number;
  quantity: number;
  unitPrice: string;
  amount: string;
  purchaseProduct: {
    id: number;
    barcode: string;
    name: string;
    sellPrice: string;
    costPrice: string;
  };
}

interface PurchaseDetail {
  id: number;
  purchaseCode: string;
  status: string;
  totalAmount: string;
  memo?: string;
  createdAt: string;
  supplier?: { id: number; code: string; name: string; type: string };
  items: PurchaseItem[];
}

const purchaseDetail = ref<PurchaseDetail | null>(null);
const isLoadingPurchase = ref(false);

async function openPurchaseDetail(purchaseId: number): Promise<void> {
  isLoadingPurchase.value = true;
  purchaseDetail.value = null;
  try {
    const res = await apiClient.get<{ success: boolean; data: PurchaseDetail }>(
      `/api/v1/purchases/${purchaseId}`,
    );
    if (res.data.success) {
      purchaseDetail.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load purchase detail:", err);
  } finally {
    isLoadingPurchase.value = false;
  }
}

function closePurchaseDetail(): void {
  purchaseDetail.value = null;
}

// 주문 상세 모달
interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  product?: { id: number; name: string; barcode?: string };
}

interface OrderPayment {
  id: string;
  method: string;
  amount: number;
  status: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  orderType?: string;
  tableNo?: number;
  kioskId?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  items: OrderItem[];
  payments: OrderPayment[];
}

const orderDetail = ref<OrderDetail | null>(null);
const isLoadingOrder = ref(false);

async function openOrderDetail(orderId: string): Promise<void> {
  isLoadingOrder.value = true;
  orderDetail.value = null;
  try {
    const res = await apiClient.get<{ success: boolean; data: OrderDetail }>(
      `/api/v1/orders/${orderId}`,
    );
    if (res.data.success) {
      orderDetail.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load order detail:", err);
  } finally {
    isLoadingOrder.value = false;
  }
}

function closeOrderDetail(): void {
  orderDetail.value = null;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "대기",
    PAID: "결제완료",
    PREPARING: "준비중",
    COMPLETED: "완료",
    CANCELLED: "취소",
    DRAFT: "임시저장",
    CONFIRMED: "확정",
  };
  return labels[status] ?? status;
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    CONFIRMED: "bg-green-100 text-green-700",
    PAID: "bg-blue-100 text-blue-700",
    PREPARING: "bg-amber-100 text-amber-700",
    DRAFT: "bg-slate-100 text-slate-700",
    CANCELLED: "bg-red-100 text-red-700",
    PENDING: "bg-slate-100 text-slate-700",
  };
  return styles[status] ?? "bg-slate-100 text-slate-700";
}

function getOrderTypeLabel(type?: string): string {
  if (!type) return "-";
  const labels: Record<string, string> = { DINE_IN: "매장", TAKEOUT: "포장" };
  return labels[type] ?? type;
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = { CARD: "카드", CASH: "현금", TRANSFER: "계좌이체" };
  return labels[method] ?? method;
}

async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(pagination.value.page));
    params.set("limit", String(pagination.value.limit));
    if (filterProductId.value) params.set("productId", String(filterProductId.value));
    if (filterType.value) params.set("type", filterType.value);
    if (startDate.value) params.set("startDate", startDate.value);
    if (endDate.value) params.set("endDate", endDate.value);

    const res = await apiClient.get<{
      success: boolean;
      data: StockMovement[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/api/v1/stock-movements?${params.toString()}`);

    if (res.data.success) {
      movements.value = res.data.data;
      pagination.value = { ...pagination.value, ...res.data.pagination };
    }
  } catch (err) {
    console.error("Failed to load stock movements:", err);
  } finally {
    isLoading.value = false;
  }
}

function applyFilter(): void {
  pagination.value.page = 1;
  loadData();
}

function goPage(page: number): void {
  pagination.value.page = page;
  loadData();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatQty(qty: number): string {
  return qty > 0 ? `+${qty}` : String(qty);
}

// URL 쿼리 파라미터에서 productId, productName 읽기
onMounted(() => {
  if (route.query.productId) {
    filterProductId.value = parseInt(route.query.productId as string, 10);
  }
  if (route.query.productName) {
    filterProductName.value = decodeURIComponent(route.query.productName as string);
  }
  loadData();
});

// 요약 통계
const stats = computed(() => {
  const purchaseIn = movements.value.filter((m) => m.type === "PURCHASE_IN").length;
  const purchaseCancel = movements.value.filter((m) => m.type === "PURCHASE_CANCEL").length;
  const adjustment = movements.value.filter((m) => m.type === "ADJUSTMENT").length;
  const saleOut = movements.value.filter((m) => m.type === "SALE_OUT").length;
  const saleCancel = movements.value.filter((m) => m.type === "SALE_CANCEL").length;
  const sync = movements.value.filter((m) => m.type === "SYNC").length;
  return { purchaseIn, purchaseCancel, adjustment, saleOut, saleCancel, sync };
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">재고이동이력</h2>
      <p class="mt-0.5 text-sm text-slate-500">재고 변동 이력을 조회합니다</p>
    </div>

    <!-- 요약 카드 -->
    <div class="grid gap-3 md:grid-cols-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-green-600">매입입고</p>
        <p class="mt-1 text-2xl font-bold text-green-600">
          {{ stats.purchaseIn }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-red-600">매입취소</p>
        <p class="mt-1 text-2xl font-bold text-red-600">
          {{ stats.purchaseCancel }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-blue-600">재고조정</p>
        <p class="mt-1 text-2xl font-bold text-blue-600">
          {{ stats.adjustment }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-orange-600">판매출고</p>
        <p class="mt-1 text-2xl font-bold text-orange-600">
          {{ stats.saleOut }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-pink-600">판매취소</p>
        <p class="mt-1 text-2xl font-bold text-pink-600">
          {{ stats.saleCancel }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-purple-600">동기화</p>
        <p class="mt-1 text-2xl font-bold text-purple-600">
          {{ stats.sync }}
        </p>
      </div>
    </div>

    <!-- 필터 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <!-- 이동유형 -->
        <div class="w-40">
          <label class="mb-1 block text-xs font-medium text-slate-500">이동유형</label>
          <select
            v-model="filterType"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">전체</option>
            <option value="PURCHASE_IN">매입입고</option>
            <option value="PURCHASE_CANCEL">매입취소</option>
            <option value="ADJUSTMENT">재고조정</option>
            <option value="SALE_OUT">판매출고</option>
            <option value="SALE_CANCEL">판매취소</option>
            <option value="SYNC">재고동기화</option>
          </select>
        </div>

        <!-- 시작일 -->
        <div class="w-40">
          <label class="mb-1 block text-xs font-medium text-slate-500">시작일</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <!-- 종료일 -->
        <div class="w-40">
          <label class="mb-1 block text-xs font-medium text-slate-500">종료일</label>
          <input
            v-model="endDate"
            type="date"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <!-- 상품ID (숨겨진 필터 - URL에서 자동 설정) -->
        <div v-if="filterProductId" class="filter-item-area flex items-center gap-2">
          <label class="mb-1 block text-xs font-medium text-slate-500">필터상품</label>
          <span
            class="span-stock-movement-item rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
          >
            {{ filterProductName || `상품 #${filterProductId}` }}
            <button
              class="text-xs text-slate-400 hover:text-red-500"
              @click="
                filterProductId = '';
                filterProductName = '';
                applyFilter();
              "
            >
              X
            </button>
          </span>
        </div>

        <button
          class="btn-Search rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          @click="applyFilter"
        >
          조회
        </button>
      </div>
    </div>

    <!-- 테이블 -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
        />
      </div>

      <!-- Empty -->
      <div v-else-if="movements.length === 0" class="py-16 text-center">
        <p class="text-slate-400">이력이 없습니다</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                일시
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                상품
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                유형
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                수량
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                변동전 → 변동후
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                사유
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                참조
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                처리자
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="m in movements" :key="m.id" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {{ formatDate(m.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <p class="text-sm font-medium text-slate-800">
                  {{ m.purchaseProduct?.name ?? "-" }}
                </p>
                <p class="font-mono text-xs text-slate-400">
                  {{ m.purchaseProduct?.barcode ?? "" }}
                </p>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="[
                    typeConfig[m.type as StockMovementType]?.bg ?? 'bg-slate-100',
                    typeConfig[m.type as StockMovementType]?.text ?? 'text-slate-700',
                  ]"
                >
                  {{ typeConfig[m.type as StockMovementType]?.label ?? m.type }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span
                  class="text-sm font-semibold"
                  :class="m.quantity > 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ formatQty(m.quantity) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600">
                {{ m.stockBefore }} → {{ m.stockAfter }}
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                <span v-if="m.reason">{{ reasonLabels[m.reason] ?? m.reason }}</span>
                <span v-if="m.memo" class="ml-1 text-xs text-slate-400">({{ m.memo }})</span>
                <span v-if="!m.reason && !m.memo">-</span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                <!-- 매입코드 (클릭 가능) -->
                <button
                  v-if="m.purchase && m.purchaseId"
                  class="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  @click="openPurchaseDetail(m.purchaseId!)"
                >
                  {{ m.purchase.purchaseCode }}
                </button>
                <!-- 재고조정 번호 (클릭 가능) -->
                <button
                  v-else-if="m.adjustmentCode"
                  class="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  @click="openAdjustmentDetail(m.adjustmentCode!)"
                >
                  {{ m.adjustmentCode }}
                </button>
                <!-- 주문번호 (클릭 가능) -->
                <button
                  v-else-if="m.order && m.orderId"
                  class="font-mono text-xs text-orange-600 hover:text-orange-800 hover:underline"
                  @click="openOrderDetail(m.orderId!)"
                >
                  {{ m.order.orderNumber }}
                </button>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                {{ m.createdBy ?? "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션 -->
      <div
        v-if="pagination.totalPages > 1"
        class="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3"
      >
        <p class="text-xs text-slate-500">
          총 {{ pagination.total.toLocaleString() }}건 ({{ pagination.page }}/{{
            pagination.totalPages
          }}
          페이지)
        </p>
        <div class="flex gap-1">
          <button
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
            :disabled="pagination.page <= 1"
            @click="goPage(pagination.page - 1)"
          >
            이전
          </button>
          <button
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
            :disabled="pagination.page >= pagination.totalPages"
            @click="goPage(pagination.page + 1)"
          >
            다음
          </button>
        </div>
      </div>

      <!-- 하단 건수 (단일 페이지) -->
      <div
        v-else-if="movements.length > 0"
        class="border-t border-slate-100 bg-slate-50 px-5 py-2.5"
      >
        <p class="text-xs text-slate-500">총 {{ movements.length }}건</p>
      </div>
    </div>

    <!-- 재고조정 상세 모달 -->
    <Teleport to="body">
      <div
        v-if="adjustmentDetail || isLoadingDetail"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeAdjustmentDetail"
      >
        <div class="mx-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
          <!-- Loading -->
          <div
            v-if="isLoadingDetail && !adjustmentDetail"
            class="flex items-center justify-center py-16"
          >
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
            />
          </div>

          <template v-if="adjustmentDetail">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800">재고조정 상세</h3>
                <p class="font-mono text-sm text-blue-600">
                  {{ adjustmentDetail.adjustmentCode }}
                </p>
              </div>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="closeAdjustmentDetail"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
              <!-- 조정 정보 -->
              <div class="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <span class="text-xs text-slate-500">일시</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ formatDate(adjustmentDetail.createdAt) }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">사유</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ reasonLabels[adjustmentDetail.reason] ?? adjustmentDetail.reason }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">처리자</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ adjustmentDetail.createdBy ?? "-" }}
                  </p>
                </div>
              </div>

              <!-- 메모 -->
              <div v-if="adjustmentDetail.memo" class="mb-4 rounded-lg bg-amber-50 px-4 py-2">
                <span class="text-xs text-slate-500">메모: </span>
                <span class="text-sm text-slate-700">{{ adjustmentDetail.memo }}</span>
              </div>

              <!-- 조정 상품 목록 -->
              <h4 class="mb-2 text-sm font-bold text-slate-700">
                조정 상품 ({{ adjustmentDetail.items.length }}건)
              </h4>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-xs text-slate-500">
                    <th class="pb-2 text-left">상품명</th>
                    <th class="pb-2 text-right">조정수량</th>
                    <th class="pb-2 text-center">변동전 → 변동후</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in adjustmentDetail.items" :key="item.id">
                    <td class="py-2">
                      <p class="text-slate-800">
                        {{ item.purchaseProduct?.name ?? "-" }}
                      </p>
                      <p class="font-mono text-xs text-slate-400">
                        {{ item.purchaseProduct?.barcode ?? "" }}
                      </p>
                    </td>
                    <td class="py-2 text-right">
                      <span
                        class="font-semibold"
                        :class="item.quantity > 0 ? 'text-green-600' : 'text-red-600'"
                      >
                        {{ formatQty(item.quantity) }}
                      </span>
                    </td>
                    <td class="py-2 text-center text-slate-600">
                      {{ item.stockBefore }} → {{ item.stockAfter }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="border-t border-slate-200 px-6 py-4">
              <button
                class="w-full rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
                @click="closeAdjustmentDetail"
              >
                닫기
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- 매입 상세 모달 -->
    <Teleport to="body">
      <div
        v-if="purchaseDetail || isLoadingPurchase"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closePurchaseDetail"
      >
        <div class="mx-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
          <div
            v-if="isLoadingPurchase && !purchaseDetail"
            class="flex items-center justify-center py-16"
          >
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            />
          </div>

          <template v-if="purchaseDetail">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800">매입 상세</h3>
                <p class="font-mono text-sm text-indigo-600">
                  {{ purchaseDetail.purchaseCode }}
                </p>
              </div>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="closePurchaseDetail"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div class="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <span class="text-xs text-slate-500">일시</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ formatDate(purchaseDetail.createdAt) }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">상태</span>
                  <p>
                    <span
                      class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="getStatusStyle(purchaseDetail.status)"
                    >
                      {{ getStatusLabel(purchaseDetail.status) }}
                    </span>
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">거래처</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ purchaseDetail.supplier?.name ?? "-" }}
                  </p>
                </div>
              </div>

              <div v-if="purchaseDetail.memo" class="mb-4 rounded-lg bg-amber-50 px-4 py-2">
                <span class="text-xs text-slate-500">메모: </span>
                <span class="text-sm text-slate-700">{{ purchaseDetail.memo }}</span>
              </div>

              <h4 class="mb-2 text-sm font-bold text-slate-700">
                매입 상품 ({{ purchaseDetail.items.length }}건)
              </h4>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-xs text-slate-500">
                    <th class="pb-2 text-left">상품명</th>
                    <th class="pb-2 text-right">단가</th>
                    <th class="pb-2 text-center">수량</th>
                    <th class="pb-2 text-right">소계</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in purchaseDetail.items" :key="item.id">
                    <td class="py-2">
                      <p class="text-slate-800">
                        {{ item.purchaseProduct.name }}
                      </p>
                      <p class="font-mono text-xs text-slate-400">
                        {{ item.purchaseProduct.barcode }}
                      </p>
                    </td>
                    <td class="py-2 text-right text-slate-600">
                      {{ formatPrice(item.unitPrice) }}
                    </td>
                    <td class="py-2 text-center text-slate-600">
                      {{ item.quantity }}
                    </td>
                    <td class="py-2 text-right font-medium text-slate-800">
                      {{ formatPrice(item.amount) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-slate-300">
                    <td colspan="3" class="py-2 text-right font-bold text-slate-700">합계</td>
                    <td class="py-2 text-right text-base font-bold text-indigo-600">
                      {{ formatPrice(purchaseDetail.totalAmount) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Footer -->
            <div class="border-t border-slate-200 px-6 py-4">
              <button
                class="w-full rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
                @click="closePurchaseDetail"
              >
                닫기
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- 주문 상세 모달 -->
    <Teleport to="body">
      <div
        v-if="orderDetail || isLoadingOrder"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeOrderDetail"
      >
        <div class="mx-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
          <div v-if="isLoadingOrder && !orderDetail" class="flex items-center justify-center py-16">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
            />
          </div>

          <template v-if="orderDetail">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800">주문 상세</h3>
                <p class="font-mono text-sm text-orange-600">
                  {{ orderDetail.orderNumber }}
                </p>
              </div>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="closeOrderDetail"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div class="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <span class="text-xs text-slate-500">주문일시</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ formatDate(orderDetail.createdAt) }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">상태</span>
                  <p>
                    <span
                      class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="getStatusStyle(orderDetail.status)"
                    >
                      {{ getStatusLabel(orderDetail.status) }}
                    </span>
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">주문유형</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ getOrderTypeLabel(orderDetail.orderType) }}
                    <span v-if="orderDetail.tableNo" class="ml-1 text-xs text-slate-500"
                      >(테이블 {{ orderDetail.tableNo }}번)</span
                    >
                  </p>
                </div>
                <div>
                  <span class="text-xs text-slate-500">기기ID</span>
                  <p class="text-sm font-medium text-slate-800">
                    {{ orderDetail.kioskId ?? "-" }}
                  </p>
                </div>
              </div>

              <h4 class="mb-2 text-sm font-bold text-slate-700">
                주문 상품 ({{ orderDetail.items.length }}건)
              </h4>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-xs text-slate-500">
                    <th class="pb-2 text-left">상품명</th>
                    <th class="pb-2 text-right">단가</th>
                    <th class="pb-2 text-center">수량</th>
                    <th class="pb-2 text-right">소계</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in orderDetail.items" :key="item.id">
                    <td class="py-2 text-slate-800">
                      {{ item.name }}
                    </td>
                    <td class="py-2 text-right text-slate-600">
                      {{ formatPrice(item.price) }}
                    </td>
                    <td class="py-2 text-center text-slate-600">
                      {{ item.quantity }}
                    </td>
                    <td class="py-2 text-right font-medium text-slate-800">
                      {{ formatPrice(item.price * item.quantity) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-slate-300">
                    <td colspan="3" class="py-2 text-right font-bold text-slate-700">합계</td>
                    <td class="py-2 text-right text-base font-bold text-orange-600">
                      {{ formatPrice(orderDetail.totalAmount) }}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- 결제 정보 -->
              <div v-if="orderDetail.payments && orderDetail.payments.length > 0" class="mt-4">
                <h4 class="mb-2 text-sm font-bold text-slate-700">결제 정보</h4>
                <div class="space-y-2">
                  <div
                    v-for="payment in orderDetail.payments"
                    :key="payment.id"
                    class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-medium text-slate-800">{{
                        getPaymentMethodLabel(payment.method)
                      }}</span>
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="
                          payment.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ payment.status === "APPROVED" ? "승인" : payment.status }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-slate-800">{{
                      formatPrice(payment.amount)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-slate-200 px-6 py-4">
              <button
                class="w-full rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
                @click="closeOrderDetail"
              >
                닫기
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style lang="css" scoped>
.btn-Search {
  margin-left: auto;
}
.filter-item-area {
  flex-direction: column;
  align-items: self-start;
}
.span-stock-movement-item {
  font-size: 1rem;
  line-height: 28px;
}
.span-stock-movement-item button {
  color: #000;
  font-size: 1.2rem;
}
</style>
