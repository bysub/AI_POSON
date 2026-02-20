# Component Patterns

## Main Entry Point (main.js)

### Minimal Setup

```javascript
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "./assets/styles/app.scss";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
```

### Full Setup with Element Plus & AG Grid

```javascript
import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import {
  UserFilled,
  Check,
  Close,
  Search,
  RefreshRight,
  List,
  Plus,
  Download,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  UploadFilled,
  Delete,
  Document,
  Files,
  Folder,
  FolderOpened,
  Avatar,
} from "@element-plus/icons-vue";
import "element-plus/dist/index.css";
import VueTree from "vue3-tree";
import "vue3-tree/dist/style.css";

// AG Grid
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

import App from "./App.vue";
import router from "./router";
import "./assets/styles/app.scss";

const app = createApp(App);

// Register only used Element Plus icons (tree-shaking)
const icons = {
  UserFilled,
  Check,
  Close,
  Search,
  RefreshRight,
  List,
  Plus,
  Download,
  ArrowLeft,
  ArrowRight,
  UploadFilled,
  Delete,
  Document,
  Files,
  ArrowUp,
  ArrowDown,
  Folder,
  FolderOpened,
  Avatar,
};
Object.entries(icons).forEach(([key, component]) => {
  app.component(key, component);
});

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.component("VueTree", VueTree);

app.mount("#app");
```

## Router Configuration

### Basic Router with Auth Guard

```typescript
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type Router,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () =>
      import(
        /* webpackChunkName: "auth" */
        "@/views/common/Login.vue"
      ),
    meta: { requiresAuth: false, layout: "empty" },
  },
  {
    path: "/",
    meta: { requiresAuth: true, layout: "default" },
    children: [
      {
        path: "/dashboard",
        name: "Dashboard",
        component: () =>
          import(
            /* webpackChunkName: "dashboard" */
            /* webpackPrefetch: true */
            "@/views/common/Dashboard.vue"
          ),
      },
      {
        path: "/:pathMatch(.*)*",
        redirect: "/dashboard",
      },
    ],
  },
];

const router: Router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach(
  (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const user = localStorage.getItem("user");

    if (to.meta.requiresAuth && !user) {
      next("/login");
    } else if (to.path === "/login" && user) {
      next("/dashboard");
    } else {
      next();
    }
  },
);

export default router;
```

## Pinia Store Pattern

### Basic Store

```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import http from "@/utils/TransUtils";

interface User {
  id: string;
  name: string;
  email: string;
}

export const useUserStore = defineStore("user", () => {
  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const userCount = computed(() => users.value.length);

  // Actions
  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await http.post("/sys/user/list");
      users.value = response.data.list;
    } catch (e) {
      error.value = "Failed to fetch users";
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  return {
    users,
    loading,
    error,
    userCount,
    fetchUsers,
  };
});
```

## App.vue Pattern

```vue
<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppLayout from "@/components/layout/AppLayout.vue";

const route = useRoute();

const layout = computed(() => {
  const layoutName = route.meta.layout || "default";
  return layoutName === "empty" ? "div" : AppLayout;
});
</script>

<style lang="scss">
// Global styles are imported in main.js
</style>
```

## Layout Components

### AppLayout.vue

```vue
<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="main-content">
      <AppHeader />
      <main class="page-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from "./AppHeader.vue";
import AppSidebar from "./AppSidebar.vue";
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: $sidebar-width;
  background: $content-bg;
}

.page-content {
  flex: 1;
  padding: $content-padding;
}
</style>
```

## Common Components

### ErrorBoundary.vue

```vue
<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <el-icon class="error-icon"><WarningFilled /></el-icon>
      <h3>오류가 발생했습니다</h3>
      <p>{{ error.message }}</p>
      <el-button type="primary" @click="reset">다시 시도</el-button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";
import { WarningFilled } from "@element-plus/icons-vue";

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err;
  return false;
});

const reset = () => {
  error.value = null;
};
</script>
```

### Pagination.vue

```vue
<template>
  <div class="pagination-wrapper">
    <div class="pagination-info">
      총 <strong>{{ total }}</strong
      >건
    </div>
    <el-pagination
      v-model:current-page="currentPageModel"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  total: number;
  currentPage: number;
  pageSize: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  change: [page: number];
}>();

const currentPageModel = computed({
  get: () => props.currentPage,
  set: (val) => emit("change", val),
});

const handleChange = (page: number) => {
  emit("change", page);
};
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}
</style>
```

## Utility Functions

### TransUtils.ts (Axios HTTP Client)

```typescript
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import router from "@/router";

const API_VERSION = "v1";
const BASE_URL = `/api/${API_VERSION}`;
const CORRELATION_ID_HEADER = "x-correlation-id";

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const correlationId = uuidv4();
    config.headers[CORRELATION_ID_HEADER] = correlationId;

    if (import.meta.env.DEV) {
      console.debug(`[${correlationId}] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(error);
  },
);

// Response interceptor
http.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError): Promise<never> => {
    if (error.response) {
      const status = error.response.status;
      const requestUrl = error.config?.url || "";

      switch (status) {
        case 401:
        case 403:
          if (!requestUrl.includes("/login") && !requestUrl.includes("/logout")) {
            if (router.currentRoute.value.path !== "/login") {
              localStorage.removeItem("user");
              router.push("/login");
            }
          }
          break;
        case 500:
          console.error("서버 에러가 발생했습니다.");
          break;
      }
    }
    return Promise.reject(error);
  },
);

export default http;
```

### AlertUtils.ts

```typescript
import Swal from "sweetalert2";

type ConfirmIcon = "promotion" | "check" | "close" | "delete" | "save" | "folder";

export const showConfirm = async (actionName: string, icon: ConfirmIcon = "promotion") => {
  return Swal.fire({
    html: `<p>${actionName} 하시겠습니까?</p>`,
    showCancelButton: true,
    confirmButtonText: actionName,
    cancelButtonText: "취소",
    customClass: {
      popup: "custom-confirm-popup",
      confirmButton: "confirm-btn-primary",
      cancelButton: "confirm-btn-cancel",
    },
    buttonsStyling: false,
  });
};

export const showAlert = async (title: string, message?: string) => {
  return Swal.fire({
    title,
    text: message,
    icon: "info",
    confirmButtonText: "확인",
  });
};

export const showErrorToast = (message: string) => {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 3000,
  });
};
```

### GridUtils.ts

```typescript
import type { ColDef, GridApi } from "ag-grid-community";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const commonColDef: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  suppressMovable: true,
};

export const exportGridData = async (gridApi: GridApi, filename: string, sheetName = "Sheet1") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Get column definitions
  const columns = gridApi.getColumnDefs() as ColDef[];

  // Set headers
  worksheet.columns = columns.map((col) => ({
    header: col.headerName || col.field || "",
    key: col.field || "",
    width: 20,
  }));

  // Add data rows
  gridApi.forEachNode((node) => {
    if (node.data) {
      worksheet.addRow(node.data);
    }
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
};
```
