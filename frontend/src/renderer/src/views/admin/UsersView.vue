<script setup lang="ts">
import { ref } from "vue";

const users = ref([
  { id: 1, username: "admin", name: "시스템 관리자", role: "ADMIN", isActive: true },
  { id: 2, username: "manager", name: "매장 관리자", role: "MANAGER", isActive: true },
]);
const isLoading = ref(false);

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "최고 관리자",
    ADMIN: "관리자",
    MANAGER: "매니저",
    STAFF: "스태프",
  };
  return labels[role] ?? role;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">사용자 관리</h2>
        <p class="mt-1 text-sm text-slate-500">시스템 사용자를 관리합니다</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        사용자 추가
      </button>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
              사용자
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
              아이디
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              권한
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              상태
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              관리
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="user in users" :key="user.id" class="hover:bg-slate-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600"
                >
                  {{ user.name.charAt(0) }}
                </div>
                <span class="font-medium text-slate-800">{{ user.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-slate-600">
              {{ user.username }}
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                {{ getRoleLabel(user.role) }}
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                "
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="user.isActive ? 'bg-green-500' : 'bg-slate-400'"
                />
                {{ user.isActive ? "활성" : "비활성" }}
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <button
                class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
