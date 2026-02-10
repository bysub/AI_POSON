<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";

interface OrderData {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  items?: OrderItemData[];
}

interface OrderItemData {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface ProductData {
  id: number;
  name: string;
  barcode: string;
  sellPrice: number;
  category?: { id: number; name: string };
}

// 기간 선택
type Period = "week" | "month" | "year";
const activePeriod = ref<Period>("month");
const isLoading = ref(false);
const orders = ref<OrderData[]>([]);
const products = ref<ProductData[]>([]);

// 날짜 범위
const startDate = ref("");
const endDate = ref("");

function calcDateRange(period: Period): void {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;

  switch (period) {
    case "week":
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case "year":
      start = new Date(end.getFullYear(), 0, 1);
      break;
  }

  startDate.value = formatDateISO(start);
  endDate.value = formatDateISO(end);
}

function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

// 상품별 판매 집계
interface ProductSalesSummary {
  productId: number;
  name: string;
  categoryName: string;
  totalQuantity: number;
  totalAmount: number;
}

const productSalesMap = computed<ProductSalesSummary[]>(() => {
  const map = new Map<number, ProductSalesSummary>();

  // 주문의 items로부터 집계
  for (const order of orders.value) {
    if (!order.items || order.items.length === 0) continue;
    for (const item of order.items) {
      if (!map.has(item.productId)) {
        // 상품 목록에서 카테고리 정보 찾기
        const productInfo = products.value.find((p) => p.id === item.productId);
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          categoryName: productInfo?.category?.name ?? "-",
          totalQuantity: 0,
          totalAmount: 0,
        });
      }
      const entry = map.get(item.productId)!;
      entry.totalQuantity += item.quantity;
      entry.totalAmount += item.price * item.quantity;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
});

// 베스트셀러 TOP 10
const bestSellers = computed(() => productSalesMap.value.slice(0, 10));

// 랭킹 배지 색상
function getRankBg(rank: number): string {
  if (rank === 1) return "bg-yellow-100 text-yellow-700";
  if (rank === 2) return "bg-slate-200 text-slate-700";
  if (rank === 3) return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-600";
}

// 데이터 로드
async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      startDate: startDate.value,
      endDate: endDate.value,
      status: "COMPLETED",
    });

    const [ordersRes, productsRes] = await Promise.all([
      apiClient.get<{
        success: boolean;
        data: OrderData[];
      }>(`/api/v1/orders?${params.toString()}`),
      apiClient.get<{
        success: boolean;
        data: ProductData[];
      }>("/api/v1/products?admin=true"),
    ]);

    if (ordersRes.data.success) {
      orders.value = ordersRes.data.data;
    }
    if (productsRes.data.success) {
      products.value = productsRes.data.data;
    }
  } catch (err) {
    console.error("Failed to load product stats:", err);
  } finally {
    isLoading.value = false;
  }
}

function selectPeriod(period: Period): void {
  activePeriod.value = period;
  calcDateRange(period);
  loadData();
}

onMounted(() => {
  calcDateRange(activePeriod.value);
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">상품통계</h2>
      <p class="mt-1 text-sm text-slate-500">상품별 판매 현황을 확인합니다</p>
    </div>

    <!-- 기간 선택 -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            activePeriod === 'week'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          "
          @click="selectPeriod('week')"
        >
          주간
        </button>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            activePeriod === 'month'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          "
          @click="selectPeriod('month')"
        >
          월간
        </button>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            activePeriod === 'year'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          "
          @click="selectPeriod('year')"
        >
          연간
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="startDate"
          type="date"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <span class="text-slate-400">~</span>
        <input
          v-model="endDate"
          type="date"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <button
        class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        @click="loadData"
      >
        조회
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <template v-else>
      <!-- 베스트셀러 TOP 10 -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-semibold text-slate-800">베스트셀러 TOP 10</h3>

        <div v-if="bestSellers.length === 0" class="flex flex-col items-center justify-center py-8">
          <svg
            class="mb-3 h-12 w-12 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p class="text-slate-400">데이터가 없습니다</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(item, index) in bestSellers"
            :key="item.productId"
            class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                :class="getRankBg(index + 1)"
              >
                {{ index + 1 }}
              </span>
              <div>
                <p class="text-sm font-medium text-slate-800">
                  {{ item.name }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ item.categoryName }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-slate-800">
                {{ formatNumber(item.totalQuantity) }}개
              </p>
              <p class="text-xs text-slate-500">{{ formatNumber(item.totalAmount) }}원</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 상품별 판매 현황 테이블 -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h3 class="font-semibold text-slate-800">상품별 판매 현황</h3>
        </div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/50">
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                상품명
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                카테고리
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                판매수량
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매출액
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in productSalesMap"
              :key="item.productId"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-6 py-4 text-sm font-medium text-slate-800">
                {{ item.name }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">
                {{ item.categoryName }}
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">
                {{ formatNumber(item.totalQuantity) }}개
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium text-indigo-600">
                {{ formatNumber(item.totalAmount) }}원
              </td>
            </tr>
            <tr v-if="productSalesMap.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                <svg
                  class="mx-auto mb-3 h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                해당 기간의 상품별 판매 데이터가 없습니다
              </td>
            </tr>
          </tbody>
          <tfoot v-if="productSalesMap.length > 0">
            <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td colspan="2" class="px-6 py-4 text-slate-700">
                합계 ({{ productSalesMap.length }}개 상품)
              </td>
              <td class="px-6 py-4 text-center text-slate-700">
                {{ formatNumber(productSalesMap.reduce((s, i) => s + i.totalQuantity, 0)) }}개
              </td>
              <td class="px-6 py-4 text-right text-indigo-600">
                {{ formatNumber(productSalesMap.reduce((s, i) => s + i.totalAmount, 0)) }}원
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
