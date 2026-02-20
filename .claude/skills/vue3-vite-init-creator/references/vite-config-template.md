# Vite Configuration Templates

## Base Configuration

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: {{DEV_PORT}},
    proxy: {
      '/api': '{{API_SERVER_URL}}'
    }
  }
})
```

## Full Enterprise Configuration

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import imagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    vue(),
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 85 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      },
      webp: { quality: 85 }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: {{DEV_PORT}},
    proxy: {
      '/api': '{{API_SERVER_URL}}'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue core libraries
          'vue-vendor': ['vue', 'vue-router', 'pinia'],

          // UI framework
          'element-plus': ['element-plus', '@element-plus/icons-vue'],

          // AG Grid (large library)
          'ag-grid': ['ag-grid-community', 'ag-grid-vue3'],

          // Chart libraries
          'charts': ['apexcharts', 'vue3-apexcharts'],

          // Utilities
          'utils': ['axios', 'exceljs', 'file-saver', 'sweetalert2']
        }
      }
    },
    chunkSizeWarningLimit: 1000,

    // CSS code splitting
    cssCodeSplit: true,

    // Remove sourcemap in production
    sourcemap: false
  },

  // Dependency pre-bundling optimization
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'ag-grid-vue3'
    ]
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  }
})
```

## Configuration Options

### Server Options

| Option  | Default   | Description             |
| ------- | --------- | ----------------------- |
| `port`  | 5173      | Development server port |
| `proxy` | -         | API proxy configuration |
| `host`  | localhost | Server host             |
| `open`  | false     | Auto-open browser       |
| `cors`  | true      | Enable CORS             |

### Build Options

| Option                  | Default | Description                       |
| ----------------------- | ------- | --------------------------------- |
| `outDir`                | dist    | Output directory                  |
| `sourcemap`             | false   | Generate sourcemaps               |
| `minify`                | esbuild | Minification method               |
| `cssCodeSplit`          | true    | CSS code splitting                |
| `chunkSizeWarningLimit` | 500     | Chunk size warning threshold (KB) |

### Manual Chunks Strategy

Split code into logical chunks for better caching:

```typescript
manualChunks: {
  // Core Vue ecosystem
  'vue-vendor': ['vue', 'vue-router', 'pinia'],

  // UI components (load separately)
  'element-plus': ['element-plus', '@element-plus/icons-vue'],

  // Data grid (large, optional)
  'ag-grid': ['ag-grid-community', 'ag-grid-vue3'],

  // Charts (optional)
  'charts': ['apexcharts', 'vue3-apexcharts'],

  // Common utilities
  'utils': ['axios', 'exceljs', 'file-saver', 'sweetalert2']
}
```

### SCSS Configuration

Enable global SCSS variables:

```typescript
css: {
  preprocessorOptions: {
    scss: {
      api: 'modern-compiler',
      additionalData: `@use "@/assets/styles/variables.scss" as *;`
    }
  }
}
```

## tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## tsconfig.node.json Template

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

## Environment Variables

### .env.example

```env
# Development Server
VITE_PORT=5173

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1

# App Configuration
VITE_APP_TITLE={{PROJECT_NAME}}
```

### Usage in Code

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const appTitle = import.meta.env.VITE_APP_TITLE;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```
