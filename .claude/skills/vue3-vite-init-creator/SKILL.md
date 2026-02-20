---
name: vue3-vite-init-creator
description: |
  This skill creates Vue 3 + Vite frontend projects through interactive conversation.
  It should be used when users say "새 Vue 프로젝트 만들어줘", "프론트엔드 초기 세팅해줘",
  "Vue3 프로젝트 생성", "Vite 프로젝트 설정", or want to create a new Vue 3 application.
  The skill guides users through project configuration options including UI libraries,
  state management, routing, authentication, and styling choices.
---

# Vue 3 + Vite Project Initializer

This skill creates production-ready Vue 3 + Vite frontend projects through interactive conversation.

## Purpose

To scaffold a complete Vue 3 + Vite project with:

- TypeScript configuration
- Pinia state management
- Vue Router with auth guards
- Element Plus UI framework (optional)
- AG Grid for data tables (optional)
- Common components (Tree, File Upload, Editor, etc.)
- System management screens (User, Code, Menu, Auth)
- SCSS styling with variables
- Axios HTTP client with interceptors
- Common utility functions

## When to Use

This skill should be triggered when users:

- Request a new Vue 3 project creation
- Ask for frontend initial setup
- Want to clone the current project structure for a new project
- Need a Vue 3 + Vite boilerplate with enterprise patterns

## Interactive Setup Flow

### Phase 1: Basic Information

Ask the user for basic project information:

```
프로젝트 기본 정보를 입력해주세요:

1. 프로젝트명 (예: my-dashboard)
2. 프로젝트 경로 (기본값: 현재 디렉토리)
3. 개발 서버 포트 (기본값: 5173)
4. API 서버 URL (기본값: http://localhost:3000)
```

### Phase 2: UI Framework Selection

Present UI framework options:

| Option                     | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| Element Plus (Recommended) | Enterprise-grade Vue 3 UI library with 60+ components |
| Vuetify 3                  | Material Design component framework                   |
| Naive UI                   | Lightweight, customizable UI library                  |
| None                       | No UI framework, manual styling only                  |

### Phase 3: Data Grid Selection

For applications with data tables:

| Option                | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| AG Grid (Recommended) | Enterprise-grade data grid with sorting, filtering, pagination |
| Element Plus Table    | Basic table from Element Plus                                  |
| None                  | No specialized data grid                                       |

### Phase 4: Common Components Selection

Ask about common components to include (multi-select):

| Component       | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| CommonTree      | Tree structure component with expand/collapse, checkbox support |
| MultiFileUpload | Drag & drop file upload with progress, preview, download        |
| TiptapEditor    | Rich text editor with formatting, tables, images                |
| Pagination      | Custom pagination component with page navigation                |
| ErrorBoundary   | Error boundary for graceful error handling                      |

### Phase 5: System Management Screens

Ask whether to generate system management screens:

| Screen          | Description                                      |
| --------------- | ------------------------------------------------ |
| User Management | User CRUD, search, role assignment               |
| Code Management | Master-detail code management (left-right split) |
| Menu Management | Menu tree with drag-and-drop reordering          |
| Auth Management | Role-based permission management with tree       |
| All             | Generate all system management screens           |
| None            | No system management screens                     |

### Phase 6: Additional Features

Ask about additional features using multi-select:

| Feature           | Description                                      |
| ----------------- | ------------------------------------------------ |
| Authentication    | Login/logout, session management, auth guards    |
| Axios HTTP Client | Pre-configured with interceptors, correlation ID |
| Chart Library     | ApexCharts for data visualization                |
| Excel Export      | ExcelJS for spreadsheet generation               |
| i18n              | Internationalization support                     |

### Phase 7: Styling Options

Present styling configuration:

| Option                     | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| G-Ware Style (Recommended) | Enterprise admin dashboard style with SCSS variables |
| Custom Theme               | User-defined color palette                           |
| Minimal                    | Basic reset styles only                              |

## Project Generation

After collecting all options, generate the project structure:

```
{project-name}/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── .gitignore
├── .env.example
└── src/
    ├── main.js
    ├── App.vue
    ├── router/
    │   └── index.ts
    ├── stores/
    │   ├── AppStore.ts
    │   ├── common/
    │   │   ├── loginStore.ts (if auth enabled)
    │   │   ├── commonCodeStore.ts
    │   │   └── commonMenuStore.ts
    │   └── sys/
    │       ├── userStore.ts (if sys screens enabled)
    │       ├── codeStore.ts
    │       ├── menuStore.ts
    │       └── authStore.ts
    ├── components/
    │   ├── common/
    │   │   ├── ErrorBoundary.vue
    │   │   ├── Pagination.vue
    │   │   ├── CommonTree.vue (if tree enabled)
    │   │   ├── MultiFileUpload.vue (if file upload enabled)
    │   │   └── TiptapEditor.vue (if editor enabled)
    │   ├── layout/
    │   │   ├── AppLayout.vue
    │   │   ├── AppHeader.vue
    │   │   └── AppSidebar.vue
    │   └── base/
    │       ├── BaseButton.vue
    │       ├── BaseInput.vue
    │       └── BaseSelect.vue
    ├── views/
    │   ├── common/
    │   │   ├── Login.vue (if auth enabled)
    │   │   └── Dashboard.vue
    │   ├── sys/ (if sys screens enabled)
    │   │   ├── user/
    │   │   │   ├── SysUserIndex.vue
    │   │   │   └── SysUserRegister.vue
    │   │   ├── SysCodeList.vue
    │   │   ├── SysMenuList.vue
    │   │   ├── SysMenuRegister.vue
    │   │   ├── SysAuthList.vue
    │   │   └── SysAuthRegister.vue
    │   └── example/
    │       └── ExampleList.vue
    ├── utils/
    │   ├── TransUtils.ts (if axios enabled)
    │   ├── AlertUtils.ts
    │   ├── GridUtils.ts (if AG Grid enabled)
    │   └── FileUtils.ts (if file upload enabled)
    └── assets/
        └── styles/
            ├── app.scss
            ├── variables.scss
            ├── _layout.scss
            ├── _components.scss
            ├── _forms.scss
            ├── _buttons.scss
            ├── _grid.scss
            ├── _pagination.scss
            └── _utilities.scss
```

## Template Files

Reference the template files in `references/` directory for:

- `references/package-json-template.md` - package.json configuration options
- `references/vite-config-template.md` - Vite configuration patterns
- `references/style-guide.md` - G-Ware style guide (from CLAUDE.md)
- `references/component-patterns.md` - Component templates and patterns
- `references/view-patterns.md` - View templates (List, Split, Form)
- `references/common-components.md` - Common components (Tree, FileUpload, Editor)
- `references/system-screens.md` - System management screen templates

## Implementation Steps

1. **Collect Configuration**
   - Use AskUserQuestion tool for each phase
   - Store selections in memory for generation

2. **Generate Base Files**
   - Create package.json with selected dependencies
   - Create vite.config.ts with proxy and build settings
   - Create tsconfig.json with proper paths

3. **Generate Source Structure**
   - Create main.js with selected plugins
   - Create router with auth guards if selected
   - Create Pinia stores structure

4. **Generate Components**
   - Copy layout components (Header, Sidebar, Layout)
   - Copy common components (ErrorBoundary, Pagination)
   - Copy selected common components (Tree, FileUpload, Editor)
   - Copy base components if Element Plus selected

5. **Generate System Screens** (if selected)
   - User Management (List + Register modal)
   - Code Management (Master-detail split layout)
   - Menu Management (List + Tree + Register modal)
   - Auth Management (List + Tree with checkbox)

6. **Generate Styles**
   - Copy SCSS variables and mixins
   - Apply selected theme colors
   - Include responsive breakpoints

7. **Generate Utilities**
   - Create TransUtils.ts with axios configuration
   - Create AlertUtils.ts with SweetAlert2 integration
   - Create GridUtils.ts if AG Grid selected
   - Create FileUtils.ts if file upload selected

8. **Post-Generation**
   - Display npm install command
   - Show development server command
   - Provide quick start guide

## Configuration Templates

### Minimal package.json Dependencies

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.2",
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "sass": "^1.69.5"
  }
}
```

### With Element Plus

Add to dependencies:

```json
{
  "element-plus": "^2.4.4",
  "@element-plus/icons-vue": "^2.3.1",
  "sweetalert2": "^11.26.17"
}
```

### With AG Grid

Add to dependencies:

```json
{
  "ag-grid-community": "^35.0.0",
  "ag-grid-vue3": "^35.0.0",
  "exceljs": "^4.4.0",
  "file-saver": "^2.0.5"
}
```

### With Common Components

Add to dependencies based on selection:

```json
{
  "vue3-tree": "^0.11.5",
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

### With Charts

Add to dependencies:

```json
{
  "apexcharts": "^4.0.0",
  "vue3-apexcharts": "^1.7.0"
}
```

## Important Notes

- Always use TypeScript for configuration files (vite.config.ts, tsconfig.json)
- Include path alias `@` mapping to `src/`
- Configure Vite proxy for API calls
- Set up manual chunks for vendor splitting
- Include SCSS preprocessor configuration
- Add correlation ID to axios requests
- Follow G-Ware style guide for consistent UI
- System screens follow master-detail pattern for code/auth management
- Tree component supports checkbox mode for permission management

## Example Conversation

**User**: "새 Vue 프로젝트 만들어줘"

**Claude**:
"Vue 3 + Vite 프로젝트를 생성해드리겠습니다.

먼저 기본 정보를 알려주세요:

1. 프로젝트명을 입력해주세요 (예: my-dashboard)
2. 프로젝트를 생성할 경로를 입력해주세요 (기본: 현재 디렉토리)"

[Continue with interactive questions for each phase...]

**User**: "시스템 관리 화면도 다 포함해줘"

**Claude**:
"시스템 관리 화면을 모두 포함하겠습니다:

- 사용자 관리 (User Management)
- 코드 관리 (Code Management)
- 메뉴 관리 (Menu Management)
- 권한 관리 (Auth Management)

각 화면은 G-Ware 스타일 가이드를 따르며, 검색/그리드/페이징 패턴을 사용합니다."
