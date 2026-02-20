# Common Components

## CommonTree.vue

Tree structure component with expand/collapse and checkbox support.

### Features

- Hierarchical data display
- Expand/collapse all nodes
- Checkbox mode for selection
- Custom node icons (Folder, Document, Avatar)
- v-memo optimization for performance

### Props

| Prop           | Type           | Default  | Description              |
| -------------- | -------------- | -------- | ------------------------ |
| data           | TreeNode[]     | []       | Tree data array          |
| showCheckbox   | boolean        | false    | Enable checkbox mode     |
| showLines      | boolean        | true     | Show tree lines          |
| useDefaultData | boolean        | false    | Load data from API       |
| treeType       | string         | 'COMMON' | Tree type for API        |
| authIdx        | string/boolean | false    | Auth index for filtering |

### Events

| Event       | Payload    | Description  |
| ----------- | ---------- | ------------ |
| update:data | TreeNode[] | Data updated |
| node-click  | TreeNode   | Node clicked |

### Exposed Methods

| Method               | Description           |
| -------------------- | --------------------- |
| setCheckedKeys(keys) | Set checked node keys |
| getCheckedKeys()     | Get checked node keys |
| getHalfCheckedKeys() | Get half-checked keys |
| expandAll()          | Expand all nodes      |
| collapseAll()        | Collapse all nodes    |

### Template

```vue
<script setup lang="ts">
import { computed, onMounted, ref, type Ref, type ComputedRef } from "vue";

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  OBS_COD: string;
  OBS_NM: string;
  PRNT_OBS_COD?: string;
  NODE_TYPE?: number | null;
  [key: string]: unknown;
}

interface Props {
  data?: TreeNode[];
  showCheckbox?: boolean;
  showLines?: boolean;
  useDefaultData?: boolean;
  treeType?: string;
  authIdx?: string | boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showCheckbox: false,
  showLines: true,
  useDefaultData: false,
  treeType: "COMMON",
  authIdx: false,
});

const emit = defineEmits<{
  "update:data": [data: TreeNode[]];
  "node-click": [node: TreeNode];
}>();

const treeRef = ref(null);
const expandedKeys = ref<string[]>([]);

// Tree data computed
const treeData = computed({
  get: () => props.data,
  set: (val) => emit("update:data", val),
});

// Expand all nodes
const expandAll = () => {
  const nodes = treeRef.value?.store?.root?.childNodes || [];
  const expandNode = (node: any) => {
    node.expanded = true;
    if (node.childNodes?.length > 0) {
      node.childNodes.forEach(expandNode);
    }
  };
  nodes.forEach(expandNode);
};

// Collapse all nodes
const collapseAll = () => {
  const nodes = treeRef.value?.store?.root?.childNodes || [];
  const collapseNode = (node: any) => {
    node.expanded = false;
    if (node.childNodes?.length > 0) {
      node.childNodes.forEach(collapseNode);
    }
  };
  nodes.forEach(collapseNode);
};

// Build tree from flat list
const buildTree = (flatList: any[]) => {
  const map: Record<string, TreeNode> = {};
  const tree: TreeNode[] = [];

  flatList.forEach((item) => {
    map[item.OBS_COD] = {
      ...item,
      id: item.OBS_COD,
      label: item.OBS_NM,
      children: [],
    };
  });

  flatList.forEach((item) => {
    const node = map[item.OBS_COD];
    if (item.PRNT_OBS_COD && map[item.PRNT_OBS_COD]) {
      map[item.PRNT_OBS_COD].children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};

defineExpose({
  setCheckedKeys: (keys: string[]) => treeRef.value?.setCheckedKeys(keys),
  getCheckedKeys: () => treeRef.value?.getCheckedKeys(),
  getHalfCheckedKeys: () => treeRef.value?.getHalfCheckedKeys(),
  expandAll,
  collapseAll,
});
</script>

<template>
  <div
    class="common-tree-container"
    :class="{ 'with-lines': showLines, 'with-checkbox': showCheckbox }"
  >
    <el-tree
      ref="treeRef"
      :data="treeData"
      :show-checkbox="showCheckbox"
      node-key="id"
      :props="{ children: 'children', label: 'label' }"
      :default-expanded-keys="expandedKeys"
      :expand-on-click-node="false"
      class="custom-tree"
      @node-click="(node) => emit('node-click', node)"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <el-icon v-if="data.NODE_TYPE === 0" class="tree-icon folder-icon">
            <FolderOpened v-if="node.expanded" />
            <Folder v-else />
          </el-icon>
          <el-icon v-else-if="!data.children?.length" class="tree-icon file-icon">
            <Document />
          </el-icon>
          <span class="tree-label">{{ node.label }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>
```

### Usage Example

```vue
<template>
  <CommonTree v-model:data="treeData" :show-checkbox="true" @node-click="handleNodeClick" />
</template>

<script setup>
import CommonTree from "@/components/common/CommonTree.vue";
import { ref } from "vue";

const treeData = ref([]);
const handleNodeClick = (node) => {
  console.log("Selected:", node);
};
</script>
```

---

## MultiFileUpload.vue

Drag & drop file upload component with progress, preview, and download.

### Features

- Drag & drop file upload
- Multiple file selection
- File type validation
- File size limit (200MB default)
- Upload progress indicator
- Download single/multiple files (zip)
- Delete files (soft delete until save)

### Props

| Prop      | Type   | Default   | Description                   |
| --------- | ------ | --------- | ----------------------------- |
| userId    | string | ''        | User ID for upload            |
| menuCd    | string | ''        | Menu code                     |
| dataIdx   | string | ''        | Data index (parent record ID) |
| workType  | string | 'DEFAULT' | Work type                     |
| workGubun | string | ''        | Work category                 |

### Events

| Event           | Payload       | Description              |
| --------------- | ------------- | ------------------------ |
| update:atchIdx  | string/number | Attachment index updated |
| uploaded        | string/number | Upload completed         |
| update:fileList | FileItem[]    | File list updated        |

### Exposed Methods

| Method        | Return                | Description             |
| ------------- | --------------------- | ----------------------- |
| startUpload() | Promise<UploadResult> | Start upload process    |
| hasFiles      | boolean               | Has files to upload     |
| deletedFiles  | FileItem[]            | List of deleted files   |
| fetchFiles()  | Promise<void>         | Fetch files from server |

### Allowed File Types

```typescript
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
```

### Usage Example

```vue
<template>
  <MultiFileUpload
    ref="fileUploadRef"
    :user-id="userId"
    :menu-cd="'USER'"
    :data-idx="dataIdx"
    :work-type="'UserProfile'"
    @update:file-list="handleFileListChange"
  />
</template>

<script setup>
import MultiFileUpload from "@/components/common/MultiFileUpload.vue";
import { ref } from "vue";

const fileUploadRef = ref();
const userId = ref("admin");
const dataIdx = ref("");

// Call when saving
const save = async () => {
  const uploadResult = await fileUploadRef.value?.startUpload();
  if (uploadResult) {
    console.log("Uploaded:", uploadResult.fileList);
    console.log("Deleted:", uploadResult.deletedFiles);
  }
};
</script>
```

---

## TiptapEditor.vue

Rich text editor with formatting, tables, and images.

### Features

- Text formatting (Bold, Italic, Underline, Strike)
- Text alignment (Left, Center, Right)
- Lists (Bullet, Ordered)
- Font color
- Tables with merge/split cells
- Images and links
- Undo/Redo

### Props

| Prop       | Type    | Default | Description            |
| ---------- | ------- | ------- | ---------------------- |
| modelValue | string  | ''      | HTML content (v-model) |
| editable   | boolean | true    | Enable editing         |

### Events

| Event             | Payload | Description     |
| ----------------- | ------- | --------------- |
| update:modelValue | string  | Content changed |

### Exposed Methods

| Method           | Description                |
| ---------------- | -------------------------- |
| setContent(html) | Set editor content         |
| getContent()     | Get editor HTML            |
| getEditor()      | Get Tiptap editor instance |

### Dependencies

```json
{
  "@tiptap/vue-3": "^3.15.3",
  "@tiptap/starter-kit": "^3.15.3",
  "@tiptap/extension-color": "^3.15.3",
  "@tiptap/extension-image": "^3.15.3",
  "@tiptap/extension-link": "^3.15.3",
  "@tiptap/extension-table": "^3.15.3",
  "@tiptap/extension-table-cell": "^3.15.3",
  "@tiptap/extension-table-header": "^3.15.3",
  "@tiptap/extension-table-row": "^3.15.3",
  "@tiptap/extension-text-align": "^3.15.3",
  "@tiptap/extension-text-style": "^3.15.3",
  "@tiptap/extension-underline": "^3.15.3"
}
```

### Usage Example

```vue
<template>
  <TiptapEditor v-model="content" :editable="!readonly" />
</template>

<script setup>
import TiptapEditor from "@/components/common/TiptapEditor.vue";
import { ref } from "vue";

const content = ref("<p>Hello World</p>");
const readonly = ref(false);
</script>
```

---

## Pagination.vue

Custom pagination component with page navigation.

### Props

| Prop        | Type   | Default  | Description                  |
| ----------- | ------ | -------- | ---------------------------- |
| total       | number | required | Total item count             |
| currentPage | number | required | Current page number          |
| pageSize    | number | required | Items per page               |
| delta       | number | 2        | Pages to show around current |

### Events

| Event  | Payload | Description  |
| ------ | ------- | ------------ |
| change | number  | Page changed |

### Usage Example

```vue
<template>
  <Pagination
    :total="pagination.total"
    :current-page="pagination.pageNum"
    :page-size="pagination.pageSize"
    @change="goToPage"
  />
</template>

<script setup>
import Pagination from "@/components/common/Pagination.vue";
import { ref } from "vue";

const pagination = ref({
  total: 100,
  pageNum: 1,
  pageSize: 20,
});

const goToPage = async (page) => {
  pagination.value.pageNum = page;
  await fetchData();
};
</script>
```

---

## ErrorBoundary.vue

Error boundary component for graceful error handling.

### Features

- Catches errors in child components
- Displays user-friendly error message
- Retry functionality

### Usage Example

```vue
<template>
  <ErrorBoundary>
    <MyComponent />
  </ErrorBoundary>
</template>

<script setup>
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
</script>
```

### Template

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

<script setup>
import { ref, onErrorCaptured } from "vue";
import { WarningFilled } from "@element-plus/icons-vue";

const error = ref(null);

onErrorCaptured((err) => {
  error.value = err;
  return false;
});

const reset = () => {
  error.value = null;
};
</script>
```
