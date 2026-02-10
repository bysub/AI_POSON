<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import type { PurchaseStatus } from "@/types";

interface PurchaseData {
  id: number;
  purchaseCode: string;
  totalAmount: string;
  taxAmount: string;
  status: PurchaseStatus;
  purchaseDate: string;
  supplier: { name: string };
}

interface PurchaseStatsSummary {
  totalAmount: string;
  count: number;
  avgAmount: string;
}

const purchaseStatusConfig: Record<PurchaseStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "임시저장", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMED: { label: "확정", bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { label: "취소", bg: "bg-red-100", text: "text-red-700" },
};

// 기간 선택
type Period = "week" | "month" | "year";
const activePeriod = ref<Period>("month");
const isLoading = ref(false);
const purchases = ref<PurchaseData[]>([]);
const summary = ref<PurchaseStatsSummary>({ totalAmount: "0", count: 0, avgAmount: "0" });

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

function formatNumber(n: number | string): string {
  return new Intl.NumberFormat("ko-KR").format(Number(n));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// 요약 통계 (API 실패 시 로컬 계산용 폴백)
const totalAmount = computed(() => Number(summary.value.totalAmount));
const purchaseCount = computed(() => summary.value.count);
const avgAmount = computed(() => Number(summary.value.avgAmount));

// 데이터 로드
async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const [summaryRes, listRes] = await Promise.all([
      apiClient
        .get<{
          success: boolean;
          data: PurchaseStatsSummary;
        }>(`/api/v1/purchases/stats/summary?startDate=${startDate.value}&endDate=${endDate.value}`)
        .catch(() => null),
      apiClient.get<{
        success: boolean;
        data: PurchaseData[];
      }>(`/api/v1/purchases?startDate=${startDate.value}&endDate=${endDate.value}`),
    ]);

    if (summaryRes?.data.success) {
      summary.value = summaryRes.data.data;
    }

    if (listRes.data.success) {
      purchases.value = listRes.data.data;

      // summary API가 실패했을 경우 로컬 계산으로 폴백
      if (!summaryRes?.data.success) {
        const confirmed = purchases.value.filter((p) => p.status !== "CANCELLED");
        const total = confirmed.reduce((sum, p) => sum + Number(p.totalAmount), 0);
        summary.value = {
          totalAmount: String(total),
          count: confirmed.length,
          avgAmount: confirmed.length > 0 ? String(Math.round(total / confirmed.length)) : "0",
        };
      }
    }
  } catch (err) {
    console.error("Failed to load purchase stats:", err);
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
      <h2 class="text-xl font-bold text-slate-800">매입통계</h2>
      <p class="mt-1 text-sm text-slate-500">기간별 매입 현황을 조회합니다</p>
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
      <!-- 요약 카드 -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">총 매입액</p>
          <p class="mt-1 text-xl font-bold text-indigo-600">{{ formatNumber(totalAmount) }}원</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">매입 건수</p>
          <p class="mt-1 text-xl font-bold text-slate-800">{{ formatNumber(purchaseCount) }}건</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">평균 매입 단가</p>
          <p class="mt-1 text-xl font-bold text-emerald-600">{{ formatNumber(avgAmount) }}원</p>
        </div>
      </div>

      <!-- 매입 내역 테이블 -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h3 class="font-semibold text-slate-800">매입 내역</h3>
        </div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/50">
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매입코드
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                거래처
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매입일
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                금액
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                상태
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="purchase in purchases"
              :key="purchase.id"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-6 py-4">
                <span class="font-mono text-sm font-medium text-indigo-600">
                  {{ purchase.purchaseCode }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-800">
                {{ purchase.supplier?.name ?? "-" }}
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">
                {{ formatDate(purchase.purchaseDate) }}
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium text-slate-800">
                {{ formatNumber(purchase.totalAmount) }}원
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="[
                    purchaseStatusConfig[purchase.status]?.bg ?? 'bg-slate-100',
                    purchaseStatusConfig[purchase.status]?.text ?? 'text-slate-500',
                  ]"
                >
                  {{ purchaseStatusConfig[purchase.status]?.label ?? purchase.status }}
                </span>
              </td>
            </tr>
            <tr v-if="purchases.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-slate-400">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                해당 기간의 매입 데이터가 없습니다
              </td>
            </tr>
          </tbody>
          <tfoot v-if="purchases.length > 0">
            <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td colspan="3" class="px-6 py-4 text-slate-700">합계 ({{ purchases.length }}건)</td>
              <td class="px-6 py-4 text-right text-indigo-600">
                {{ formatNumber(purchases.reduce((s, p) => s + Number(p.totalAmount), 0)) }}원
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
