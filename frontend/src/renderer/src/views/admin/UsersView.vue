<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/services/api/client";

interface Admin {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const admins = ref<Admin[]>([]);
const isLoading = ref(false);

// 모달
const showModal = ref(false);
const isEditing = ref(false);
const editId = ref("");
const form = ref({ username: "", password: "", name: "", role: "STAFF" });

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "최고 관리자",
  ADMIN: "관리자",
  MANAGER: "매니저",
  STAFF: "스태프",
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  MANAGER: "bg-blue-100 text-blue-700",
  STAFF: "bg-slate-100 text-slate-600",
};

async function loadAdmins(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Admin[] }>("/api/v1/admins");
    if (res.data.success) admins.value = res.data.data;
  } catch (err) {
    console.error("Failed to load admins:", err);
  } finally {
    isLoading.value = false;
  }
}

function openAddModal(): void {
  isEditing.value = false;
  editId.value = "";
  form.value = { username: "", password: "", name: "", role: "STAFF" };
  showModal.value = true;
}

function openEditModal(admin: Admin): void {
  isEditing.value = true;
  editId.value = admin.id;
  form.value = { username: admin.username, password: "", name: admin.name, role: admin.role };
  showModal.value = true;
}

async function saveAdmin(): Promise<void> {
  try {
    if (isEditing.value) {
      const data: Record<string, unknown> = { name: form.value.name, role: form.value.role };
      if (form.value.password) data.password = form.value.password;
      await apiClient.patch(`/api/v1/admins/${editId.value}`, data);
    } else {
      if (!form.value.username || !form.value.password || !form.value.name) return;
      await apiClient.post("/api/v1/admins", form.value);
    }
    showModal.value = false;
    await loadAdmins();
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    alert(axErr.response?.data?.message ?? "저장 실패");
  }
}

async function toggleActive(admin: Admin): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/admins/${admin.id}`, { isActive: !admin.isActive });
    await loadAdmins();
  } catch (err) {
    console.error("Failed to toggle:", err);
  }
}

async function deleteAdmin(admin: Admin): Promise<void> {
  if (!confirm(`"${admin.name}" 사용자를 삭제하시겠습니까?`)) return;
  try {
    await apiClient.delete(`/api/v1/admins/${admin.id}`);
    await loadAdmins();
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    alert(axErr.response?.data?.message ?? "삭제 실패");
  }
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR");
}

onMounted(() => loadAdmins());
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">사용자 관리</h2>
        <p class="mt-0.5 text-sm text-slate-500">시스템 사용자를 관리합니다</p>
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
        사용자 추가
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              사용자
            </th>
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              아이디
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              권한
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              상태
            </th>
            <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              최근 로그인
            </th>
            <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
              관리
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="admin in admins" :key="admin.id" class="hover:bg-slate-50">
            <td class="px-5 py-3">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600"
                >
                  {{ admin.name.charAt(0) }}
                </div>
                <span class="font-medium text-slate-800">{{ admin.name }}</span>
              </div>
            </td>
            <td class="px-5 py-3 text-sm text-slate-600">
              {{ admin.username }}
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="roleColors[admin.role] ?? 'bg-slate-100 text-slate-600'"
              >
                {{ roleLabels[admin.role] ?? admin.role }}
              </span>
            </td>
            <td class="px-5 py-3 text-center">
              <button
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="
                  admin.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                "
                @click="toggleActive(admin)"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="admin.isActive ? 'bg-green-500' : 'bg-slate-400'"
                />
                {{ admin.isActive ? "활성" : "비활성" }}
              </button>
            </td>
            <td class="px-5 py-3 text-sm text-slate-500">
              {{ formatDate(admin.lastLoginAt) }}
            </td>
            <td class="px-5 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                  title="수정"
                  @click="openEditModal(admin)"
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
                  title="삭제"
                  @click="deleteAdmin(admin)"
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
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">
          {{ isEditing ? "사용자 수정" : "사용자 추가" }}
        </h3>
        <div class="space-y-4">
          <div v-if="!isEditing">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">아이디</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="로그인 아이디"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">이름</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="이름"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">{{
              isEditing ? "비밀번호 (변경시)" : "비밀번호"
            }}</label>
            <input
              v-model="form.password"
              type="password"
              :placeholder="isEditing ? '변경할 비밀번호' : '비밀번호'"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">권한</label>
            <select
              v-model="form.role"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="SUPER_ADMIN">최고 관리자</option>
              <option value="ADMIN">관리자</option>
              <option value="MANAGER">매니저</option>
              <option value="STAFF">스태프</option>
            </select>
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
            @click="saveAdmin"
          >
            {{ isEditing ? "수정" : "추가" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
