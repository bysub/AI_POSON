<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isSidebarCollapsed = ref(false);

// 펼쳐진 메뉴 그룹
const expandedGroups = ref<string[]>(["main", "products"]);

// 메뉴 그룹 토글
function toggleGroup(groupId: string): void {
  const index = expandedGroups.value.indexOf(groupId);
  if (index > -1) {
    expandedGroups.value.splice(index, 1);
  } else {
    expandedGroups.value.push(groupId);
  }
}

// 현재 활성 메뉴
const activeMenu = computed(() => {
  const path = route.path;
  // 정확한 경로 매칭
  if (path === "/admin" || path === "/admin/") return "dashboard";
  if (path.includes("/admin/products")) return "products";
  if (path.includes("/admin/categories")) return "categories";
  if (path.includes("/admin/suppliers")) return "suppliers";
  if (path.includes("/admin/purchase-products")) return "purchase-products";
  if (path.includes("/admin/purchase/register")) return "purchase-register";
  if (path.includes("/admin/purchase/history")) return "purchase-history";
  if (path.includes("/admin/inventory/status")) return "inventory-status";
  if (path.includes("/admin/inventory/adjust")) return "inventory-adjust";
  if (path.includes("/admin/sales/register")) return "sales-register";
  if (path.includes("/admin/sales/history")) return "sales-history";
  if (path.includes("/admin/customers")) return "customers";
  if (path.includes("/admin/stats/purchase")) return "stats-purchase";
  if (path.includes("/admin/stats/sales")) return "stats-sales";
  if (path.includes("/admin/stats/products")) return "stats-products";
  if (path.includes("/admin/users")) return "users";
  if (path.includes("/admin/business")) return "business";
  if (path.includes("/admin/settings")) return "settings";
  if (path.includes("/admin/devices")) return "devices";
  return "dashboard";
});

// 현재 활성 그룹
const activeGroup = computed(() => {
  const menu = activeMenu.value;
  if (menu === "dashboard") return "main";
  if (["products", "categories"].includes(menu)) return "products";
  if (["purchase-register", "purchase-history", "suppliers", "purchase-products"].includes(menu))
    return "purchase";
  if (["inventory-status", "inventory-adjust"].includes(menu)) return "inventory";
  if (["sales-register", "sales-history", "customers"].includes(menu)) return "sales";
  if (["stats-purchase", "stats-sales", "stats-products"].includes(menu)) return "stats";
  if (["users", "business", "settings", "devices"].includes(menu)) return "settings";
  return "main";
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

// 메뉴 그룹 정의
const menuGroups = [
  {
    id: "main",
    label: "메인화면",
    icon: "home",
    items: [{ id: "dashboard", label: "대시보드", path: "/admin", icon: "dashboard" }],
  },
  {
    id: "products",
    label: "KIOSK 관리",
    icon: "inventory",
    items: [
      { id: "products", label: "KIOSK상품관리", path: "/admin/products", icon: "package" },
      { id: "categories", label: "카테고리", path: "/admin/categories", icon: "category" },
    ],
  },
  {
    id: "inventory",
    label: "재고관리",
    icon: "warehouse",
    items: [
      {
        id: "inventory-status",
        label: "재고현황",
        path: "/admin/inventory/status",
        icon: "boxes",
      },
      {
        id: "inventory-adjust",
        label: "재고조정",
        path: "/admin/inventory/adjust",
        icon: "adjust",
      },
    ],
  },
  {
    id: "purchase",
    label: "매입관리",
    icon: "cart-down",
    items: [
      {
        id: "purchase-register",
        label: "매입등록",
        path: "/admin/purchase/register",
        icon: "plus-circle",
      },
      /*{ id: "sales-register", label: "수동출고", path: "/admin/sales/register", icon: "cash" },*/
      {
        id: "purchase-history",
        label: "매입내역",
        path: "/admin/purchase/history",
        icon: "list",
      },
      { id: "suppliers", label: "거래처 관리", path: "/admin/suppliers", icon: "truck" },
      {
        id: "purchase-products",
        label: "매입상품관리",
        path: "/admin/purchase-products",
        icon: "box",
      },
    ],
  },
  {
    id: "sales",
    label: "매출관리",
    icon: "cart-up",
    items: [
      { id: "sales-history", label: "매출내역", path: "/admin/sales/history", icon: "receipt" },
      { id: "customers", label: "고객관리", path: "/admin/customers", icon: "users" },
    ],
  },
  {
    id: "stats",
    label: "통계관리",
    icon: "chart",
    items: [
      {
        id: "stats-purchase",
        label: "매입통계",
        path: "/admin/stats/purchase",
        icon: "chart-down",
      },
      { id: "stats-sales", label: "매출통계", path: "/admin/stats/sales", icon: "chart-up" },
      { id: "stats-products", label: "상품통계", path: "/admin/stats/products", icon: "chart-bar" },
    ],
  },
  {
    id: "settings",
    label: "설정",
    icon: "settings",
    items: [
      { id: "users", label: "사용자 관리", path: "/admin/users", icon: "user" },
      { id: "business", label: "사업자 관리", path: "/admin/business", icon: "building" },
      { id: "settings", label: "환경설정", path: "/admin/settings", icon: "cog" },
      { id: "devices", label: "기기 설정", path: "/admin/devices", icon: "device" },
    ],
  },
];

// 현재 활성 메뉴 라벨
const currentMenuLabel = computed(() => {
  for (const group of menuGroups) {
    const item = group.items.find((i) => i.id === activeMenu.value);
    if (item) return item.label;
  }
  return "관리자";
});

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
      <nav class="flex-1 overflow-y-auto p-3">
        <div v-for="group in menuGroups" :key="group.id" class="mb-2">
          <!-- Group Header -->
          <button
            v-if="!isSidebarCollapsed"
            class="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
            :class="
              activeGroup === group.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            "
            @click="toggleGroup(group.id)"
          >
            <span class="flex items-center gap-2">
              <!-- Group Icons -->
              <svg
                v-if="group.icon === 'home'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <svg
                v-else-if="group.icon === 'inventory'"
                class="h-4 w-4"
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
              <svg
                v-else-if="group.icon === 'cart-down'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <svg
                v-else-if="group.icon === 'warehouse'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                />
              </svg>
              <svg
                v-else-if="group.icon === 'cart-up'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="group.icon === 'chart'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <svg
                v-else-if="group.icon === 'settings'"
                class="h-4 w-4"
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
              {{ group.label }}
            </span>
            <svg
              class="h-4 w-4 transition-transform"
              :class="expandedGroups.includes(group.id) ? 'rotate-180' : ''"
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
          </button>

          <!-- Group Items -->
          <div
            v-show="isSidebarCollapsed || expandedGroups.includes(group.id)"
            class="space-y-0.5"
            :class="isSidebarCollapsed ? '' : 'ml-2'"
          >
            <RouterLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.path"
              class="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
              :class="
                activeMenu === item.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              "
            >
              <!-- Item Icons -->
              <div
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors"
                :class="
                  activeMenu === item.id
                    ? 'bg-indigo-200 text-indigo-700'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                "
              >
                <!-- Dashboard -->
                <svg
                  v-if="item.icon === 'dashboard'"
                  class="h-4 w-4"
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
                <!-- Package -->
                <svg
                  v-else-if="item.icon === 'package'"
                  class="h-4 w-4"
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
                  class="h-4 w-4"
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
                <!-- Truck -->
                <svg
                  v-else-if="item.icon === 'truck'"
                  class="h-4 w-4"
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
                <!-- Plus Circle -->
                <svg
                  v-else-if="item.icon === 'plus-circle'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <!-- List -->
                <svg
                  v-else-if="item.icon === 'list'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                <!-- Boxes -->
                <svg
                  v-else-if="item.icon === 'boxes'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <!-- Adjust -->
                <svg
                  v-else-if="item.icon === 'adjust'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <!-- Cash -->
                <svg
                  v-else-if="item.icon === 'cash'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <!-- Receipt -->
                <svg
                  v-else-if="item.icon === 'receipt'"
                  class="h-4 w-4"
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
                <!-- Users -->
                <svg
                  v-else-if="item.icon === 'users'"
                  class="h-4 w-4"
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
                <!-- Chart Down -->
                <svg
                  v-else-if="item.icon === 'chart-down'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
                <!-- Chart Up -->
                <svg
                  v-else-if="item.icon === 'chart-up'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <!-- Chart Bar -->
                <svg
                  v-else-if="item.icon === 'chart-bar'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <!-- User -->
                <svg
                  v-else-if="item.icon === 'user'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <!-- Building -->
                <svg
                  v-else-if="item.icon === 'building'"
                  class="h-4 w-4"
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
                <!-- Cog -->
                <svg
                  v-else-if="item.icon === 'cog'"
                  class="h-4 w-4"
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
                <!-- Device -->
                <svg
                  v-else-if="item.icon === 'device'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <!-- Box (매입상품) -->
                <svg
                  v-else-if="item.icon === 'box'"
                  class="h-4 w-4"
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
              </div>
              <Transition name="fade">
                <span v-if="!isSidebarCollapsed" class="truncate">{{ item.label }}</span>
              </Transition>
            </RouterLink>
          </div>
        </div>
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
              {{ currentMenuLabel }}
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
