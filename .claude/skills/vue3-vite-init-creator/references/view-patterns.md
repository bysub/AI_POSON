# View Component Patterns

## 1. List View (Search + Grid + Pagination)

```vue
<template>
  <ErrorBoundary>
    <div class="list-container">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-form">
          <div class="search-group">
            <label class="search-label">검색조건</label>
            <el-select v-model="searchParams.field" placeholder="전체" class="search-select">
              <el-option label="전체" value="" />
            </el-select>
          </div>
          <div class="search-actions">
            <el-button type="primary" @click="fetchData">
              <el-icon><Search /></el-icon> 검색
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><RefreshRight /></el-icon> 초기화
            </el-button>
            <div class="action-separator"></div>
            <el-button type="primary" @click="goRegister">
              <el-icon><Plus /></el-icon> 등록
            </el-button>
            <el-button @click="onExcelExport">
              <el-icon><Download /></el-icon> EXCEL
            </el-button>
          </div>
        </div>
      </div>

      <!-- Grid Section -->
      <div class="grid-section">
        <div class="grid-body">
          <ag-grid-vue
            class="ag-theme-quartz"
            :rowData="dataList"
            :columnDefs="columnDefs"
            :defaultColDef="defaultColDef"
            style="height: 100%; width: 100%;"
            @grid-ready="onGridReady"
            @row-clicked="onRowClicked"
          />
        </div>

        <!-- Pagination (common component) -->
        <Pagination
          :total="pagination.total"
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          @change="goToPage"
        />
      </div>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { GridApi, ColDef } from "ag-grid-community";
import { commonColDef, exportGridData } from "@/utils/GridUtils";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import Pagination from "@/components/common/Pagination.vue";
import { Search, RefreshRight, Plus, Download } from "@element-plus/icons-vue";

// Grid API
let gridApi: GridApi | null = null;

// Search params
const searchParams = ref({
  field: "",
  keyword: "",
});

// Data
const dataList = ref([]);
const pagination = ref({
  total: 0,
  pageNum: 1,
  pageSize: 20,
});

// Column definitions
const columnDefs: ColDef[] = [
  { field: "id", headerName: "ID", width: 80 },
  { field: "name", headerName: "이름", flex: 1 },
  { field: "status", headerName: "상태", width: 100 },
];

const defaultColDef: ColDef = {
  ...commonColDef,
};

// Grid ready
const onGridReady = (params: { api: GridApi }) => {
  gridApi = params.api;
};

// Fetch data
const fetchData = async () => {
  // API call
};

// Reset search
const resetSearch = () => {
  searchParams.value = { field: "", keyword: "" };
  fetchData();
};

// Pagination
const goToPage = (page: number) => {
  pagination.value.pageNum = page;
  fetchData();
};

// Excel export
const onExcelExport = () => {
  if (gridApi) {
    exportGridData(gridApi, "export");
  }
};

// Row click
const onRowClicked = (event: { data: any }) => {
  console.log("Selected:", event.data);
};

// Register
const goRegister = () => {
  // Navigate or open modal
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.search-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
}

.search-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .search-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
  }

  .search-select {
    width: 180px;
  }
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-separator {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 8px;
}

.grid-section {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.grid-body {
  flex: 1;
  min-height: 0;
}

// AG Grid common styles
:deep(.ag-header-cell) {
  background-color: #f9fafb;
  font-weight: 600;
  font-size: 13px;
  color: #374151;
}

:deep(.ag-cell) {
  font-size: 13px;
  color: #374151;
}

:deep(.ag-row) {
  cursor: pointer;
  &:hover {
    background-color: rgba(37, 99, 235, 0.04);
  }
}

:deep(.ag-cell-focus),
:deep(.ag-cell:focus) {
  border: none !important;
  outline: none !important;
}

:deep(.cell-link) {
  color: #2563eb;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}
</style>
```

## 2. Split View (Master-Detail)

Used for code management, authorization management, etc.

```vue
<template>
  <ErrorBoundary>
    <div class="split-container">
      <div class="split-layout">
        <!-- Left Panel -->
        <div class="left-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Folder /></el-icon>
              마스터 목록
            </div>
            <div class="section-content">
              <div class="grid-actions">
                <el-button type="primary" size="small" @click="goRegister">
                  <el-icon><Plus /></el-icon> 등록
                </el-button>
              </div>
              <div class="grid-wrapper">
                <ag-grid-vue
                  class="ag-theme-quartz"
                  :rowData="masterList"
                  :columnDefs="masterColumnDefs"
                  style="height: 100%; width: 100%;"
                  @row-clicked="onMasterRowClicked"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel -->
        <div class="right-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Document /></el-icon>
              상세 정보
            </div>
            <div class="section-content">
              <div v-if="selectedMaster" class="detail-form">
                <!-- Detail content -->
              </div>
              <div v-else class="empty-state">좌측 목록에서 항목을 선택하세요.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import { Folder, Document, Plus } from "@element-plus/icons-vue";

const masterList = ref([]);
const selectedMaster = ref(null);

const masterColumnDefs = [
  { field: "code", headerName: "코드", width: 100 },
  { field: "name", headerName: "코드명", flex: 1 },
];

const onMasterRowClicked = (event: { data: any }) => {
  selectedMaster.value = event.data;
};

const goRegister = () => {
  // Open register modal
};
</script>

<style lang="scss" scoped>
.split-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 180px);
}

.left-panel {
  width: 45%;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
}

.detail-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    padding: 10px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;

    .section-icon {
      color: #2563eb;
      font-size: 16px;
    }
  }

  .section-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #fff;
    overflow: auto;
    min-height: 0;
  }
}

.grid-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.grid-wrapper {
  flex: 1;
  min-height: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}
</style>
```

## 3. Register/Edit Modal Form

```vue
<template>
  <div class="register-container">
    <!-- Info Section -->
    <div class="detail-section">
      <div class="section-title">
        <el-icon class="section-icon"><Document /></el-icon>
        기본 정보
      </div>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-item">
            <label>코드 <span class="required">*</span></label>
            <el-input v-model="form.code" placeholder="코드 입력" :disabled="isEditMode" />
          </div>
          <div class="info-item">
            <label>코드명 <span class="required">*</span></label>
            <el-input v-model="form.name" placeholder="코드명 입력" />
          </div>
          <div class="info-item full-width">
            <label>비고</label>
            <el-input v-model="form.remark" placeholder="비고 입력" />
          </div>
        </div>
      </div>
    </div>

    <!-- Button Area -->
    <div class="detail-footer">
      <el-button type="primary" @click="handleSubmit">
        <el-icon><Check /></el-icon> 저장
      </el-button>
      <el-button @click="emit('close')">닫기</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Check, Document } from "@element-plus/icons-vue";
import { showConfirm, showAlert } from "@/utils/AlertUtils";
import { ElMessage } from "element-plus";

interface Props {
  mode: "create" | "edit";
  data?: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const isEditMode = props.mode === "edit";

const form = ref({
  code: "",
  name: "",
  remark: "",
});

const handleSubmit = async () => {
  // Validation
  if (!form.value.code) {
    ElMessage.warning("코드를 입력하세요.");
    return;
  }
  if (!form.value.name) {
    ElMessage.warning("코드명을 입력하세요.");
    return;
  }

  // Confirm
  const result = await showConfirm("저장", "save");
  if (!result.isConfirmed) return;

  try {
    // API call
    await showAlert("저장 완료", "저장되었습니다.");
    emit("saved");
    emit("close");
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  if (isEditMode && props.data) {
    form.value = { ...props.data };
  }
});
</script>

<style lang="scss" scoped>
.register-container {
  padding: 0;
}

.detail-section {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    padding: 10px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;

    .section-icon {
      color: #2563eb;
      font-size: 16px;
    }
  }

  .section-content {
    padding: 16px;
    background: #fff;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;

    .required {
      color: #dc2626;
    }
  }

  :deep(.el-input),
  :deep(.el-select) {
    width: 100%;
  }
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
```

## 4. Login View

```vue
<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ appTitle }}</h1>
        <p class="login-subtitle">로그인하여 시작하세요</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="userId">
          <el-input
            v-model="form.userId"
            placeholder="아이디"
            prefix-icon="UserFilled"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="비밀번호"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="loading"
          @click="handleLogin"
        >
          로그인
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import { useLoginStore } from "@/stores/common/login/loginStore";

const router = useRouter();
const loginStore = useLoginStore();

const appTitle = import.meta.env.VITE_APP_TITLE || "Admin Dashboard";

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  userId: "",
  password: "",
});

const rules: FormRules = {
  userId: [{ required: true, message: "아이디를 입력하세요", trigger: "blur" }],
  password: [{ required: true, message: "비밀번호를 입력하세요", trigger: "blur" }],
};

const handleLogin = async () => {
  const valid = await formRef.value?.validate();
  if (!valid) return;

  loading.value = true;
  try {
    const result = await loginStore.login(form.userId, form.password);
    if (result.success) {
      router.push("/dashboard");
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #6b7280;
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}
</style>
```

## Common Icons (Element Plus)

```typescript
import {
  Search, // Search
  RefreshRight, // Reset
  Plus, // Register/Add
  Download, // Excel download
  Check, // Save/Confirm
  Document, // Document
  Folder, // Folder
  User, // User
  Setting, // Settings
  Lock, // Lock/Permission
  Edit, // Edit
  Delete, // Delete
  Menu, // Menu
  Calendar, // Calendar
  Paperclip, // Attachment
} from "@element-plus/icons-vue";
```

## Development Checklist

When developing new views, check the following:

- [ ] Wrap with ErrorBoundary at top level
- [ ] Use common Pagination component (no inline pagination)
- [ ] Apply AG Grid common styles (remove cell focus border)
- [ ] Add icon to section title (section-icon class)
- [ ] Use Element Plus buttons (el-button)
- [ ] Use common AlertUtils (showConfirm, showAlert, showErrorToast)
- [ ] Define TypeScript interfaces
- [ ] Load modals dynamically with defineAsyncComponent
