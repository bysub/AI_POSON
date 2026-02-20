# Package.json Templates

## Base Template (Minimal)

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.2",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "sass": "^1.69.5",
    "vue-tsc": "^1.8.27"
  }
}
```

## Feature-Based Dependencies

### HTTP Client (Axios)

```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^10.0.0"
  }
}
```

### Element Plus UI

```json
{
  "dependencies": {
    "element-plus": "^2.4.4",
    "@element-plus/icons-vue": "^2.3.1",
    "sweetalert2": "^11.26.17"
  }
}
```

### AG Grid

```json
{
  "dependencies": {
    "ag-grid-community": "^35.0.0",
    "ag-grid-vue3": "^35.0.0"
  }
}
```

### Excel Export

```json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

### Charts

```json
{
  "dependencies": {
    "apexcharts": "^4.0.0",
    "vue3-apexcharts": "^1.7.0"
  }
}
```

### Rich Text Editor (TipTap)

```json
{
  "dependencies": {
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
}
```

### Tree Component

```json
{
  "dependencies": {
    "vue3-tree": "^0.11.5"
  }
}
```

### Drag and Drop

```json
{
  "dependencies": {
    "vuedraggable": "^4.1.0"
  }
}
```

### Testing

```json
{
  "devDependencies": {
    "@testing-library/vue": "^8.1.0",
    "@vitest/ui": "^4.0.17",
    "jsdom": "^27.4.0",
    "vitest": "^4.0.17"
  }
}
```

### Image Optimization

```json
{
  "devDependencies": {
    "vite-plugin-imagemin": "^0.6.1"
  }
}
```

## Full Enterprise Template

Complete package.json with all common enterprise features:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.1",
    "@tiptap/extension-color": "^3.15.3",
    "@tiptap/extension-image": "^3.15.3",
    "@tiptap/extension-link": "^3.15.3",
    "@tiptap/extension-table": "^3.15.3",
    "@tiptap/extension-table-cell": "^3.15.3",
    "@tiptap/extension-table-header": "^3.15.3",
    "@tiptap/extension-table-row": "^3.15.3",
    "@tiptap/extension-text-align": "^3.15.3",
    "@tiptap/extension-text-style": "^3.15.3",
    "@tiptap/extension-underline": "^3.15.3",
    "@tiptap/starter-kit": "^3.15.3",
    "@tiptap/vue-3": "^3.15.3",
    "ag-grid-community": "^35.0.0",
    "ag-grid-vue3": "^35.0.0",
    "apexcharts": "^4.0.0",
    "axios": "^1.6.2",
    "element-plus": "^2.4.4",
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "pinia": "^2.1.7",
    "sweetalert2": "^11.26.17",
    "uuid": "^11.0.0",
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "vue3-apexcharts": "^1.7.0",
    "vue3-tree": "^0.11.5",
    "vuedraggable": "^4.1.0"
  },
  "devDependencies": {
    "@testing-library/vue": "^8.1.0",
    "@types/file-saver": "^2.0.5",
    "@types/node": "^20.10.6",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-vue": "^4.5.2",
    "@vitest/ui": "^4.0.17",
    "jsdom": "^27.4.0",
    "sass": "^1.69.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "vite-plugin-imagemin": "^0.6.1",
    "vitest": "^4.0.17",
    "vue-tsc": "^1.8.27"
  }
}
```

## Scripts Explanation

| Script    | Description                      |
| --------- | -------------------------------- |
| `dev`     | Start Vite dev server with HMR   |
| `build`   | Build for production to `dist/`  |
| `preview` | Preview production build locally |
| `test`    | Run Vitest tests                 |
| `test:ui` | Run Vitest with UI interface     |
