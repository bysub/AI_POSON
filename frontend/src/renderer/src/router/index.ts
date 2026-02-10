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
      // 메인화면
      {
        path: "",
        name: "AdminDashboard",
        component: () => import("@/views/admin/DashboardView.vue"),
        meta: { title: "대시보드", requiresAuth: true },
      },

      // 상품 관리
      {
        path: "products",
        name: "AdminProducts",
        component: () => import("@/views/admin/ProductsView.vue"),
        meta: { title: "상품관리", requiresAuth: true },
      },
      {
        path: "categories",
        name: "AdminCategories",
        component: () => import("@/views/admin/CategoriesView.vue"),
        meta: { title: "카테고리", requiresAuth: true },
      },
      {
        path: "suppliers",
        name: "AdminSuppliers",
        component: () => import("@/views/admin/SuppliersView.vue"),
        meta: { title: "거래처 관리", requiresAuth: true },
      },
      {
        path: "purchase-products",
        name: "AdminPurchaseProducts",
        component: () => import("@/views/admin/PurchaseProductsView.vue"),
        meta: { title: "매입상품관리", requiresAuth: true },
      },
      {
        path: "branch-codes",
        name: "AdminBranchCodes",
        component: () => import("@/views/admin/BranchCodeView.vue"),
        meta: { title: "분류등록관리", requiresAuth: true },
      },

      // 매입관리
      {
        path: "purchase/register",
        name: "AdminPurchaseRegister",
        component: () => import("@/views/admin/PurchaseRegisterView.vue"),
        meta: { title: "매입등록", requiresAuth: true },
      },
      {
        path: "purchase/history",
        name: "AdminPurchaseHistory",
        component: () => import("@/views/admin/PurchaseHistoryView.vue"),
        meta: { title: "매입내역", requiresAuth: true },
      },

      // 재고관리
      {
        path: "inventory/status",
        name: "AdminInventoryStatus",
        component: () => import("@/views/admin/InventoryStatusView.vue"),
        meta: { title: "재고현황", requiresAuth: true },
      },
      {
        path: "inventory/adjust",
        name: "AdminInventoryAdjust",
        component: () => import("@/views/admin/InventoryAdjustView.vue"),
        meta: { title: "재고조정", requiresAuth: true },
      },

      // 매출관리
      {
        path: "sales/register",
        name: "AdminSalesRegister",
        component: () => import("@/views/admin/SalesRegisterView.vue"),
        meta: { title: "매출등록", requiresAuth: true },
      },
      {
        path: "sales/history",
        name: "AdminSalesHistory",
        component: () => import("@/views/admin/SalesHistoryView.vue"),
        meta: { title: "매출내역", requiresAuth: true },
      },
      {
        path: "customers",
        name: "AdminCustomers",
        component: () => import("@/views/admin/CustomersView.vue"),
        meta: { title: "고객관리", requiresAuth: true },
      },

      // 통계관리
      {
        path: "stats/purchase",
        name: "AdminStatsPurchase",
        component: () => import("@/views/admin/StatsPurchaseView.vue"),
        meta: { title: "매입통계", requiresAuth: true },
      },
      {
        path: "stats/sales",
        name: "AdminStatsSales",
        component: () => import("@/views/admin/StatsSalesView.vue"),
        meta: { title: "매출통계", requiresAuth: true },
      },
      {
        path: "stats/products",
        name: "AdminStatsProducts",
        component: () => import("@/views/admin/StatsProductsView.vue"),
        meta: { title: "상품통계", requiresAuth: true },
      },

      // 설정
      {
        path: "users",
        name: "AdminUsers",
        component: () => import("@/views/admin/UsersView.vue"),
        meta: { title: "사용자 관리", requiresAuth: true },
      },
      {
        path: "business",
        name: "AdminBusiness",
        component: () => import("@/views/admin/BusinessView.vue"),
        meta: { title: "사업자 관리", requiresAuth: true },
      },
      {
        path: "settings",
        name: "AdminSettings",
        component: () => import("@/views/admin/SettingsView.vue"),
        meta: { title: "환경설정", requiresAuth: true },
      },
      {
        path: "devices",
        name: "AdminDevices",
        component: () => import("@/views/admin/DevicesView.vue"),
        meta: { title: "기기 설정", requiresAuth: true },
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
