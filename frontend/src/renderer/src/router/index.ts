import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes: RouteRecordRaw[] = [
  // Kiosk Layout
  {
    path: "/",
    component: () => import("@/layouts/KioskLayout.vue"),
    children: [
      {
        path: "",
        name: "Welcome",
        component: () => import("@/views/WelcomeView.vue"),
        meta: { title: "환영합니다" },
      },
      {
        path: "menu",
        name: "Menu",
        component: () => import("@/views/MenuView.vue"),
        meta: { title: "메뉴 선택" },
      },
      {
        path: "payment",
        name: "Payment",
        component: () => import("@/views/PaymentView.vue"),
        meta: { title: "결제" },
      },
      {
        path: "complete",
        name: "Complete",
        component: () => import("@/views/CompleteView.vue"),
        meta: { title: "주문 완료" },
      },
    ],
  },

  // Admin Login (no layout - standalone)
  {
    path: "/admin/login",
    name: "AdminLogin",
    component: () => import("@/views/AdminLoginView.vue"),
    meta: { title: "관리자 로그인" },
  },

  // Admin Layout
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "AdminDashboard",
        component: () => import("@/views/admin/DashboardView.vue"),
        meta: { title: "대시보드", requiresAuth: true },
      },
      {
        path: "products",
        name: "AdminProducts",
        component: () => import("@/views/admin/ProductsView.vue"),
        meta: { title: "상품 관리", requiresAuth: true },
      },
      {
        path: "categories",
        name: "AdminCategories",
        component: () => import("@/views/admin/CategoriesView.vue"),
        meta: { title: "카테고리 관리", requiresAuth: true },
      },
      {
        path: "orders",
        name: "AdminOrders",
        component: () => import("@/views/admin/OrdersView.vue"),
        meta: { title: "주문 내역", requiresAuth: true },
      },
      {
        path: "settings",
        name: "AdminSettings",
        component: () => import("@/views/admin/SettingsView.vue"),
        meta: { title: "설정", requiresAuth: true },
      },
    ],
  },

  // Redirects
  {
    path: "/language",
    redirect: "/",
  },
  {
    path: "/cart",
    redirect: "/menu",
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 인증 가드
router.beforeEach((to, _from, next) => {
  // 인증이 필요한 페이지인지 확인
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();

    // 저장된 인증 정보 복원 시도
    if (!authStore.isAuthenticated) {
      authStore.restoreAuth();
    }

    // 여전히 인증되지 않았다면 로그인 페이지로
    if (!authStore.isAuthenticated) {
      next({
        name: "AdminLogin",
        query: { redirect: to.fullPath },
      });
      return;
    }
  }

  next();
});

export default router;
