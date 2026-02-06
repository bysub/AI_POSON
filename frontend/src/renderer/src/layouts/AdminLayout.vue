<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isSidebarCollapsed = ref(false);

// 현재 활성 메뉴
const activeMenu = computed(() => {
  const path = route.path;
  if (path.includes("/admin/products")) return "products";
  if (path.includes("/admin/categories")) return "categories";
  if (path.includes("/admin/orders")) return "orders";
  if (path.includes("/admin/settings")) return "settings";
  return "dashboard";
});

// 관리자 이니셜
const adminInitial = computed(() => {
  const name = authStore.admin?.name ?? authStore.admin?.username ?? "A";
  return name.charAt(0).toUpperCase();
});

// 관리자 이름
const adminDisplayName = computed(() => {
  return authStore.admin?.name ?? authStore.admin?.username ?? "관리자";
});

// 메뉴 아이템
const menuItems = [
  {
    id: "dashboard",
    label: "대시보드",
    icon: "dashboard",
    path: "/admin",
  },
  {
    id: "products",
    label: "상품 관리",
    icon: "inventory",
    path: "/admin/products",
  },
  {
    id: "categories",
    label: "카테고리",
    icon: "category",
    path: "/admin/categories",
  },
  {
    id: "orders",
    label: "주문 내역",
    icon: "receipt",
    path: "/admin/orders",
  },
  {
    id: "settings",
    label: "설정",
    icon: "settings",
    path: "/admin/settings",
  },
];

function handleLogout(): void {
  authStore.logout();
  router.push("/");
}

function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}
</script>

<template>
  <div class="flex h-screen bg-slate-50">
    <!-- Sidebar -->
    <aside
      class="flex flex-col border-r border-slate-200 bg-white transition-all duration-300"
      :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- Logo -->
      <div class="flex h-16 items-center border-b border-slate-200 px-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600"
          >
            <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
              />
            </svg>
          </div>
          <Transition name="fade">
            <div v-if="!isSidebarCollapsed" class="overflow-hidden">
              <h1 class="text-lg font-bold text-slate-800">POSON</h1>
              <p class="text-xs text-slate-500">Admin Console</p>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-1 overflow-y-auto p-3">
        <RouterLink
          v-for="item in menuItems"
          :key="item.id"
          :to="item.path"
          class="group flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all duration-200"
          :class="
            activeMenu === item.id
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          "
        >
          <!-- Icons -->
          <div
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            :class="
              activeMenu === item.id
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
            "
          >
            <!-- Dashboard -->
            <svg
              v-if="item.icon === 'dashboard'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <!-- Inventory -->
            <svg
              v-else-if="item.icon === 'inventory'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <!-- Category -->
            <svg
              v-else-if="item.icon === 'category'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <!-- Receipt -->
            <svg
              v-else-if="item.icon === 'receipt'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <!-- Settings -->
            <svg
              v-else-if="item.icon === 'settings'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <Transition name="fade">
            <span v-if="!isSidebarCollapsed" class="truncate">{{ item.label }}</span>
          </Transition>
        </RouterLink>
      </nav>

      <!-- User Section -->
      <div class="border-t border-slate-200 p-3">
        <div
          class="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
          :class="isSidebarCollapsed ? 'justify-center' : ''"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white"
          >
            {{ adminInitial }}
          </div>
          <Transition name="fade">
            <div v-if="!isSidebarCollapsed" class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-800">
                {{ adminDisplayName }}
              </p>
              <p class="text-xs text-slate-500">
                {{ authStore.admin?.role }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Actions -->
        <div class="mt-2 flex gap-2" :class="isSidebarCollapsed ? 'flex-col' : ''">
          <RouterLink
            to="/"
            class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span v-if="!isSidebarCollapsed">키오스크</span>
          </RouterLink>
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            @click="handleLogout"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span v-if="!isSidebarCollapsed">로그아웃</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top Bar -->
      <header
        class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6"
      >
        <div class="flex items-center gap-4">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            @click="toggleSidebar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div>
            <h2 class="text-lg font-semibold text-slate-800">
              {{ menuItems.find((m) => m.id === activeMenu)?.label ?? "관리자" }}
            </h2>
            <p class="text-xs text-slate-500">POSON Kiosk Management System</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Quick Actions -->
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto bg-slate-50 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
