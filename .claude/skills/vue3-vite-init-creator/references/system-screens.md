# System Management Screens

## Overview

System management screens follow consistent patterns:

| Screen          | Layout              | Components                                  |
| --------------- | ------------------- | ------------------------------------------- |
| User Management | List + Modal        | Search, AG Grid, Pagination, Register Modal |
| Code Management | Master-Detail Split | Left Grid, Right Grid, Register Modal       |
| Menu Management | List + Tree         | Search, AG Grid, Tree, Register Modal       |
| Auth Management | Master-Detail Split | Left Grid, Right Tree with Checkbox         |

---

## 1. User Management (사용자 관리)

### SysUserIndex.vue

Main container with search, grid, and register modal.

```vue
<template>
  <ErrorBoundary>
    <div class="list-container">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-form">
          <div class="search-group">
            <label class="search-label">상태</label>
            <el-select v-model="searchParams.status" placeholder="전체" class="search-select">
              <el-option label="전체" value="" />
              <el-option label="재직" value="Y" />
              <el-option label="퇴직" value="N" />
            </el-select>
          </div>
          <div class="search-group">
            <label class="search-label">이름/사번</label>
            <el-input
              v-model="searchParams.keyword"
              placeholder="검색어 입력"
              class="search-input"
            />
          </div>
          <div class="search-actions">
            <el-button type="primary" @click="fetchData">
              <el-icon><Search /></el-icon> 검색
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><RefreshRight /></el-icon> 초기화
            </el-button>
            <div class="action-separator"></div>
            <el-button type="primary" @click="openRegister('create')">
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
            :rowData="userList"
            :columnDefs="columnDefs"
            :defaultColDef="defaultColDef"
            style="height: 100%; width: 100%;"
            @grid-ready="onGridReady"
            @row-clicked="onRowClicked"
          />
        </div>
        <Pagination
          :total="pagination.total"
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          @change="goToPage"
        />
      </div>

      <!-- Register Modal -->
      <el-dialog
        v-model="registerVisible"
        :title="registerMode === 'create' ? '사용자 등록' : '사용자 수정'"
        width="600px"
        destroy-on-close
      >
        <SysUserRegister
          v-if="registerVisible"
          :mode="registerMode"
          :data="selectedUser"
          @close="registerVisible = false"
          @saved="onSaved"
        />
      </el-dialog>
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
import SysUserRegister from "./SysUserRegister.vue";
import { useSysUserStore } from "@/stores/sys/userStore";
import { Search, RefreshRight, Plus, Download } from "@element-plus/icons-vue";

const store = useSysUserStore();

let gridApi: GridApi | null = null;

const searchParams = ref({
  status: "",
  keyword: "",
});

const userList = ref([]);
const pagination = ref({
  total: 0,
  pageNum: 1,
  pageSize: 20,
});

const registerVisible = ref(false);
const registerMode = ref<"create" | "edit">("create");
const selectedUser = ref(null);

const columnDefs: ColDef[] = [
  { field: "USER_ID", headerName: "사번", width: 100 },
  { field: "USER_NM", headerName: "이름", width: 120 },
  { field: "DEPT_NM", headerName: "부서", flex: 1 },
  { field: "POSITION_NM", headerName: "직위", width: 100 },
  { field: "EMAIL", headerName: "이메일", width: 200 },
  {
    field: "USE_YN",
    headerName: "상태",
    width: 80,
    cellRenderer: (params) => (params.value === "Y" ? "재직" : "퇴직"),
  },
];

const defaultColDef: ColDef = { ...commonColDef };

const onGridReady = (params: { api: GridApi }) => {
  gridApi = params.api;
};

const fetchData = async () => {
  const result = await store.fetchUserList({
    ...searchParams.value,
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
  });
  userList.value = result.list;
  pagination.value.total = result.totalCount;
};

const resetSearch = () => {
  searchParams.value = { status: "", keyword: "" };
  pagination.value.pageNum = 1;
  fetchData();
};

const goToPage = (page: number) => {
  pagination.value.pageNum = page;
  fetchData();
};

const onRowClicked = (event: { data: any }) => {
  selectedUser.value = event.data;
  registerMode.value = "edit";
  registerVisible.value = true;
};

const openRegister = (mode: "create" | "edit") => {
  registerMode.value = mode;
  selectedUser.value = null;
  registerVisible.value = true;
};

const onSaved = () => {
  registerVisible.value = false;
  fetchData();
};

const onExcelExport = () => {
  if (gridApi) exportGridData(gridApi, "사용자목록");
};

onMounted(() => fetchData());
</script>
```

---

## 2. Code Management (코드 관리)

### SysCodeList.vue

Master-detail split layout with left (group code) and right (detail code) grids.

```vue
<template>
  <ErrorBoundary>
    <div class="split-container">
      <div class="split-layout">
        <!-- Left Panel: Group Code -->
        <div class="left-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Folder /></el-icon>
              그룹 코드
            </div>
            <div class="section-content">
              <div class="grid-actions">
                <el-button type="primary" size="small" @click="openGroupRegister">
                  <el-icon><Plus /></el-icon> 등록
                </el-button>
              </div>
              <div class="grid-wrapper">
                <ag-grid-vue
                  class="ag-theme-quartz"
                  :rowData="groupCodeList"
                  :columnDefs="groupColumnDefs"
                  style="height: 100%; width: 100%;"
                  @row-clicked="onGroupRowClicked"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Detail Code -->
        <div class="right-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Document /></el-icon>
              상세 코드
              <span v-if="selectedGroup" class="section-subtitle">
                ({{ selectedGroup.GRP_CD }} - {{ selectedGroup.GRP_NM }})
              </span>
            </div>
            <div class="section-content">
              <template v-if="selectedGroup">
                <div class="grid-actions">
                  <el-button type="primary" size="small" @click="openDetailRegister">
                    <el-icon><Plus /></el-icon> 등록
                  </el-button>
                </div>
                <div class="grid-wrapper">
                  <ag-grid-vue
                    class="ag-theme-quartz"
                    :rowData="detailCodeList"
                    :columnDefs="detailColumnDefs"
                    style="height: 100%; width: 100%;"
                    @row-clicked="onDetailRowClicked"
                  />
                </div>
              </template>
              <div v-else class="empty-state">좌측 그룹 코드를 선택하세요.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import { useSysCodeStore } from "@/stores/sys/codeStore";
import { Folder, Document, Plus } from "@element-plus/icons-vue";

const store = useSysCodeStore();

const groupCodeList = ref([]);
const detailCodeList = ref([]);
const selectedGroup = ref(null);

const groupColumnDefs = [
  { field: "GRP_CD", headerName: "그룹코드", width: 120 },
  { field: "GRP_NM", headerName: "그룹명", flex: 1 },
];

const detailColumnDefs = [
  { field: "CD", headerName: "코드", width: 100 },
  { field: "CD_NM", headerName: "코드명", flex: 1 },
  { field: "SORT_NO", headerName: "정렬순서", width: 100 },
  { field: "USE_YN", headerName: "사용여부", width: 80 },
];

const onGroupRowClicked = async (event: { data: any }) => {
  selectedGroup.value = event.data;
  await fetchDetailCodes(event.data.GRP_CD);
};

const fetchGroupCodes = async () => {
  groupCodeList.value = await store.fetchGroupCodeList();
};

const fetchDetailCodes = async (grpCd: string) => {
  detailCodeList.value = await store.fetchDetailCodeList(grpCd);
};

onMounted(() => fetchGroupCodes());
</script>

<style lang="scss" scoped>
.split-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 180px);
}

.left-panel {
  width: 400px;
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
}

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
  }

  .section-subtitle {
    font-weight: 400;
    color: #6b7280;
  }
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-height: 0;
}

.grid-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
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
}
</style>
```

---

## 3. Menu Management (메뉴 관리)

### SysMenuList.vue

List view with tree display for hierarchical menu structure.

```vue
<template>
  <ErrorBoundary>
    <div class="list-container">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-form">
          <div class="search-group">
            <label class="search-label">메뉴명</label>
            <el-input v-model="searchParams.menuNm" placeholder="메뉴명 검색" />
          </div>
          <div class="search-actions">
            <el-button type="primary" @click="fetchData">
              <el-icon><Search /></el-icon> 검색
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><RefreshRight /></el-icon> 초기화
            </el-button>
            <div class="action-separator"></div>
            <el-button type="primary" @click="openRegister('create')">
              <el-icon><Plus /></el-icon> 등록
            </el-button>
          </div>
        </div>
      </div>

      <!-- Grid Section -->
      <div class="grid-section">
        <div class="grid-body">
          <ag-grid-vue
            class="ag-theme-quartz"
            :rowData="menuList"
            :columnDefs="columnDefs"
            :defaultColDef="defaultColDef"
            :treeData="true"
            :getDataPath="getDataPath"
            :groupDefaultExpanded="-1"
            style="height: 100%; width: 100%;"
            @row-clicked="onRowClicked"
          />
        </div>
      </div>

      <!-- Register Modal -->
      <el-dialog
        v-model="registerVisible"
        :title="registerMode === 'create' ? '메뉴 등록' : '메뉴 수정'"
        width="500px"
        destroy-on-close
      >
        <SysMenuRegister
          v-if="registerVisible"
          :mode="registerMode"
          :data="selectedMenu"
          :parent-menu-list="parentMenuList"
          @close="registerVisible = false"
          @saved="onSaved"
        />
      </el-dialog>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import SysMenuRegister from "./SysMenuRegister.vue";
import { useSysMenuStore } from "@/stores/sys/menuStore";

const store = useSysMenuStore();

const menuList = ref([]);
const parentMenuList = ref([]);
const selectedMenu = ref(null);
const registerVisible = ref(false);
const registerMode = ref<"create" | "edit">("create");

const searchParams = ref({ menuNm: "" });

const columnDefs = [
  { field: "MENU_NM", headerName: "메뉴명", flex: 1 },
  { field: "MENU_URL", headerName: "URL", width: 200 },
  { field: "SORT_NO", headerName: "순서", width: 80 },
  { field: "USE_YN", headerName: "사용", width: 80 },
];

const defaultColDef = {
  sortable: true,
  resizable: true,
};

// For tree data - return path array
const getDataPath = (data: any) => data.path;

const fetchData = async () => {
  const result = await store.fetchMenuList(searchParams.value);
  menuList.value = result.map((item) => ({
    ...item,
    path: item.MENU_PATH.split("/"),
  }));
  parentMenuList.value = result.filter((m) => m.MENU_LEVEL === 1);
};

const onRowClicked = (event: { data: any }) => {
  selectedMenu.value = event.data;
  registerMode.value = "edit";
  registerVisible.value = true;
};

const openRegister = (mode: "create" | "edit") => {
  registerMode.value = mode;
  selectedMenu.value = null;
  registerVisible.value = true;
};

const onSaved = () => {
  registerVisible.value = false;
  fetchData();
};

const resetSearch = () => {
  searchParams.value = { menuNm: "" };
  fetchData();
};

onMounted(() => fetchData());
</script>
```

---

## 4. Auth Management (권한 관리)

### SysAuthList.vue

Master-detail split with left (auth list) and right (menu tree with checkbox).

```vue
<template>
  <ErrorBoundary>
    <div class="split-container">
      <div class="split-layout">
        <!-- Left Panel: Auth List -->
        <div class="left-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Lock /></el-icon>
              권한 목록
            </div>
            <div class="section-content">
              <div class="grid-actions">
                <el-button type="primary" size="small" @click="openRegister">
                  <el-icon><Plus /></el-icon> 등록
                </el-button>
              </div>
              <div class="grid-wrapper">
                <ag-grid-vue
                  class="ag-theme-quartz"
                  :rowData="authList"
                  :columnDefs="authColumnDefs"
                  style="height: 100%; width: 100%;"
                  @row-clicked="onAuthRowClicked"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Menu Tree with Checkbox -->
        <div class="right-panel">
          <div class="detail-section">
            <div class="section-title">
              <el-icon class="section-icon"><Menu /></el-icon>
              메뉴 권한 설정
              <span v-if="selectedAuth" class="section-subtitle">
                ({{ selectedAuth.AUTH_NM }})
              </span>
            </div>
            <div class="section-content">
              <template v-if="selectedAuth">
                <div class="tree-toolbar">
                  <el-button size="small" @click="treeRef?.expandAll()">전체 펼치기</el-button>
                  <el-button size="small" @click="treeRef?.collapseAll()">전체 접기</el-button>
                  <el-button type="primary" size="small" @click="saveAuthMenu">
                    <el-icon><Check /></el-icon> 저장
                  </el-button>
                </div>
                <div class="tree-wrapper">
                  <CommonTree
                    ref="treeRef"
                    v-model:data="menuTreeData"
                    :show-checkbox="true"
                    @node-click="onMenuNodeClick"
                  />
                </div>
              </template>
              <div v-else class="empty-state">좌측 권한을 선택하세요.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import CommonTree from "@/components/common/CommonTree.vue";
import { useSysAuthStore } from "@/stores/sys/authStore";
import { showConfirm, showAlert } from "@/utils/AlertUtils";
import { Lock, Menu, Plus, Check } from "@element-plus/icons-vue";

const store = useSysAuthStore();

const authList = ref([]);
const selectedAuth = ref(null);
const menuTreeData = ref([]);
const treeRef = ref();

const authColumnDefs = [
  { field: "AUTH_CD", headerName: "권한코드", width: 120 },
  { field: "AUTH_NM", headerName: "권한명", flex: 1 },
  { field: "AUTH_DESC", headerName: "설명", flex: 1 },
];

const fetchAuthList = async () => {
  authList.value = await store.fetchAuthList();
};

const onAuthRowClicked = async (event: { data: any }) => {
  selectedAuth.value = event.data;
  await fetchMenuTree(event.data.AUTH_CD);
};

const fetchMenuTree = async (authCd: string) => {
  const result = await store.fetchAuthMenuTree(authCd);
  menuTreeData.value = result.menuTree;

  // Set checked keys for assigned menus
  const checkedKeys = result.assignedMenus.map((m) => m.MENU_CD);
  treeRef.value?.setCheckedKeys(checkedKeys);
};

const saveAuthMenu = async () => {
  const result = await showConfirm("저장", "save");
  if (!result.isConfirmed) return;

  const checkedKeys = treeRef.value?.getCheckedKeys() || [];
  const halfCheckedKeys = treeRef.value?.getHalfCheckedKeys() || [];

  await store.saveAuthMenu({
    authCd: selectedAuth.value.AUTH_CD,
    menuCodes: [...checkedKeys, ...halfCheckedKeys],
  });

  await showAlert("저장 완료", "권한 메뉴가 저장되었습니다.");
};

const openRegister = () => {
  // Open register modal
};

const onMenuNodeClick = (node: any) => {
  console.log("Menu clicked:", node);
};

onMounted(() => fetchAuthList());
</script>

<style lang="scss" scoped>
.tree-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tree-wrapper {
  flex: 1;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
}
</style>
```

---

## API Endpoints (Backend)

### User Management

- `POST /api/v1/sys/user/list` - Get user list
- `POST /api/v1/sys/user/detail` - Get user detail
- `POST /api/v1/sys/user/save` - Create/update user
- `POST /api/v1/sys/user/delete` - Delete user

### Code Management

- `POST /api/v1/sys/code/groupList` - Get group code list
- `POST /api/v1/sys/code/detailList` - Get detail code list
- `POST /api/v1/sys/code/saveGroup` - Save group code
- `POST /api/v1/sys/code/saveDetail` - Save detail code

### Menu Management

- `POST /api/v1/sys/menu/list` - Get menu list
- `POST /api/v1/sys/menu/save` - Save menu
- `POST /api/v1/sys/menu/delete` - Delete menu

### Auth Management

- `POST /api/v1/sys/auth/list` - Get auth list
- `POST /api/v1/sys/auth/menuTree` - Get menu tree with assignments
- `POST /api/v1/sys/auth/saveMenu` - Save auth menu assignments
- `POST /api/v1/sys/auth/save` - Save auth
