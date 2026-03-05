<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import type { Purchase, Supplier, PurchaseStatus } from "@/types";
import { apiClient } from "@/services/api/client";
import { showApiError, showConfirm } from "@/utils/AlertUtils";
import { formatPrice } from "@/utils/format";

const purchaseStatusConfig: Record<PurchaseStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "임시저장", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMED: { label: "확정", bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { label: "취소", bg: "bg-red-100", text: "text-red-700" },
};

// 탭
const activeTab = ref<"byDate" | "bySupplier" | "payment">("byDate");

const purchases = ref<Purchase[]>([]);
const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const filterSupplier = ref<number | "">("");
const filterStatus = ref<PurchaseStatus | "">("");

// 날짜 범위 (기본: 이번 달)
const now = new Date();
const startDate = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
const endDate = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
);

const pagination = ref({
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 0,
});

// 상세 모달
const selectedPurchase = ref<Purchase | null>(null);
const showDetail = ref(false);

// ========== 통계 ==========
const stats = computed(() => {
  const confirmed = purchases.value.filter((p) => p.status === "CONFIRMED");
  const totalAmount = confirmed.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalTax = confirmed.reduce((sum, p) => sum + Number(p.taxAmount), 0);
  return {
    count: confirmed.length,
    totalAmount,
    totalTax,
    supplyAmount: totalAmount - totalTax,
  };
});

// ========== 거래처별 그룹 ==========
interface SupplierGroup {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  purchases: Purchase[];
  totalAmount: number;
  taxAmount: number;
  supplyAmount: number;
  count: number;
}

const supplierGroups = computed<SupplierGroup[]>(() => {
  const map = new Map<number, SupplierGroup>();

  for (const p of purchases.value) {
    if (p.status === "CANCELLED") continue;
    const sid = p.supplierId;
    if (!map.has(sid)) {
      map.set(sid, {
        supplierId: sid,
        supplierName: p.supplier?.name ?? "-",
        supplierCode: p.supplier?.code ?? "",
        purchases: [],
        totalAmount: 0,
        taxAmount: 0,
        supplyAmount: 0,
        count: 0,
      });
    }
    const group = map.get(sid)!;
    group.purchases.push(p);
    group.totalAmount += Number(p.totalAmount);
    group.taxAmount += Number(p.taxAmount);
    group.supplyAmount += Number(p.totalAmount) - Number(p.taxAmount);
    group.count += 1;
  }

  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
});

// 거래처별 펼침/접힘 상태
const expandedSuppliers = ref<Set<number>>(new Set());

function toggleSupplierExpand(sid: number): void {
  if (expandedSuppliers.value.has(sid)) {
    expandedSuppliers.value.delete(sid);
  } else {
    expandedSuppliers.value.add(sid);
  }
}

// ========== 대금결제 탭 ==========
interface PaymentSummary {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  totalAmount: number;
  count: number;
  paidAmount: number;
  unpaidAmount: number;
}

const paymentSummaries = computed<PaymentSummary[]>(() => {
  const map = new Map<number, PaymentSummary>();

  for (const p of purchases.value) {
    if (p.status === "CANCELLED") continue;
    const sid = p.supplierId;
    if (!map.has(sid)) {
      map.set(sid, {
        supplierId: sid,
        supplierName: p.supplier?.name ?? "-",
        supplierCode: p.supplier?.code ?? "",
        totalAmount: 0,
        count: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      });
    }
    const s = map.get(sid)!;
    const amount = Number(p.totalAmount);
    s.totalAmount += amount;
    s.count += 1;
    // CONFIRMED = 미결제, DRAFT는 제외했으므로 모두 미결제로 처리
    s.unpaidAmount += amount;
  }

  return Array.from(map.values()).sort((a, b) => b.unpaidAmount - a.unpaidAmount);
});

const paymentTotals = computed(() => {
  const total = paymentSummaries.value.reduce((sum, s) => sum + s.totalAmount, 0);
  const unpaid = paymentSummaries.value.reduce((sum, s) => sum + s.unpaidAmount, 0);
  return { total, unpaid, paid: total - unpaid };
});

// ========== 데이터 로드 ==========
async function loadSuppliers(): Promise<void> {
  try {
    const res = await apiClient.get<{ success: boolean; data: Supplier[] }>("/api/v1/suppliers");
    if (res.data.success) {
      suppliers.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load suppliers:", err);
  }
}

async function loadPurchases(page = 1): Promise<void> {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.value.limit.toString(),
    });
    if (startDate.value) params.append("startDate", startDate.value);
    if (endDate.value) params.append("endDate", endDate.value);
    if (filterSupplier.value) params.append("supplierId", filterSupplier.value.toString());
    if (filterStatus.value) params.append("status", filterStatus.value);
    if (searchQuery.value) params.append("search", searchQuery.value);

    const res = await apiClient.get<{
      success: boolean;
      data: Purchase[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/api/v1/purchases?${params.toString()}`);

    if (res.data.success) {
      purchases.value = res.data.data;
      pagination.value = res.data.pagination;
    }
  } catch (err) {
    console.error("Failed to load purchases:", err);
  } finally {
    isLoading.value = false;
  }
}

async function openDetail(purchase: Purchase): Promise<void> {
  try {
    const res = await apiClient.get<{ success: boolean; data: Purchase }>(
      `/api/v1/purchases/${purchase.id}`,
    );
    if (res.data.success) {
      selectedPurchase.value = res.data.data;
      showDetail.value = true;
    }
  } catch (err) {
    console.error("Failed to load purchase detail:", err);
  }
}

async function cancelPurchase(purchase: Purchase): Promise<void> {
  const { isConfirmed } = await showConfirm("매입 취소");
  if (!isConfirmed) return;

  try {
    await apiClient.delete(`/api/v1/purchases/${purchase.id}`);
    showDetail.value = false;
    await loadPurchases(pagination.value.page);
  } catch (err) {
    showApiError(err, "취소에 실패했습니다");
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function goToPage(page: number): void {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadPurchases(page);
}

watch([filterSupplier, filterStatus], () => {
  loadPurchases(1);
});

onMounted(() => {
  loadSuppliers();
  loadPurchases();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">매입내역</h2>
        <p class="mt-1 text-sm text-slate-500">
          매입 내역을 조회하고 관리합니다
          <span v-if="pagination.total > 0" class="font-medium text-slate-700">
            (총 {{ pagination.total }}건)
          </span>
        </p>
      </div>
      <router-link
        to="/admin/purchase/register"
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        매입 등록
      </router-link>
    </div>

    <!-- 탭 -->
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex gap-6">
        <button
          class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'byDate'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          "
          @click="activeTab = 'byDate'"
        >
          매입 목록 (일자별)
        </button>
        <button
          class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'bySupplier'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          "
          @click="activeTab = 'bySupplier'"
        >
          거래처별 매입
        </button>
        <button
          class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'payment'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          "
          @click="activeTab = 'payment'"
        >
          매입 대금결제
        </button>
      </nav>
    </div>

    <!-- 통계 카드 -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">매입 건수</p>
        <p class="mt-1 text-xl font-bold text-slate-800">{{ stats.count }}건</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">공급가액</p>
        <p class="mt-1 text-xl font-bold text-indigo-600">
          {{ formatPrice(stats.supplyAmount) }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">부가세</p>
        <p class="mt-1 text-xl font-bold text-slate-600">
          {{ formatPrice(stats.totalTax) }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">합계금액</p>
        <p class="mt-1 text-xl font-bold text-emerald-600">
          {{ formatPrice(stats.totalAmount) }}
        </p>
      </div>
    </div>

    <!-- 검색 & 필터 -->
    <div class="flex flex-wrap gap-3">
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
      <select
        v-if="activeTab === 'byDate'"
        v-model="filterSupplier"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">전체 거래처</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <select
        v-if="activeTab === 'byDate'"
        v-model="filterStatus"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">전체 상태</option>
        <option value="CONFIRMED">확정</option>
        <option value="DRAFT">임시저장</option>
        <option value="CANCELLED">취소</option>
      </select>
      <div v-if="activeTab === 'byDate'" class="relative flex-1" style="min-width: 180px">
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
          placeholder="매입코드, 거래처명, 메모 검색..."
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          @keyup.enter="loadPurchases(1)"
        />
      </div>
      <button
        class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        @click="loadPurchases(1)"
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

    <!-- ========== Tab 1: 매입 목록 (일자별) ========== -->
    <template v-else-if="activeTab === 'byDate'">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50">
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
                매입일자
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                품목수
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                공급가액
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                부가세
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                합계
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
              class="cursor-pointer transition-colors hover:bg-slate-50"
              @click="openDetail(purchase)"
            >
              <td class="px-6 py-4">
                <span class="font-mono text-sm font-medium text-indigo-600">{{
                  purchase.purchaseCode
                }}</span>
              </td>
              <td class="px-6 py-4">
                <p class="font-medium text-slate-800">
                  {{ purchase.supplier?.name ?? "-" }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ purchase.supplier?.code ?? "" }}
                </p>
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">
                {{ formatDate(purchase.purchaseDate) }}
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">
                {{ purchase._count?.items ?? 0 }}개
              </td>
              <td class="px-6 py-4 text-right text-sm text-slate-600">
                {{ formatPrice(Number(purchase.totalAmount) - Number(purchase.taxAmount)) }}
              </td>
              <td class="px-6 py-4 text-right text-sm text-slate-400">
                {{ formatPrice(purchase.taxAmount) }}
              </td>
              <td class="px-6 py-4 text-right font-medium text-slate-800">
                {{ formatPrice(purchase.totalAmount) }}
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
              <td colspan="8" class="px-6 py-12 text-center text-slate-400">
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
                매입 내역이 없습니다
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션 -->
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
    </template>

    <!-- ========== Tab 2: 거래처별 매입 ========== -->
    <template v-else-if="activeTab === 'bySupplier'">
      <div
        v-if="supplierGroups.length === 0"
        class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
      >
        <svg
          class="mx-auto mb-3 h-12 w-12 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <p class="text-slate-400">해당 기간의 매입 내역이 없습니다</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="group in supplierGroups"
          :key="group.supplierId"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <!-- 거래처 헤더 (클릭으로 펼침/접힘) -->
          <button
            class="flex w-full items-center justify-between bg-slate-50 px-6 py-4 text-left transition-colors hover:bg-slate-100"
            @click="toggleSupplierExpand(group.supplierId)"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600"
              >
                {{ group.supplierName.charAt(0) }}
              </div>
              <div>
                <p class="font-semibold text-slate-800">
                  {{ group.supplierName }}
                </p>
                <p class="text-xs text-slate-400">{{ group.supplierCode }} · {{ group.count }}건</p>
              </div>
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <p class="text-xs text-slate-500">공급가액</p>
                <p class="font-medium text-slate-700">
                  {{ formatPrice(group.supplyAmount) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500">부가세</p>
                <p class="font-medium text-slate-500">
                  {{ formatPrice(group.taxAmount) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500">합계</p>
                <p class="text-lg font-bold text-indigo-600">
                  {{ formatPrice(group.totalAmount) }}
                </p>
              </div>
              <svg
                class="h-5 w-5 text-slate-400 transition-transform"
                :class="{ 'rotate-180': expandedSuppliers.has(group.supplierId) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          <!-- 매입 상세 목록 (펼침 시) -->
          <div v-if="expandedSuppliers.has(group.supplierId)">
            <table class="w-full">
              <thead>
                <tr class="border-b border-t border-slate-100 bg-white">
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500">매입코드</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500">
                    매입일자
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500">품목수</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500">
                    공급가액
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500">부가세</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500">합계</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500">메모</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr
                  v-for="p in group.purchases"
                  :key="p.id"
                  class="cursor-pointer transition-colors hover:bg-indigo-50/50"
                  @click="openDetail(p)"
                >
                  <td class="px-6 py-3">
                    <span class="font-mono text-sm font-medium text-indigo-600">{{
                      p.purchaseCode
                    }}</span>
                  </td>
                  <td class="px-6 py-3 text-center text-sm text-slate-600">
                    {{ formatDate(p.purchaseDate) }}
                  </td>
                  <td class="px-6 py-3 text-center text-sm text-slate-600">
                    {{ p._count?.items ?? 0 }}개
                  </td>
                  <td class="px-6 py-3 text-right text-sm text-slate-600">
                    {{ formatPrice(Number(p.totalAmount) - Number(p.taxAmount)) }}
                  </td>
                  <td class="px-6 py-3 text-right text-sm text-slate-400">
                    {{ formatPrice(p.taxAmount) }}
                  </td>
                  <td class="px-6 py-3 text-right text-sm font-medium text-slate-800">
                    {{ formatPrice(p.totalAmount) }}
                  </td>
                  <td class="px-6 py-3 text-sm text-slate-400">
                    {{ p.memo ?? "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== Tab 3: 매입 대금결제 ========== -->
    <template v-else-if="activeTab === 'payment'">
      <!-- 결제 현황 요약 -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">총 매입액</p>
          <p class="mt-1 text-xl font-bold text-slate-800">
            {{ formatPrice(paymentTotals.total) }}
          </p>
        </div>
        <div class="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p class="text-xs font-medium text-red-500">미결제</p>
          <p class="mt-1 text-xl font-bold text-red-600">
            {{ formatPrice(paymentTotals.unpaid) }}
          </p>
        </div>
        <div class="rounded-xl border border-green-100 bg-green-50 p-4 shadow-sm">
          <p class="text-xs font-medium text-green-500">결제완료</p>
          <p class="mt-1 text-xl font-bold text-green-600">
            {{ formatPrice(paymentTotals.paid) }}
          </p>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50">
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                거래처
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                매입건수
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                총 매입액
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                결제액
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                미결제액
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
              v-for="ps in paymentSummaries"
              :key="ps.supplierId"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600"
                  >
                    {{ ps.supplierName.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-800">
                      {{ ps.supplierName }}
                    </p>
                    <p class="text-xs text-slate-400">
                      {{ ps.supplierCode }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-center text-sm text-slate-600">{{ ps.count }}건</td>
              <td class="px-6 py-4 text-right text-sm font-medium text-slate-800">
                {{ formatPrice(ps.totalAmount) }}
              </td>
              <td class="px-6 py-4 text-right text-sm text-green-600">
                {{ formatPrice(ps.paidAmount) }}
              </td>
              <td class="px-6 py-4 text-right text-sm font-semibold text-red-600">
                {{ formatPrice(ps.unpaidAmount) }}
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    ps.unpaidAmount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  "
                >
                  {{ ps.unpaidAmount > 0 ? "미결제" : "결제완료" }}
                </span>
              </td>
            </tr>
            <tr v-if="paymentSummaries.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                해당 기간의 매입 내역이 없습니다
              </td>
            </tr>
          </tbody>
          <!-- 합계 행 -->
          <tfoot v-if="paymentSummaries.length > 0">
            <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td class="px-6 py-4 text-slate-700">합계</td>
              <td class="px-6 py-4 text-center text-slate-700">
                {{ paymentSummaries.reduce((s, p) => s + p.count, 0) }}건
              </td>
              <td class="px-6 py-4 text-right text-slate-800">
                {{ formatPrice(paymentTotals.total) }}
              </td>
              <td class="px-6 py-4 text-right text-green-600">
                {{ formatPrice(paymentTotals.paid) }}
              </td>
              <td class="px-6 py-4 text-right text-red-600">
                {{ formatPrice(paymentTotals.unpaid) }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </template>

    <!-- 상세 모달 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetail && selectedPurchase"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showDetail = false"
        >
          <div class="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <!-- Header -->
            <header
              class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4"
            >
              <div>
                <h3 class="text-lg font-bold text-slate-800">
                  매입 상세 - {{ selectedPurchase.purchaseCode }}
                </h3>
                <p class="text-sm text-slate-500">
                  {{ selectedPurchase.supplier?.name }} ·
                  {{ formatDate(selectedPurchase.purchaseDate) }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  :class="[
                    purchaseStatusConfig[selectedPurchase.status]?.bg,
                    purchaseStatusConfig[selectedPurchase.status]?.text,
                  ]"
                >
                  {{ purchaseStatusConfig[selectedPurchase.status]?.label }}
                </span>
                <button
                  class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  @click="showDetail = false"
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
            </header>

            <!-- Content -->
            <div class="max-h-[60vh] overflow-y-auto p-6">
              <!-- 상품 목록 -->
              <div class="mb-6">
                <h4 class="mb-3 font-semibold text-slate-700">매입 상품</h4>
                <div class="overflow-hidden rounded-xl border border-slate-200">
                  <table class="w-full">
                    <thead>
                      <tr class="bg-slate-50">
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          상품명
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          바코드
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-semibold text-slate-500">
                          수량
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                          매입가
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                          판매가
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                          매입금액
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="item in selectedPurchase.items" :key="item.id">
                        <td class="px-4 py-3 text-sm font-medium text-slate-800">
                          {{ item.purchaseProduct?.name ?? "-" }}
                        </td>
                        <td class="px-4 py-3 font-mono text-xs text-slate-400">
                          {{ item.purchaseProduct?.barcode ?? "-" }}
                        </td>
                        <td class="px-4 py-3 text-center text-sm text-slate-600">
                          {{ item.quantity }}
                        </td>
                        <td class="px-4 py-3 text-right text-sm text-slate-600">
                          {{ formatPrice(item.unitPrice) }}
                        </td>
                        <td class="px-4 py-3 text-right text-sm text-slate-600">
                          {{ formatPrice(item.sellPrice) }}
                        </td>
                        <td class="px-4 py-3 text-right text-sm font-medium text-slate-800">
                          {{ formatPrice(item.amount) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 합계 -->
              <div class="rounded-xl bg-indigo-50 p-4">
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-600">공급가액</span>
                    <span class="font-medium text-slate-800">{{
                      formatPrice(
                        Number(selectedPurchase.totalAmount) - Number(selectedPurchase.taxAmount),
                      )
                    }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-600">
                      부가세
                      <span class="text-xs text-slate-400">
                        ({{ selectedPurchase.taxIncluded ? "포함" : "별도" }})
                      </span>
                    </span>
                    <span class="font-medium text-slate-800">{{
                      formatPrice(selectedPurchase.taxAmount)
                    }}</span>
                  </div>
                  <div class="flex justify-between border-t border-indigo-200 pt-2 text-lg">
                    <span class="font-semibold text-slate-700">합계</span>
                    <span class="font-bold text-indigo-600">{{
                      formatPrice(selectedPurchase.totalAmount)
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- 메모 -->
              <div v-if="selectedPurchase.memo" class="mt-4 rounded-xl bg-slate-50 p-4">
                <p class="text-xs font-medium text-slate-500">메모</p>
                <p class="mt-1 text-sm text-slate-700">
                  {{ selectedPurchase.memo }}
                </p>
              </div>
            </div>

            <!-- Footer -->
            <footer class="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div class="flex gap-3">
                <button
                  v-if="selectedPurchase.status !== 'CANCELLED'"
                  class="rounded-xl border border-red-200 bg-white px-5 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50"
                  @click="cancelPurchase(selectedPurchase)"
                >
                  매입 취소
                </button>
                <div class="flex-1" />
                <button
                  class="rounded-xl bg-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-300"
                  @click="showDetail = false"
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
  transform: scale(0.95);
}
</style>
