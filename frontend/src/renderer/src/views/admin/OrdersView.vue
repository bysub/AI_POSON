<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { apiClient } from "@/services/api/client";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  options: Record<string, unknown> | null;
}

interface Order {
  id: string;
  orderNumber: string;
  kioskId: string;
  totalAmount: number;
  status: "PENDING" | "PAID" | "PREPARING" | "COMPLETED" | "CANCELLED";
  memo?: string;
  items: OrderItem[];
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const searchQuery = ref("");
const dateFilter = ref("today");
const orders = ref<Order[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

// 선택된 주문 (상세 보기용)
const selectedOrder = ref<Order | null>(null);
const isDetailModalOpen = ref(false);

// 상태별 스타일
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", label: "대기중" },
  PAID: { bg: "bg-blue-100", text: "text-blue-700", label: "결제완료" },
  PREPARING: { bg: "bg-orange-100", text: "text-orange-700", label: "준비중" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "완료" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "취소" },
};

// 날짜 범위 계산
function getDateRange(): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilter.value) {
    case "today":
      return {
        startDate: today.toISOString(),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    case "week": {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: weekAgo.toISOString(),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    case "month": {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: monthAgo.toISOString(),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    default:
      return {};
  }
}

// 주문 목록 조회
async function fetchOrders(page = 1): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    const dateRange = getDateRange();
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.value.limit.toString(),
    });

    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);

    const response = await apiClient.get<OrdersResponse>(`/api/v1/orders?${params.toString()}`);

    if (response.data.success) {
      orders.value = response.data.data;
      pagination.value = response.data.pagination;
    }
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    error.value = "주문 목록을 불러오는데 실패했습니다";
  } finally {
    isLoading.value = false;
  }
}

// 검색 결과 필터링
const filteredOrders = computed(() => {
  if (!searchQuery.value.trim()) return orders.value;

  const query = searchQuery.value.toLowerCase();
  return orders.value.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(query) ||
      order.kioskId?.toLowerCase().includes(query),
  );
});

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 가격 포맷팅
function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price) + "원";
}

// 주문 상세 보기
function openOrderDetail(order: Order): void {
  selectedOrder.value = order;
  isDetailModalOpen.value = true;
}

// 모달 닫기
function closeDetailModal(): void {
  isDetailModalOpen.value = false;
  selectedOrder.value = null;
}

// 주문 상태 변경
async function updateOrderStatus(
  orderId: string,
  newStatus: "PENDING" | "PAID" | "PREPARING" | "COMPLETED",
): Promise<void> {
  try {
    const response = await apiClient.patch<{ success: boolean }>(
      `/api/v1/orders/${orderId}/status`,
      {
        status: newStatus,
      },
    );

    if (response.data.success) {
      // 목록 새로고침
      await fetchOrders(pagination.value.page);
      // 상세 모달이 열려있으면 업데이트
      if (selectedOrder.value?.id === orderId) {
        const updated = orders.value.find((o) => o.id === orderId);
        if (updated) selectedOrder.value = updated;
      }
    }
  } catch (err) {
    console.error("Failed to update order status:", err);
    alert("주문 상태 변경에 실패했습니다");
  }
}

// 주문 취소
async function cancelOrder(orderId: string): Promise<void> {
  if (!confirm("정말로 이 주문을 취소하시겠습니까?")) return;

  try {
    const response = await apiClient.delete<{ success: boolean }>(`/api/v1/orders/${orderId}`);

    if (response.data.success) {
      closeDetailModal();
      await fetchOrders(pagination.value.page);
    }
  } catch (err) {
    console.error("Failed to cancel order:", err);
    alert("주문 취소에 실패했습니다");
  }
}

// 페이지 변경
function goToPage(page: number): void {
  if (page < 1 || page > pagination.value.totalPages) return;
  fetchOrders(page);
}

// 날짜 필터 변경 시 재조회
watch(dateFilter, () => {
  fetchOrders(1);
});

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  fetchOrders();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">주문 내역</h2>
        <p class="mt-1 text-sm text-slate-500">
          키오스크 주문 내역을 확인합니다
          <span v-if="pagination.total > 0" class="font-medium text-slate-700">
            (총 {{ pagination.total }}건)
          </span>
        </p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="dateFilter"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="today">오늘</option>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
          <option value="all">전체</option>
        </select>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-700 transition-all hover:bg-slate-200"
          @click="fetchOrders(pagination.page)"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로고침
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg
        class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="주문번호로 검색..."
        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700"
    >
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"
      />
      <span class="ml-3 text-slate-600">불러오는 중...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
    >
      <div
        class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"
      >
        <svg class="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-slate-700">주문 내역이 없습니다</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{
          searchQuery ? "검색 결과가 없습니다" : "키오스크에서 주문이 들어오면 여기에 표시됩니다"
        }}
      </p>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-4">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
        @click="openOrderDetail(order)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-bold text-slate-800">#{{ order.orderNumber }}</h3>
              <span
                :class="[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  statusStyles[order.status]?.bg,
                  statusStyles[order.status]?.text,
                ]"
              >
                {{ statusStyles[order.status]?.label ?? order.status }}
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-500">
              {{ formatDate(order.createdAt) }} · {{ order.kioskId ?? "키오스크" }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-emerald-600">
              {{ formatPrice(order.totalAmount) }}
            </p>
            <p class="text-sm text-slate-500">{{ order.items?.length ?? 0 }}개 상품</p>
          </div>
        </div>

        <!-- 상품 미리보기 -->
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="item in order.items?.slice(0, 3)"
            :key="item.id"
            class="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600"
          >
            {{ item.name }} x{{ item.quantity }}
          </span>
          <span
            v-if="(order.items?.length ?? 0) > 3"
            class="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500"
          >
            +{{ (order.items?.length ?? 0) - 3 }}개 더
          </span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex items-center justify-center gap-2">
      <button
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        이전
      </button>
      <span class="px-4 text-sm text-slate-600">
        {{ pagination.page }} / {{ pagination.totalPages }}
      </span>
      <button
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        다음
      </button>
    </div>

    <!-- Order Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isDetailModalOpen && selectedOrder"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeDetailModal"
        >
          <div
            class="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <!-- Header -->
            <header
              class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4"
            >
              <div>
                <h2 class="text-xl font-bold text-slate-800">
                  주문 #{{ selectedOrder.orderNumber }}
                </h2>
                <p class="text-sm text-slate-500">
                  {{ formatDate(selectedOrder.createdAt) }}
                </p>
              </div>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-md hover:bg-slate-100"
                @click="closeDetailModal"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            <!-- Content -->
            <div class="max-h-[60vh] overflow-y-auto p-6">
              <!-- Status & Info -->
              <div class="mb-6 flex items-center justify-between">
                <span
                  :class="[
                    'rounded-full px-4 py-2 text-sm font-semibold',
                    statusStyles[selectedOrder.status]?.bg,
                    statusStyles[selectedOrder.status]?.text,
                  ]"
                >
                  {{ statusStyles[selectedOrder.status]?.label ?? selectedOrder.status }}
                </span>
                <span class="text-sm text-slate-500">
                  키오스크: {{ selectedOrder.kioskId ?? "-" }}
                </span>
              </div>

              <!-- Items -->
              <div class="mb-6">
                <h3 class="mb-3 font-semibold text-slate-700">주문 상품</h3>
                <div class="space-y-3">
                  <div
                    v-for="item in selectedOrder.items"
                    :key="item.id"
                    class="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                  >
                    <div>
                      <p class="font-medium text-slate-800">
                        {{ item.name }}
                      </p>
                      <p class="text-sm text-slate-500">
                        {{ formatPrice(item.price) }} x {{ item.quantity }}
                      </p>
                    </div>
                    <p class="font-semibold text-slate-800">
                      {{ formatPrice(item.price * item.quantity) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="rounded-xl bg-emerald-50 p-4">
                <div class="flex items-center justify-between">
                  <span class="text-lg font-semibold text-slate-700">총 금액</span>
                  <span class="text-xl font-bold text-emerald-600">
                    {{ formatPrice(selectedOrder.totalAmount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Footer: Actions -->
            <footer class="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div class="flex gap-3">
                <!-- Status Change Buttons -->
                <template v-if="!['COMPLETED', 'CANCELLED'].includes(selectedOrder.status)">
                  <button
                    v-if="selectedOrder.status === 'PENDING'"
                    class="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                    @click="updateOrderStatus(selectedOrder.id, 'PAID')"
                  >
                    결제완료 처리
                  </button>
                  <button
                    v-if="selectedOrder.status === 'PAID'"
                    class="flex-1 rounded-xl bg-orange-600 py-3 font-semibold text-white transition-colors hover:bg-orange-700"
                    @click="updateOrderStatus(selectedOrder.id, 'PREPARING')"
                  >
                    준비중으로 변경
                  </button>
                  <button
                    v-if="selectedOrder.status === 'PREPARING'"
                    class="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
                    @click="updateOrderStatus(selectedOrder.id, 'COMPLETED')"
                  >
                    완료 처리
                  </button>
                  <button
                    class="rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50"
                    @click="cancelOrder(selectedOrder.id)"
                  >
                    취소
                  </button>
                </template>
                <button
                  v-else
                  class="w-full rounded-xl bg-slate-200 py-3 font-semibold text-slate-600"
                  @click="closeDetailModal"
                >
                  닫기
                </button>
              </div>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
