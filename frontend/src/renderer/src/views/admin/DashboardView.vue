<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Line, Bar } from "vue-chartjs";
import "@/utils/chart-setup";
import { apiClient } from "@/services/api/client";
import { formatPrice } from "@/utils/format";
import { CHART_COLORS } from "@/utils/chart-setup";
import { useRouter } from "vue-router";

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  todayOrders: number;
  todayRevenue: number;
}

interface DailyStats {
  date: string;
  count: number;
  revenue: number;
}

interface ProductStats {
  productId: number;
  name: string;
  totalQuantity: number;
  totalAmount: number;
}

const router = useRouter();
const stats = ref<DashboardStats>({
  totalProducts: 0,
  totalCategories: 0,
  todayOrders: 0,
  todayRevenue: 0,
});
const isLoading = ref(true);
const weeklyStats = ref<DailyStats[]>([]);
const topProducts = ref<ProductStats[]>([]);

const lineRef = ref<InstanceType<typeof Line> | null>(null);
const barRef = ref<InstanceType<typeof Bar> | null>(null);

const miniChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      padding: 8,
      cornerRadius: 6,
    },
  },
  scales: {
    x: { display: false },
    y: { display: false, beginAtZero: true },
  },
  animation: { duration: 400 },
};

const lineChartData = computed(() => ({
  labels: weeklyStats.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      data: weeklyStats.value.map((d) => d.revenue),
      borderColor: CHART_COLORS.primary,
      backgroundColor: CHART_COLORS.primary + "20",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2,
    },
  ],
}));

const barChartData = computed(() => ({
  labels: topProducts.value.map((p) => p.name.length > 6 ? p.name.slice(0, 6) + "..." : p.name),
  datasets: [
    {
      data: topProducts.value.map((p) => p.totalQuantity),
      backgroundColor: [
        CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning,
        CHART_COLORS.info, CHART_COLORS.purple,
      ],
      borderWidth: 0,
    },
  ],
}));

async function loadStats(): Promise<void> {
  isLoading.value = true;
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStart = weekAgo.toISOString().split("T")[0];

    const [productsRes, categoriesRes, orderStatsRes, dailyRes, productStatsRes] = await Promise.all([
      apiClient.get<{ success: boolean; data: unknown[] }>("/api/v1/products"),
      apiClient.get<{ success: boolean; data: unknown[] }>("/api/v1/categories"),
      apiClient.get<{
        success: boolean;
        data: { totalOrders: number; completedOrders: number; totalRevenue: number };
      }>(`/api/v1/orders/stats/summary?startDate=${today}&endDate=${today}T23:59:59.999Z`),
      apiClient.get<{ success: boolean; data: DailyStats[] }>(
        `/api/v1/orders/stats/daily?startDate=${weekStart}&endDate=${today}`,
      ).catch(() => null),
      apiClient.get<{ success: boolean; data: ProductStats[] }>(
        `/api/v1/orders/stats/products?startDate=${weekStart}&endDate=${today}&limit=5`,
      ).catch(() => null),
    ]);

    stats.value.totalProducts = productsRes.data.success ? productsRes.data.data.length : 0;
    stats.value.totalCategories = categoriesRes.data.success ? categoriesRes.data.data.length : 0;
    if (orderStatsRes.data.success) {
      stats.value.todayOrders = orderStatsRes.data.data.totalOrders;
      stats.value.todayRevenue = orderStatsRes.data.data.totalRevenue;
    }
    if (dailyRes?.data.success) {
      weeklyStats.value = dailyRes.data.data;
    }
    if (productStatsRes?.data.success) {
      topProducts.value = productStatsRes.data.data;
    }
  } catch (err) {
    console.error("Failed to load stats:", err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadStats();
});

onUnmounted(() => {
  lineRef.value?.chart?.destroy();
  barRef.value?.chart?.destroy();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">전체 상품</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">
              <span v-if="isLoading" class="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
              <span v-else>{{ stats.totalProducts }}</span>
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">등록된 판매 상품</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">카테고리</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">
              <span v-if="isLoading" class="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
              <span v-else>{{ stats.totalCategories }}</span>
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">활성 카테고리</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">오늘 주문</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">
              <span v-if="isLoading" class="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
              <span v-else>{{ stats.todayOrders }}</span>
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <svg class="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">오늘 전체 주문 수</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">오늘 매출</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">
              <span v-if="isLoading" class="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
              <span v-else>{{ formatPrice(stats.todayRevenue) }}</span>
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">완료된 주문 매출 합계</p>
      </div>
    </div>

    <!-- Mini Charts -->
    <div v-if="!isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        v-if="weeklyStats.length > 0"
        class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        @click="router.push('/admin/stats/sales')"
      >
        <h3 class="mb-2 text-sm font-semibold text-slate-700">최근 7일 매출 추이</h3>
        <div class="h-[150px]">
          <Line ref="lineRef" :data="lineChartData" :options="miniChartOptions" />
        </div>
      </div>

      <div
        v-if="topProducts.length > 0"
        class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        @click="router.push('/admin/stats/products')"
      >
        <h3 class="mb-2 text-sm font-semibold text-slate-700">베스트셀러 TOP 5</h3>
        <div class="h-[150px]">
          <Bar ref="barRef" :data="barChartData" :options="miniChartOptions" />
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-slate-800">빠른 작업</h3>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <RouterLink
          to="/admin/products"
          class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span class="text-sm font-medium text-slate-700">상품 등록</span>
        </RouterLink>

        <RouterLink
          to="/admin/categories"
          class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-slate-700">카테고리 추가</span>
        </RouterLink>

        <RouterLink
          to="/admin/sales/history"
          class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <svg class="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-slate-700">매출 내역</span>
        </RouterLink>

        <RouterLink
          to="/admin/settings"
          class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <svg class="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-slate-700">시스템 설정</span>
        </RouterLink>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-slate-800">최근 활동</h3>
      <div class="space-y-4">
        <div class="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-medium text-slate-800">시스템 시작됨</p>
            <p class="text-sm text-slate-500">관리자 콘솔에 로그인했습니다</p>
          </div>
          <span class="text-xs text-slate-400">방금 전</span>
        </div>
      </div>
    </div>
  </div>
</template>
