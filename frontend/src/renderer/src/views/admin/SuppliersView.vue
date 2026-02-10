<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Supplier, SupplierType } from "@/types";
import { apiClient } from "@/services/api/client";
import { showWarningToast, showApiError, showConfirm } from "@/utils/AlertUtils";

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
const supplierForm = ref({
  name: "",
  type: "ETC" as SupplierType,
  businessNumber: "",
  businessType: "",
  businessItem: "",
  representative: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  addressDetail: "",
  discountRate: 0,
  paymentTerms: "",
  memo: "",
});

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
  supplierForm.value = {
    name: "",
    type: "ETC",
    businessNumber: "",
    businessType: "",
    businessItem: "",
    representative: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    addressDetail: "",
    discountRate: 0,
    paymentTerms: "",
    memo: "",
  };
  showForm.value = true;
}

function openEditForm(supplier: Supplier): void {
  editingSupplier.value = supplier;
  supplierForm.value = {
    name: supplier.name,
    type: supplier.type,
    businessNumber: supplier.businessNumber ?? "",
    businessType: supplier.businessType ?? "",
    businessItem: supplier.businessItem ?? "",
    representative: supplier.representative ?? "",
    contactName: supplier.contactName ?? "",
    contactPhone: supplier.contactPhone ?? "",
    contactEmail: supplier.contactEmail ?? "",
    address: supplier.address ?? "",
    addressDetail: supplier.addressDetail ?? "",
    discountRate: Number(supplier.discountRate) || 0,
    paymentTerms: supplier.paymentTerms ?? "",
    memo: supplier.memo ?? "",
  };
  showForm.value = true;
}

async function saveSupplier(): Promise<void> {
  if (!supplierForm.value.name) {
    showWarningToast("거래처명은 필수입니다");
    return;
  }

  isLoading.value = true;
  try {
    if (editingSupplier.value) {
      await apiClient.patch(`/api/v1/suppliers/${editingSupplier.value.id}`, supplierForm.value);
    } else {
      await apiClient.post("/api/v1/suppliers", supplierForm.value);
    }
    showForm.value = false;
    await loadSuppliers();
  } catch (err) {
    showApiError(err, "저장에 실패했습니다");
    console.error("Save supplier error:", err);
  } finally {
    isLoading.value = false;
  }
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
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600"
                >
                  {{ supplier.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-slate-800">
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

    <!-- Supplier Form Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showForm = false"
        >
          <div
            class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div class="mb-6 flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-800">
                {{ editingSupplier ? "거래처 수정" : "거래처 추가" }}
              </h3>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="showForm = false"
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

            <div class="space-y-4">
              <!-- 기본 정보 -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 class="mb-3 text-sm font-semibold text-slate-700">기본 정보</h4>
                <!-- 수정 모드: 거래처 코드 표시 -->
                <div v-if="editingSupplier" class="mb-3 flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-500">거래처 코드:</span>
                  <span
                    class="rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-semibold text-indigo-700"
                    >{{ editingSupplier.code }}</span
                  >
                </div>
                <div v-else class="mb-3">
                  <p class="text-xs text-slate-400">거래처 코드는 저장 시 자동으로 생성됩니다.</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700"
                      >거래처명 *</label
                    >
                    <input
                      v-model="supplierForm.name"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="거래처명"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700"
                      >거래처 구분</label
                    >
                    <select
                      v-model="supplierForm.type"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option v-for="t in supplierTypes" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 사업자 정보 -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 class="mb-3 text-sm font-semibold text-slate-700">사업자 정보</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700"
                      >사업자번호</label
                    >
                    <input
                      v-model="supplierForm.businessNumber"
                      type="text"
                      maxlength="20"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="000-00-00000"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">대표자</label>
                    <input
                      v-model="supplierForm.representative"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="대표자명"
                    />
                  </div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">업태</label>
                    <input
                      v-model="supplierForm.businessType"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="예: 제조업, 도소매업, 서비스업"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">종목</label>
                    <input
                      v-model="supplierForm.businessItem"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="예: 식품, 커피원두, 포장재"
                    />
                  </div>
                </div>
                <div class="mt-4">
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">주소</label>
                  <input
                    v-model="supplierForm.address"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="사업장 주소"
                  />
                </div>
                <div class="mt-4">
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">상세주소</label>
                  <input
                    v-model="supplierForm.addressDetail"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="동/호수, 층 등 상세주소"
                  />
                </div>
              </div>

              <!-- 담당자 정보 -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 class="mb-3 text-sm font-semibold text-slate-700">담당자 정보</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">담당자명</label>
                    <input
                      v-model="supplierForm.contactName"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="담당자명"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">연락처</label>
                    <input
                      v-model="supplierForm.contactPhone"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
                    <input
                      v-model="supplierForm.contactEmail"
                      type="email"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              <!-- 거래 조건 -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 class="mb-3 text-sm font-semibold text-slate-700">거래 조건</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700"
                      >할인율 (%)</label
                    >
                    <input
                      v-model.number="supplierForm.discountRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">결제 조건</label>
                    <input
                      v-model="supplierForm.paymentTerms"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="예: 월말 정산, 즉시 결제"
                    />
                  </div>
                </div>
              </div>

              <!-- 메모 -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
                <textarea
                  v-model="supplierForm.memo"
                  rows="3"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="거래처 관련 메모"
                />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
                @click="showForm = false"
              >
                취소
              </button>
              <button
                class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
                :disabled="isLoading"
                @click="saveSupplier"
              >
                {{ isLoading ? "저장 중..." : "저장" }}
              </button>
            </div>
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
