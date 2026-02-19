<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Supplier, SupplierType } from "@/types";
import { apiClient } from "@/services/api/client";
import { showApiError, showConfirm } from "@/utils/AlertUtils";
import SupplierFormModal from "@/components/SupplierFormModal.vue";

// 거래처 구분 설정
const supplierTypeConfig: Record<SupplierType, { label: string; bg: string; text: string }> = {
  FOOD: { label: "식품", bg: "bg-orange-100", text: "text-orange-700" },
  BEVERAGE: { label: "음료", bg: "bg-blue-100", text: "text-blue-700" },
  SUPPLIES: { label: "용품", bg: "bg-green-100", text: "text-green-700" },
  PACKAGING: { label: "포장재", bg: "bg-purple-100", text: "text-purple-700" },
  ETC: { label: "기타", bg: "bg-slate-100", text: "text-slate-600" },
};

const supplierTypes: { value: SupplierType; label: string }[] = [
  { value: "FOOD", label: "식품" },
  { value: "BEVERAGE", label: "음료" },
  { value: "SUPPLIES", label: "용품" },
  { value: "PACKAGING", label: "포장재" },
  { value: "ETC", label: "기타" },
];

const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const filterType = ref<SupplierType | "">("");
const filterActive = ref<"" | "true" | "false">("");

// 모달 상태
const showForm = ref(false);
const editingSupplier = ref<Supplier | null>(null);

// 필터링된 거래처
const filteredSuppliers = computed(() => {
  let result = suppliers.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (s.businessNumber?.includes(query) ?? false) ||
        (s.contactName?.toLowerCase().includes(query) ?? false),
    );
  }

  if (filterType.value) {
    result = result.filter((s) => s.type === filterType.value);
  }

  if (filterActive.value !== "") {
    const isActive = filterActive.value === "true";
    result = result.filter((s) => s.isActive === isActive);
  }

  return result;
});

// 통계
const stats = computed(() => ({
  total: suppliers.value.length,
  active: suppliers.value.filter((s) => s.isActive).length,
  inactive: suppliers.value.filter((s) => !s.isActive).length,
}));

async function loadSuppliers(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Supplier[] }>("/api/v1/suppliers");
    if (res.data.success) {
      suppliers.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load suppliers:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddForm(): void {
  editingSupplier.value = null;
  showForm.value = true;
}

function openEditForm(supplier: Supplier): void {
  editingSupplier.value = supplier;
  showForm.value = true;
}

function onSupplierSaved(): void {
  showForm.value = false;
  loadSuppliers();
}

async function deleteSupplier(supplier: Supplier): Promise<void> {
  const { isConfirmed } = await showConfirm("거래처 삭제");
  if (!isConfirmed) return;

  isLoading.value = true;
  try {
    await apiClient.delete(`/api/v1/suppliers/${supplier.id}`);
    await loadSuppliers();
  } catch (err) {
    showApiError(err, "삭제에 실패했습니다");
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function toggleActive(supplier: Supplier): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/suppliers/${supplier.id}`, {
      isActive: !supplier.isActive,
    });
    await loadSuppliers();
  } catch (err) {
    console.error("Toggle active error:", err);
  }
}

function formatBusinessNumber(bn: string | undefined): string {
  if (!bn) return "-";
  if (bn.length === 10) {
    return `${bn.slice(0, 3)}-${bn.slice(3, 5)}-${bn.slice(5)}`;
  }
  return bn;
}

onMounted(() => {
  loadSuppliers();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">거래처 관리</h2>
        <p class="mt-1 text-sm text-slate-500">
          총 {{ stats.total }}개 거래처 (활성 {{ stats.active }}개 / 비활성 {{ stats.inactive }}개)
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        @click="openAddForm"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        거래처 추가
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="flex flex-wrap gap-3">
      <div class="relative flex-1" style="min-width: 200px">
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
          placeholder="거래처명, 코드, 사업자번호, 담당자로 검색..."
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <select
        v-model="filterType"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">전체 구분</option>
        <option v-for="t in supplierTypes" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>
      <select
        v-model="filterActive"
        class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">전체 상태</option>
        <option value="true">활성</option>
        <option value="false">비활성</option>
      </select>
    </div>

    <!-- Suppliers Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
        />
      </div>

      <!-- Table -->
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              거래처
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              구분
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              사업자번호
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              담당자
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              할인율
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              상품수
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              상태
            </th>
            <th
              class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              관리
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="supplier in filteredSuppliers"
            :key="supplier.id"
            class="transition-colors hover:bg-slate-50"
          >
            <!-- 거래처 정보 -->
            <td class="cursor-pointer px-6 py-4" @click="openEditForm(supplier)">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600"
                >
                  {{ supplier.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-slate-800 hover:text-indigo-600">
                    {{ supplier.name }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{ supplier.code }}
                  </p>
                </div>
              </div>
            </td>

            <!-- 구분 -->
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                :class="[
                  supplierTypeConfig[supplier.type]?.bg ?? 'bg-slate-100',
                  supplierTypeConfig[supplier.type]?.text ?? 'text-slate-500',
                ]"
              >
                {{ supplierTypeConfig[supplier.type]?.label ?? supplier.type }}
              </span>
            </td>

            <!-- 사업자번호 -->
            <td class="px-6 py-4 text-sm text-slate-600">
              {{ formatBusinessNumber(supplier.businessNumber) }}
            </td>

            <!-- 담당자 -->
            <td class="px-6 py-4">
              <div v-if="supplier.contactName">
                <p class="text-sm text-slate-700">
                  {{ supplier.contactName }}
                </p>
                <p v-if="supplier.contactPhone" class="text-xs text-slate-400">
                  {{ supplier.contactPhone }}
                </p>
              </div>
              <span v-else class="text-sm text-slate-400">-</span>
            </td>

            <!-- 할인율 -->
            <td class="px-6 py-4 text-center">
              <span
                v-if="Number(supplier.discountRate) > 0"
                class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
              >
                {{ Number(supplier.discountRate) }}%
              </span>
              <span v-else class="text-sm text-slate-400">-</span>
            </td>

            <!-- 상품수 -->
            <td class="px-6 py-4 text-center">
              <span class="text-sm font-medium text-slate-700">
                {{ supplier._count?.purchaseProducts ?? 0 }}
              </span>
            </td>

            <!-- 상태 -->
            <td class="px-6 py-4 text-center">
              <button
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                :class="
                  supplier.isActive
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                "
                @click="toggleActive(supplier)"
              >
                {{ supplier.isActive ? "활성" : "비활성" }}
              </button>
            </td>

            <!-- 관리 -->
            <td class="px-6 py-4 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                  title="수정"
                  @click="openEditForm(supplier)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="삭제"
                  @click="deleteSupplier(supplier)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredSuppliers.length === 0">
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
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
              {{
                searchQuery || filterType || filterActive
                  ? "검색 결과가 없습니다"
                  : "등록된 거래처가 없습니다"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SupplierFormModal
      :visible="showForm"
      :supplier="editingSupplier"
      @close="showForm = false"
      @saved="onSupplierSaved"
    />
  </div>
</template>
