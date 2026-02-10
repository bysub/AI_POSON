<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import type { StockMovement, StockMovementType } from "@/types";
import { apiClient } from "@/services/api/client";

const route = useRoute();

const movements = ref<StockMovement[]>([]);
const isLoading = ref(false);

// 필터
const filterProductId = ref<number | "">("");
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
};

const reasonLabels: Record<string, string> = {
  inventory_check: "재고실사",
  damage: "파손/폐기",
  gift: "증정/샘플",
  sync: "동기화",
  etc: "기타",
};

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

// URL 쿼리 파라미터에서 productId 읽기
onMounted(() => {
  if (route.query.productId) {
    filterProductId.value = parseInt(route.query.productId as string, 10);
  }
  loadData();
});

// 요약 통계
const stats = computed(() => {
  const purchaseIn = movements.value.filter((m) => m.type === "PURCHASE_IN").length;
  const purchaseCancel = movements.value.filter((m) => m.type === "PURCHASE_CANCEL").length;
  const adjustment = movements.value.filter((m) => m.type === "ADJUSTMENT").length;
  const sync = movements.value.filter((m) => m.type === "SYNC").length;
  return { purchaseIn, purchaseCancel, adjustment, sync };
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
    <div class="grid gap-3 md:grid-cols-4">
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
        <p class="text-xs font-medium text-purple-600">재고동기화</p>
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
        <div v-if="filterProductId" class="flex items-center gap-2">
          <span class="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            상품 #{{ filterProductId }}
          </span>
          <button
            class="text-xs text-slate-400 hover:text-red-500"
            @click="
              filterProductId = '';
              applyFilter();
            "
          >
            해제
          </button>
        </div>

        <button
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
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
                <span v-if="m.purchase" class="font-mono text-xs text-indigo-600">
                  {{ m.purchase.purchaseCode }}
                </span>
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
  </div>
</template>
