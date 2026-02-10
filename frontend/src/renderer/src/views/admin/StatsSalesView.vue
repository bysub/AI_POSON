<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";

interface OrderData {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  createdAt: string;
}

// 기간 선택
type Period = "week" | "month" | "year";
const activePeriod = ref<Period>("month");
const isLoading = ref(false);
const orders = ref<OrderData[]>([]);

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// 통계 계산
const totalSales = computed(() => orders.value.reduce((sum, o) => sum + Number(o.totalAmount), 0));

const orderCount = computed(() => orders.value.length);

const avgOrderAmount = computed(() =>
  orderCount.value > 0 ? Math.round(totalSales.value / orderCount.value) : 0,
);

const dailyAvgSales = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  return Math.round(totalSales.value / days);
});

// 일별 매출 그룹핑
interface DailySales {
  date: string;
  orderCount: number;
  totalAmount: number;
}

const dailySalesData = computed<DailySales[]>(() => {
  const map = new Map<string, DailySales>();

  for (const order of orders.value) {
    const dateKey = order.createdAt.slice(0, 10);
    if (!map.has(dateKey)) {
      map.set(dateKey, { date: dateKey, orderCount: 0, totalAmount: 0 });
    }
    const entry = map.get(dateKey)!;
    entry.orderCount += 1;
    entry.totalAmount += Number(order.totalAmount);
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
});

// 데이터 로드
async function loadOrders(): Promise<void> {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      startDate: startDate.value,
      endDate: endDate.value,
      status: "COMPLETED",
    });

    const res = await apiClient.get<{
      success: boolean;
      data: OrderData[];
    }>(`/api/v1/orders?${params.toString()}`);

    if (res.data.success) {
      orders.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load orders:", err);
  } finally {
    isLoading.value = false;
  }
}

function selectPeriod(period: Period): void {
  activePeriod.value = period;
  calcDateRange(period);
  loadOrders();
}

onMounted(() => {
  calcDateRange(activePeriod.value);
  loadOrders();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">매출통계</h2>
      <p class="mt-1 text-sm text-slate-500">기간별 매출 현황을 조회합니다</p>
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
        @click="loadOrders"
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
      <!-- 요약 카드 -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">총 매출액</p>
          <p class="mt-1 text-xl font-bold text-indigo-600">{{ formatNumber(totalSales) }}원</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">주문 건수</p>
          <p class="mt-1 text-xl font-bold text-slate-800">{{ formatNumber(orderCount) }}건</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">평균 주문 금액</p>
          <p class="mt-1 text-xl font-bold text-emerald-600">
            {{ formatNumber(avgOrderAmount) }}원
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">일평균 매출</p>
          <p class="mt-1 text-xl font-bold text-orange-600">{{ formatNumber(dailyAvgSales) }}원</p>
        </div>
      </div>

      <!-- 일별 매출 테이블 -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h3 class="font-semibold text-slate-800">일별 매출 현황</h3>
        </div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/50">
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                날짜
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                주문건수
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
              v-for="day in dailySalesData"
              :key="day.date"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-6 py-4 text-sm font-medium text-slate-800">
                {{ formatDate(day.date) }}
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">
                {{ formatNumber(day.orderCount) }}건
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium text-indigo-600">
                {{ formatNumber(day.totalAmount) }}원
              </td>
            </tr>
            <tr v-if="dailySalesData.length === 0">
              <td colspan="3" class="px-6 py-12 text-center text-slate-400">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                해당 기간의 매출 데이터가 없습니다
              </td>
            </tr>
          </tbody>
          <tfoot v-if="dailySalesData.length > 0">
            <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td class="px-6 py-4 text-slate-700">합계</td>
              <td class="px-6 py-4 text-center text-slate-700">{{ formatNumber(orderCount) }}건</td>
              <td class="px-6 py-4 text-right text-indigo-600">{{ formatNumber(totalSales) }}원</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
