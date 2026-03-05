<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { formatPrice } from "@/utils/format";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  product?: { id: number; name: string; barcode?: string };
}

interface Payment {
  id: string;
  paymentType: string;
  amount: number;
  receivedAmount?: number | null;
  status: string;
  approvalNumber?: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  kioskId?: string;
  orderType?: string;
  tableNo?: number;
  memberId?: number;
  memo?: string;
  items?: OrderItem[];
  payments?: Payment[];
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

const orders = ref<Order[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// 기기 이름 맵 (kioskId → name)
const deviceNameMap = ref<Record<string, string>>({});

// 주문 상세 모달
const selectedOrder = ref<Order | null>(null);

// 날짜 필터
// 날짜 범위 (기본: 이번 달)
const now = new Date();
const startDate = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
const endDate = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
);
const today = endDate.value;

// 페이지네이션
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
});

// 합계 계산
const totalSales = computed(() => {
  return orders.value
    .filter((o) => o.status === "COMPLETED" || o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);
});

const totalOrders = computed(() => orders.value.length);
const completedOrders = computed(
  () => orders.value.filter((o) => o.status === "COMPLETED" || o.status === "PAID").length,
);
const cancelledOrders = computed(() => orders.value.filter((o) => o.status === "CANCELLED").length);

async function loadData(): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    });

    if (startDate.value) {
      params.append("startDate", new Date(startDate.value).toISOString());
    }
    if (endDate.value) {
      // 종료일은 해당 일 끝까지 포함
      const end = new Date(endDate.value);
      end.setHours(23, 59, 59, 999);
      params.append("endDate", end.toISOString());
    }

    const res = await apiClient.get<OrdersResponse>(`/api/v1/orders?${params.toString()}`);

    if (res.data.success) {
      orders.value = res.data.data;
      pagination.value = res.data.pagination;
    } else {
      error.value = "데이터를 불러오는데 실패했습니다";
    }
  } catch (err) {
    console.error("Failed to load orders:", err);
    error.value = "매출 내역을 불러오는데 실패했습니다. 로그인 상태를 확인해주세요.";
  } finally {
    isLoading.value = false;
  }
}

function handleSearch(): void {
  pagination.value.page = 1;
  loadData();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "대기",
    PAID: "결제완료",
    PREPARING: "준비중",
    COMPLETED: "완료",
    CANCELLED: "취소",
  };
  return labels[status] ?? status;
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    PAID: "bg-blue-100 text-blue-700",
    PREPARING: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-red-100 text-red-700",
    PENDING: "bg-slate-100 text-slate-700",
  };
  return styles[status] ?? "bg-slate-100 text-slate-700";
}

// 주문유형 라벨
function getOrderTypeLabel(type?: string): string {
  if (!type) return "-";
  const labels: Record<string, string> = { DINE_IN: "매장", TAKEOUT: "포장" };
  return labels[type] ?? type;
}

// 결제수단 라벨
function getPaymentMethodLabel(type: string): string {
  const labels: Record<string, string> = {
    CARD: "카드",
    CASH: "현금",
    TRANSFER: "계좌이체",
    MIXED: "복합결제",
  };
  return labels[type] ?? type;
}

// 결제유형 뱃지 스타일
function getPaymentTypeStyle(type: string): string {
  const styles: Record<string, string> = {
    CARD: "bg-blue-100 text-blue-700",
    CASH: "bg-emerald-100 text-emerald-700",
    MIXED: "bg-purple-100 text-purple-700",
  };
  return styles[type] ?? "bg-slate-100 text-slate-600";
}

// 주문의 대표 결제유형 가져오기
function getOrderPaymentType(order: Order): string | null {
  if (!order.payments || order.payments.length === 0) return null;
  return order.payments[0].paymentType;
}

// 결제상태 라벨
function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    APPROVED: "승인",
    CANCELLED: "취소",
    PENDING: "대기",
    FAILED: "실패",
  };
  return labels[status] ?? status;
}

// 주문 상세 열기
function openDetail(order: Order): void {
  selectedOrder.value = order;
}

// 주문 상세 닫기
function closeDetail(): void {
  selectedOrder.value = null;
}

// 페이지 변경
function goToPage(page: number): void {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  loadData();
}

// 오늘 날짜로 설정
function setToday(): void {
  startDate.value = today;
  endDate.value = today;
  handleSearch();
}

// 이번 주로 설정
function setThisWeek(): void {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  startDate.value = weekStart.toISOString().split("T")[0];
  endDate.value = today;
  handleSearch();
}

// 이번 달로 설정
function setThisMonth(): void {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  startDate.value = monthStart.toISOString().split("T")[0];
  endDate.value = today;
  handleSearch();
}

async function loadDevices(): Promise<void> {
  try {
    const res = await apiClient.get<{ success: boolean; data: { id: string; name: string }[] }>(
      "/api/v1/devices",
    );
    if (res.data.success) {
      deviceNameMap.value = Object.fromEntries(res.data.data.map((d) => [d.id, d.name]));
    }
  } catch {
    // 기기 목록 로드 실패 시 무시 (ID만 표시)
  }
}

function getDeviceLabel(kioskId?: string): string {
  if (!kioskId) return "-";
  const name = deviceNameMap.value[kioskId];
  return name ? `${name} (${kioskId})` : kioskId;
}

onMounted(() => {
  loadDevices();
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매출내역</h2>
        <p class="mt-1 text-sm text-slate-500">매출 내역을 조회하고 관리합니다</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-all hover:bg-slate-200"
        @click="loadData"
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

    <!-- Quick Filters & Date Range -->
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex gap-2">
        <button
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="setToday"
        >
          오늘
        </button>
        <button
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="setThisWeek"
        >
          이번 주
        </button>
        <button
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="setThisMonth"
        >
          이번 달
        </button>
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model="startDate"
          type="date"
          class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <span class="text-slate-400">~</span>
        <input
          v-model="endDate"
          type="date"
          class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          @click="handleSearch"
        >
          조회
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-4 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">총 매출</p>
        <p class="mt-1 text-2xl font-bold text-indigo-600">
          {{ formatPrice(totalSales) }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">총 주문</p>
        <p class="mt-1 text-2xl font-bold text-slate-800">{{ totalOrders }}건</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">완료/결제완료</p>
        <p class="mt-1 text-2xl font-bold text-green-600">{{ completedOrders }}건</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">취소</p>
        <p class="mt-1 text-2xl font-bold text-red-600">{{ cancelledOrders }}건</p>
      </div>
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
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
      />
      <span class="ml-3 text-slate-600">불러오는 중...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orders.length === 0"
      class="rounded-2xl border border-slate-200 bg-white p-12 text-center"
    >
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
      >
        <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-slate-700">해당 기간에 매출 내역이 없습니다</h3>
      <p class="mt-2 text-sm text-slate-500">다른 기간을 선택해보세요</p>
    </div>

    <!-- Orders Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
              주문번호
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">일시</th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              유형
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              상품수
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              결제유형
            </th>
            <th class="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
              금액
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              상태
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="order in orders"
            :key="order.id"
            class="cursor-pointer hover:bg-slate-50"
            @click="openDetail(order)"
          >
            <td class="px-6 py-4">
              <button
                class="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                @click.stop="openDetail(order)"
              >
                {{ order.orderNumber }}
              </button>
            </td>
            <td class="px-6 py-4 text-slate-600">
              {{ formatDate(order.createdAt) }}
            </td>
            <td class="px-6 py-4 text-center text-sm text-slate-600">
              {{ getOrderTypeLabel(order.orderType) }}
            </td>
            <td class="px-6 py-4 text-center text-sm text-slate-600">
              {{ order.items?.length ?? 0 }}건
            </td>
            <td class="px-6 py-4 text-center">
              <span
                v-if="getOrderPaymentType(order)"
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getPaymentTypeStyle(getOrderPaymentType(order)!)"
              >
                {{ getPaymentMethodLabel(getOrderPaymentType(order)!) }}
              </span>
              <span v-else class="text-sm text-slate-400">-</span>
            </td>
            <td class="px-6 py-4 text-right font-semibold text-slate-800">
              {{ formatPrice(order.totalAmount) }}
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getStatusStyle(order.status)"
              >
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
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
        {{ pagination.page }} / {{ pagination.totalPages }} (총 {{ pagination.total }}건)
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
      <div
        v-if="selectedOrder"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeDetail"
      >
        <div class="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-800">주문 상세</h3>
              <p class="text-sm text-slate-500">
                {{ selectedOrder.orderNumber }}
              </p>
            </div>
            <button
              class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              @click="closeDetail"
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

          <!-- Modal Body -->
          <div class="max-h-[70vh] overflow-y-auto px-6 py-4">
            <!-- 주문 정보 -->
            <div class="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
              <div>
                <span class="text-xs text-slate-500">주문일시</span>
                <p class="text-sm font-medium text-slate-800">
                  {{ formatDate(selectedOrder.createdAt) }}
                </p>
              </div>
              <div>
                <span class="text-xs text-slate-500">상태</span>
                <p>
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="getStatusStyle(selectedOrder.status)"
                  >
                    {{ getStatusLabel(selectedOrder.status) }}
                  </span>
                </p>
              </div>
              <div>
                <span class="text-xs text-slate-500">주문유형</span>
                <p class="text-sm font-medium text-slate-800">
                  {{ getOrderTypeLabel(selectedOrder.orderType) }}
                  <span v-if="selectedOrder.tableNo" class="ml-1 text-xs text-slate-500"
                    >(테이블 {{ selectedOrder.tableNo }}번)</span
                  >
                </p>
              </div>
              <div>
                <span class="text-xs text-slate-500">기기</span>
                <p class="text-sm font-medium text-slate-800">
                  {{ getDeviceLabel(selectedOrder.kioskId) }}
                </p>
              </div>
              <div v-if="selectedOrder.completedAt">
                <span class="text-xs text-slate-500">완료일시</span>
                <p class="text-sm font-medium text-slate-800">
                  {{ formatDate(selectedOrder.completedAt) }}
                </p>
              </div>
              <div v-if="selectedOrder.cancelledAt">
                <span class="text-xs text-slate-500">취소일시</span>
                <p class="text-sm font-medium text-red-600">
                  {{ formatDate(selectedOrder.cancelledAt) }}
                </p>
              </div>
            </div>

            <!-- 주문 상품 목록 -->
            <h4 class="mb-2 text-sm font-bold text-slate-700">주문 상품</h4>
            <table class="mb-4 w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-xs text-slate-500">
                  <th class="pb-2 text-left">상품명</th>
                  <th class="pb-2 text-right">단가</th>
                  <th class="pb-2 text-center">수량</th>
                  <th class="pb-2 text-right">소계</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="item in selectedOrder.items" :key="item.id">
                  <td class="py-2 text-slate-800">
                    {{ item.name }}
                    <span v-if="item.product?.barcode" class="ml-1 text-xs text-slate-400"
                      >({{ item.product.barcode }})</span
                    >
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
                  <td class="py-2 text-right text-base font-bold text-indigo-600">
                    {{ formatPrice(selectedOrder.totalAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>

            <!-- 결제 정보 -->
            <div v-if="selectedOrder.payments && selectedOrder.payments.length > 0">
              <h4 class="mb-2 text-sm font-bold text-slate-700">결제 정보</h4>
              <div class="space-y-2">
                <div
                  v-for="payment in selectedOrder.payments"
                  :key="payment.id"
                  class="rounded-lg bg-slate-50 px-4 py-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-medium text-slate-800">
                        {{ getPaymentMethodLabel(payment.paymentType) }}
                      </span>
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="
                          payment.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ getPaymentStatusLabel(payment.status) }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-slate-800">
                      {{ formatPrice(payment.amount) }}
                    </span>
                  </div>
                  <div
                    v-if="payment.paymentType === 'CASH' && payment.receivedAmount"
                    class="mt-1 flex gap-4 text-xs text-slate-500"
                  >
                    <span
                      >받은금액:
                      <b class="text-slate-700">{{ formatPrice(payment.receivedAmount) }}</b></span
                    >
                    <span
                      >거스름돈:
                      <b class="text-emerald-600">{{
                        formatPrice(Number(payment.receivedAmount) - Number(payment.amount))
                      }}</b></span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- 메모 -->
            <div v-if="selectedOrder.memo" class="mt-4">
              <h4 class="mb-1 text-sm font-bold text-slate-700">메모</h4>
              <p class="rounded-lg bg-amber-50 px-4 py-2 text-sm text-slate-700">
                {{ selectedOrder.memo }}
              </p>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="border-t border-slate-200 px-6 py-4">
            <button
              class="w-full rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
              @click="closeDetail"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
