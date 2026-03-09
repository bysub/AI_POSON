<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { showApiError, showConfirm } from "@/utils/AlertUtils";

interface Member {
  id: number;
  code: string;
  name: string;
  phone: string;
  points: number;
  grade: string;
  isActive: boolean;
  createdAt: string;
}

interface PointHistory {
  id: number;
  type: string;
  amount: number;
  balance: number;
  orderId: string | null;
  description: string | null;
  createdAt: string;
}

const members = ref<Member[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");

// 포인트 이력 모달
const showPointModal = ref(false);
const pointMember = ref<Member | null>(null);
const pointHistories = ref<PointHistory[]>([]);
const pointLoading = ref(false);

// 포인트 조정
const adjustAmount = ref(0);
const adjustDesc = ref("");
const adjusting = ref(false);

// 모달
const showModal = ref(false);
const isEditing = ref(false);
const editId = ref(0);
const form = ref({ code: "", name: "", phone: "010-", grade: "NORMAL" as string, points: 0 });

const gradeLabels: Record<string, string> = {
  NORMAL: "일반",
  SILVER: "실버",
  GOLD: "골드",
  VIP: "VIP",
};
const gradeColors: Record<string, string> = {
  NORMAL: "bg-slate-100 text-slate-600",
  SILVER: "bg-slate-200 text-slate-700",
  GOLD: "bg-yellow-100 text-yellow-700",
  VIP: "bg-purple-100 text-purple-700",
};

const filtered = computed(() => {
  if (!searchQuery.value) return members.value;
  const q = searchQuery.value.toLowerCase();
  return members.value.filter(
    (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q) || m.code.includes(q),
  );
});

async function loadMembers(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Member[] }>("/api/v1/members");
    if (res.data.success) members.value = res.data.data;
  } catch (err) {
    console.error("Failed to load members:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddModal(): void {
  isEditing.value = false;
  editId.value = 0;
  form.value = { code: "", name: "", phone: "", grade: "NORMAL", points: 0 };
  showModal.value = true;
}

function openEditModal(m: Member): void {
  isEditing.value = true;
  editId.value = m.id;
  form.value = { code: m.code, name: m.name, phone: m.phone, grade: m.grade, points: m.points };
  showModal.value = true;
}

async function saveMember(): Promise<void> {
  try {
    if (isEditing.value) {
      await apiClient.patch(`/api/v1/members/${editId.value}`, {
        name: form.value.name,
        phone: form.value.phone,
        grade: form.value.grade,
        points: form.value.points,
      });
    } else {
      if (!form.value.code || !form.value.name || !form.value.phone) return;
      await apiClient.post("/api/v1/members", form.value);
    }
    showModal.value = false;
    await loadMembers();
  } catch (err: unknown) {
    showApiError(err, "저장에 실패했습니다");
  }
}

async function deleteMember(m: Member): Promise<void> {
  const { isConfirmed } = await showConfirm("삭제", "delete");
  if (!isConfirmed) return;
  try {
    await apiClient.delete(`/api/v1/members/${m.id}`);
    await loadMembers();
  } catch (err) {
    console.error("Failed to delete:", err);
  }
}

const pointTypeLabels: Record<string, string> = {
  EARN: "적립",
  USE: "사용",
  CANCEL: "취소",
  EXPIRE: "만료",
  ADJUST: "조정",
};
const pointTypeColors: Record<string, string> = {
  EARN: "text-green-600",
  USE: "text-red-600",
  CANCEL: "text-orange-600",
  EXPIRE: "text-slate-400",
  ADJUST: "text-indigo-600",
};

async function openPointHistory(m: Member): Promise<void> {
  pointMember.value = m;
  showPointModal.value = true;
  pointLoading.value = true;
  adjustAmount.value = 0;
  adjustDesc.value = "";
  try {
    const res = await apiClient.get<{ success: boolean; data: PointHistory[] }>(
      `/api/v1/members/${m.id}/point-histories`,
    );
    if (res.data.success) pointHistories.value = res.data.data;
  } catch {
    pointHistories.value = [];
  } finally {
    pointLoading.value = false;
  }
}

async function adjustPoints(): Promise<void> {
  if (!pointMember.value || adjustAmount.value === 0) return;
  adjusting.value = true;
  try {
    await apiClient.post(`/api/v1/members/${pointMember.value.id}/points/adjust`, {
      amount: adjustAmount.value,
      description: adjustDesc.value,
    });
    adjustAmount.value = 0;
    adjustDesc.value = "";
    await openPointHistory(pointMember.value);
    await loadMembers();
  } catch (err: unknown) {
    showApiError(err, "포인트 조정에 실패했습니다");
  } finally {
    adjusting.value = false;
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

onMounted(() => loadMembers());
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">고객관리</h2>
        <p class="mt-0.5 text-sm text-slate-500">회원 정보를 관리합니다</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        @click="openAddModal"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v12m6-6H6"
          />
        </svg>
        고객 등록
      </button>
    </div>

    <!-- 검색 -->
    <div class="relative">
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
        placeholder="이름, 전화번호, 회원코드로 검색..."
        class="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <!-- Empty -->
    <div
      v-else-if="filtered.length === 0"
      class="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm"
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <p class="text-slate-500">
        {{ searchQuery ? "검색 결과가 없습니다" : "등록된 고객이 없습니다" }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              회원코드
            </th>
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">이름</th>
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              전화번호
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              등급
            </th>
            <th class="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              포인트
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              관리
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="m in filtered" :key="m.id" class="hover:bg-slate-50">
            <td class="px-5 py-3 font-mono text-sm text-slate-600">
              {{ m.code }}
            </td>
            <td class="px-5 py-3 font-medium text-slate-800">
              {{ m.name }}
            </td>
            <td class="px-5 py-3 text-sm text-slate-600">
              {{ m.phone }}
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="gradeColors[m.grade]"
              >
                {{ gradeLabels[m.grade] ?? m.grade }}
              </span>
            </td>
            <td class="px-5 py-3 text-right font-semibold text-indigo-600">
              {{ formatNumber(m.points) }}P
            </td>
            <td class="px-5 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  class="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                  title="포인트 이력"
                  @click="openPointHistory(m)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                  @click="openEditModal(m)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  @click="deleteMember(m)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </tbody>
      </table>
      <div class="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
        <p class="text-xs text-slate-500">총 {{ formatNumber(filtered.length) }}명</p>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">
          {{ isEditing ? "고객 수정" : "고객 등록" }}
        </h3>
        <div class="space-y-4">
          <div v-if="!isEditing">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">회원코드</label>
            <input
              v-model="form.code"
              type="text"
              placeholder="예: M001"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">이름</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="고객 이름"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">전화번호</label>
            <input
              v-model="form.phone"
              type="text"
              placeholder="010-0000-0000"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">등급</label>
              <select
                v-model="form.grade"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="NORMAL">일반</option>
                <option value="SILVER">실버</option>
                <option value="GOLD">골드</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div v-if="isEditing">
              <label class="mb-1.5 block text-sm font-medium text-slate-700">포인트</label>
              <input
                v-model.number="form.points"
                type="number"
                min="0"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="showModal = false"
          >
            취소
          </button>
          <button
            class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            @click="saveMember"
          >
            {{ isEditing ? "수정" : "등록" }}
          </button>
        </div>
      </div>
    </div>
    <!-- Point History Modal -->
    <div
      v-if="showPointModal && pointMember"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showPointModal = false"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-800">
            {{ pointMember.name }} - 포인트 이력
          </h3>
          <span class="text-lg font-bold text-indigo-600">
            {{ formatNumber(pointMember.points) }}P
          </span>
        </div>

        <!-- 포인트 조정 -->
        <div class="mb-4 flex items-end gap-2 rounded-xl bg-slate-50 p-3">
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-slate-600">조정 포인트</label>
            <input
              v-model.number="adjustAmount"
              type="number"
              placeholder="+적립 / -차감"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-slate-600">사유</label>
            <input
              v-model="adjustDesc"
              type="text"
              placeholder="조정 사유"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="adjustAmount === 0 || adjusting"
            @click="adjustPoints"
          >
            적용
          </button>
        </div>

        <!-- 이력 리스트 -->
        <div v-if="pointLoading" class="flex justify-center py-8">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
        <div v-else-if="pointHistories.length === 0" class="py-8 text-center text-sm text-slate-400">
          포인트 이력이 없습니다
        </div>
        <div v-else class="max-h-72 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-slate-100">
                <th class="px-3 py-2 text-left text-xs font-medium text-slate-500">일시</th>
                <th class="px-3 py-2 text-center text-xs font-medium text-slate-500">유형</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-slate-500">포인트</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-slate-500">잔액</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-slate-500">설명</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="h in pointHistories" :key="h.id">
                <td class="px-3 py-2 text-slate-500">{{ formatDate(h.createdAt) }}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-medium" :class="pointTypeColors[h.type]">
                    {{ pointTypeLabels[h.type] ?? h.type }}
                  </span>
                </td>
                <td class="px-3 py-2 text-right font-medium" :class="h.type === 'USE' || h.type === 'EXPIRE' ? 'text-red-600' : 'text-green-600'">
                  {{ h.type === 'USE' || h.type === 'EXPIRE' ? '-' : '+' }}{{ formatNumber(h.amount) }}
                </td>
                <td class="px-3 py-2 text-right text-slate-600">{{ formatNumber(h.balance) }}P</td>
                <td class="px-3 py-2 text-slate-500 truncate max-w-[120px]">{{ h.description ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="showPointModal = false"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
