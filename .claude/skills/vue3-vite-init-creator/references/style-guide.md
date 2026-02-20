# G-Ware UI Style Guide

This document contains the G-Ware style guide for consistent UI development.

## Color Palette

### SCSS Variables

```scss
// Primary Colors
$primary-blue: #2563eb; // blue-600 (main actions, active state)
$primary-hover: #1d4ed8; // blue-700 (hover state)

// Text Colors
$text-primary: #1f2937; // gray-800 (main text)
$text-secondary: #374151; // gray-700 (secondary text)
$text-muted: #6b7280; // gray-500 (inactive text)
$text-light: #9ca3af; // gray-400 (hint text)

// Background Colors
$bg-white: #ffffff;
$bg-light: #f9fafb; // gray-50 (page background)
$bg-section: #f8fafc; // slate-50 (section header)
$bg-hover: rgba(37, 99, 235, 0.04); // row hover

// Border Colors
$border-light: #e5e7eb; // gray-200 (default border)
$border-lighter: #f3f4f6; // gray-100 (subtle border)

// Status Colors
$status-reject: #dc2626; // red-600 (reject, error)
$status-success: #10b981; // emerald-500 (success, complete)
$status-warning: #f59e0b; // amber-500 (warning, pending)
$status-info: #3b82f6; // blue-500 (info)
```

## Section Card Style

```scss
.section-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding: 10px 16px;
  background: #f8fafc; // Light background (no dark backgrounds)
  border-bottom: 1px solid #e5e7eb;
}

.section-content {
  padding: 16px;
  background: #fff;
}
```

## Form Style

```scss
// Labels
label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

// Data values (bold emphasis)
.data-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

// Input fields
.el-input,
.el-select {
  width: 100%;
}
```

## AG Grid Style

```scss
// AG Grid default settings
:deep(.ag-header-cell) {
  background-color: #f9fafb;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.ag-cell) {
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

:deep(.ag-row) {
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(37, 99, 235, 0.04);
  }
}

// Remove cell focus border (required)
:deep(.ag-cell-focus),
:deep(.ag-cell:focus) {
  border: none !important;
  outline: none !important;
}

:deep(.ag-cell-range-selected:not(.ag-cell-range-single-cell)) {
  background-color: transparent !important;
}

:deep(.ag-ltr .ag-cell-focus:not(.ag-cell-range-selected):focus-within) {
  border: none !important;
}

// Header center alignment
:deep(.header-center) {
  .ag-header-cell-label {
    justify-content: center;
  }
}
```

## Table Style (HTML Table)

```scss
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  thead {
    background: #f1f5f9;

    th {
      padding: 10px 8px;
      text-align: center;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #e5e7eb;

      &:hover {
        background: #f9fafb;
      }
    }

    td {
      padding: 10px 8px;
      color: #4b5563;
    }
  }
}
```

## Status Text Colors

```scss
// Default text color (only reject is red)
.status-wait,
.status-proc,
.status-approve,
.status-confirm {
  color: inherit; // Default text color
}

.status-reject {
  color: #dc2626; // Only reject is red
  font-weight: 600;
}
```

## Dialog Style

```scss
// Dialog header (dark style)
.el-dialog__header {
  background: #1e293b !important;
  padding: 16px 20px !important;
  margin: 0 !important;
  border-bottom: none !important;
}

.el-dialog__title {
  color: #fff !important;
  font-size: 16px !important;
  font-weight: 600 !important;
}

.el-dialog__headerbtn .el-dialog__close {
  color: #94a3b8 !important;

  &:hover {
    color: #fff !important;
  }
}
```

## Button Style

```scss
// Default button
.el-button {
  border-radius: 6px;
  font-size: 14px;
  padding: 8px 16px;
}

// Primary button
.el-button--primary {
  background: #2563eb;
  border-color: #2563eb;

  &:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
}

// Danger button (reject, delete, etc.)
.el-button--danger {
  background: #dc2626;
  border-color: #dc2626;
}
```

## Sidebar Menu Style

```scss
// Main menu icon: use common icon (folder)
// Submenu active: only font color change, no background

.menu-submenu {
  .menu-item {
    &.active .menu-link {
      color: #fff;
      font-weight: 700;
      background: transparent; // No background
    }
  }
}
```

## Page Header Style

```scss
.page-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 16px 0;

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: #1f2937;
  }

  // Navigation (Menu > Submenu)
  .page-nav {
    font-size: 13px;
    color: #6b7280;

    .nav-text.current {
      color: #374151;
      font-weight: 500;
    }
  }
}

// Note: Page title should come from menu DB
// Use menuStore.getCurrentMenuInfo()
```

## Key Principles

1. **Section Headers**: Use light background (`#f8fafc`), no dark backgrounds
2. **Data Emphasis**: Labels small and light, data values bold
3. **Status Colors**: Only reject(reject) is red, rest use default text color
4. **Grid Focus**: No border on cell click (required style)
5. **Menu Title**: Use menu name from DB (no hardcoding)
6. **Sidebar Icons**: Use common icons, no individual icon specification
7. **Submenu Active**: Only font white/bold, no background color

## Full SCSS Variables File

```scss
@use "sass:map";

// =============================================
// Material Design Color Palette
// =============================================

// Primary Colors (Cyan)
$primary: #00bcd4;
$primary-light: #b2ebf2;
$primary-dark: #00838f;

// Secondary Colors
$secondary: #6c757d;
$secondary-light: #adb5bd;
$secondary-dark: #495057;

// Semantic Colors
$success: #4caf50;
$info: #2196f3;
$warning: #ff9800;
$danger: #f44336;

// Neutral Colors
$dark: #212121;
$dark-800: #2d353c;
$dark-900: #1a1f23;
$light: #f5f5f5;
$white: #ffffff;
$black: #000000;

// Gray Scale
$gray-100: #f8f9fa;
$gray-200: #e9ecef;
$gray-300: #dee2e6;
$gray-400: #ced4da;
$gray-500: #adb5bd;
$gray-600: #6c757d;
$gray-700: #495057;
$gray-800: #343a40;
$gray-900: #212529;

// =============================================
// Layout Variables
// =============================================

// Header (G-Ware style)
$header-height: 64px;
$header-bg: $white;
$header-color: $gray-800;
$header-border: $gray-200;
$header-logo-color: #2563eb; // blue-600

// Sidebar (G-Ware style)
$sidebar-width: 256px; // w-64
$sidebar-minified-width: 60px;
$sidebar-bg: #1e293b; // slate-800
$sidebar-color: #cbd5e1; // slate-300
$sidebar-active-color: $white;
$sidebar-hover-bg: #334155; // slate-700
$sidebar-submenu-bg: rgba(15, 23, 42, 0.3);
$sidebar-profile-bg: rgba(71, 85, 105, 0.5); // slate-700/50
$sidebar-profile-border: #475569; // slate-600

// Content
$content-bg: #f9fafb; // gray-50
$content-padding: 20px;

// =============================================
// Responsive Breakpoints
// =============================================

$breakpoints: (
  "xs": 0,
  "sm": 576px,
  "md": 768px,
  "lg": 992px,
  "xl": 1200px,
  "xxl": 1400px,
);

// =============================================
// Shadows
// =============================================

$shadow-sm: 0 1px 2px rgba($black, 0.05);
$shadow: 0 2px 4px rgba($black, 0.1);
$shadow-md: 0 4px 6px rgba($black, 0.1);
$shadow-lg: 0 10px 15px rgba($black, 0.1);
$shadow-xl: 0 20px 25px rgba($black, 0.15);

// =============================================
// Borders
// =============================================

$border-radius: 4px;
$border-radius-lg: 8px;
$border-radius-xl: 12px;
$border-color: $gray-300;

// =============================================
// Fonts
// =============================================

$font-family:
  "Roboto",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
$font-size-base: 14px;
$font-size-sm: 12px;
$font-size-lg: 16px;
$font-size-xl: 18px;

// =============================================
// Transitions
// =============================================

$transition-base: all 0.3s ease;
$transition-fast: all 0.15s ease;

// =============================================
// Z-index
// =============================================

$z-index-dropdown: 1000;
$z-index-sticky: 1020;
$z-index-fixed: 1030;
$z-index-modal-backdrop: 1040;
$z-index-modal: 1050;
$z-index-popover: 1060;
$z-index-tooltip: 1070;

// =============================================
// Mixins
// =============================================

@mixin respond-to($breakpoint) {
  @if map.has-key($breakpoints, $breakpoint) {
    @media (min-width: map.get($breakpoints, $breakpoint)) {
      @content;
    }
  }
}

@mixin respond-below($breakpoint) {
  @if map.has-key($breakpoints, $breakpoint) {
    @media (max-width: map.get($breakpoints, $breakpoint) - 1px) {
      @content;
    }
  }
}

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```
