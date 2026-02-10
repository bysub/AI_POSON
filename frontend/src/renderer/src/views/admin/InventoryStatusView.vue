<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { apiClient } from "@/services/api/client";

interface Supplier {
  id: number;
  code: string;
  name: string;
  type: string;
}

interface PurchaseProduct {
  id: number;
  barcode: string;
  name: string;
  sellPrice: string;
  costPrice: string;
  stock: number;
  safeStock: number;
  supplierId: number | null;
  supplier: Supplier | null;
  status: string;
}

const products = ref<PurchaseProduct[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const filterStatus = ref("ALL"); // ALL, NORMAL, LOW, OUT

async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: PurchaseProduct[] }>(
      "/api/v1/purchase-products",
    );
    if (res.data.success) products.value = res.data.data;
  } catch (err) {
    console.error("Failed to load products:", err);
  } finally {
    isLoading.value = false;
  }
}

const filtered = computed(() => {
  let list = products.value;

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.supplier?.name ?? "").toLowerCase().includes(q),
    );
  }

  if (filterStatus.value === "NORMAL") list = list.filter((p) => p.stock > p.safeStock);
  else if (filterStatus.value === "LOW")
    list = list.filter((p) => p.stock > 0 && p.stock <= p.safeStock);
  else if (filterStatus.value === "OUT") list = list.filter((p) => p.stock <= 0);

  return list;
});

// 요약 통계
const totalCount = computed(() => products.value.length);
const normalCount = computed(() => products.value.filter((p) => p.stock > p.safeStock).length);
const lowCount = computed(
  () => products.value.filter((p) => p.stock > 0 && p.stock <= p.safeStock).length,
);
const outCount = computed(() => products.value.filter((p) => p.stock <= 0).length);
const totalValue = computed(() =>
  products.value.reduce((sum, p) => sum + p.stock * parseFloat(p.costPrice || "0"), 0),
);

function getStockStatus(p: PurchaseProduct): { label: string; cls: string } {
  if (p.stock <= 0) return { label: "품절", cls: "bg-red-100 text-red-700" };
  if (p.stock <= p.safeStock) return { label: "부족", cls: "bg-amber-100 text-amber-700" };
  return { label: "정상", cls: "bg-green-100 text-green-700" };
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

onMounted(() => loadData());
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">재고현황</h2>
      <p class="mt-0.5 text-sm text-slate-500">매입상품의 재고 현황을 확인합니다</p>
    </div>

    <!-- 요약 카드 -->
    <div class="grid gap-3 md:grid-cols-5">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">전체 상품</p>
        <p class="mt-1 text-2xl font-bold text-slate-800">
          {{ formatNumber(totalCount) }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-green-600">정상</p>
        <p class="mt-1 text-2xl font-bold text-green-600">
          {{ formatNumber(normalCount) }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-amber-600">부족</p>
        <p class="mt-1 text-2xl font-bold text-amber-600">
          {{ formatNumber(lowCount) }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-red-600">품절</p>
        <p class="mt-1 text-2xl font-bold text-red-600">
          {{ formatNumber(outCount) }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">재고 금액</p>
        <p class="mt-1 text-xl font-bold text-indigo-600">{{ formatNumber(totalValue) }}원</p>
      </div>
    </div>

    <!-- 검색 + 필터 -->
    <div class="flex gap-3">
      <div class="relative flex-1">
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
          placeholder="상품명, 바코드, 거래처로 검색..."
          class="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div class="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          v-for="opt in [
            { value: 'ALL', label: '전체' },
            { value: 'NORMAL', label: '정상' },
            { value: 'LOW', label: '부족' },
            { value: 'OUT', label: '품절' },
          ]"
          :key="opt.value"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            filterStatus === opt.value
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          "
          @click="filterStatus = opt.value"
        >
          {{ opt.label }}
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
      <div v-else-if="filtered.length === 0" class="py-16 text-center">
        <p class="text-slate-400">
          {{
            searchQuery || filterStatus !== "ALL"
              ? "검색 결과가 없습니다"
              : "등록된 상품이 없습니다"
          }}
        </p>
      </div>

      <!-- Table -->
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">상품</th>
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              거래처
            </th>
            <th class="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              원가
            </th>
            <th class="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              판매가
            </th>
            <th class="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              현재고
            </th>
            <th class="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              안전재고
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              상태
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              이력
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="product in filtered" :key="product.id" class="hover:bg-slate-50">
            <td class="px-5 py-3">
              <p class="font-medium text-slate-800">
                {{ product.name }}
              </p>
              <p class="text-xs text-slate-500">
                {{ product.barcode }}
              </p>
            </td>
            <td class="px-5 py-3 text-sm text-slate-600">
              {{ product.supplier?.name ?? "-" }}
            </td>
            <td class="px-5 py-3 text-right text-sm text-slate-600">
              {{ formatNumber(parseFloat(product.costPrice || "0")) }}
            </td>
            <td class="px-5 py-3 text-right text-sm text-slate-600">
              {{ formatNumber(parseFloat(product.sellPrice || "0")) }}
            </td>
            <td
              class="px-5 py-3 text-right font-semibold"
              :class="
                product.stock > product.safeStock
                  ? 'text-green-600'
                  : product.stock > 0
                    ? 'text-amber-600'
                    : 'text-red-600'
              "
            >
              {{ formatNumber(product.stock) }}
            </td>
            <td class="px-5 py-3 text-right text-sm text-slate-500">
              {{ formatNumber(product.safeStock) }}
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="getStockStatus(product).cls"
              >
                {{ getStockStatus(product).label }}
              </span>
            </td>
            <td class="px-5 py-3 text-center">
              <RouterLink
                :to="`/admin/inventory/history?productId=${product.id}`"
                class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                이력보기
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 하단 건수 -->
      <div v-if="filtered.length > 0" class="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
        <p class="text-xs text-slate-500">총 {{ formatNumber(filtered.length) }}건</p>
      </div>
    </div>
  </div>
</template>
