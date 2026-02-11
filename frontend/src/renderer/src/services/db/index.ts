import Dexie, { type Table } from "dexie";
import type { Product, Category, Order } from "../../types";

/**
 * 로컬 데이터베이스 스키마
 */
export interface LocalProduct extends Product {
  syncedAt?: number;
  localUpdatedAt?: number;
}

export interface LocalCategory extends Category {
  syncedAt?: number;
  localUpdatedAt?: number;
}

export interface LocalOrder extends Order {
  syncStatus: "pending" | "synced" | "failed";
  syncedAt?: number;
  localCreatedAt: number;
  retryCount?: number;
}

export interface PendingSync {
  id?: number;
  type: "order" | "product" | "category";
  action: "create" | "update" | "delete";
  data: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

/**
 * Dexie 로컬 데이터베이스
 */
export class LocalDatabase extends Dexie {
  products!: Table<LocalProduct, number>;
  categories!: Table<LocalCategory, number>;
  orders!: Table<LocalOrder, string>;
  pendingSync!: Table<PendingSync, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super("KioskDB");

    this.version(1).stores({
      products: "id, categoryId, barcode, name, syncedAt",
      categories: "id, name, sortOrder, syncedAt",
      orders: "id, status, syncStatus, localCreatedAt",
      pendingSync: "++id, type, action, createdAt",
      settings: "key",
    });
  }
}

// 싱글톤 인스턴스
export const db = new LocalDatabase();

/**
 * 데이터베이스 초기화
 */
export async function initDatabase(): Promise<void> {
  await db.open();
  console.log("[DB] Database initialized");
}

/**
 * 데이터베이스 정리 (개발용)
 */
export async function clearDatabase(): Promise<void> {
  await db.products.clear();
  await db.categories.clear();
  await db.orders.clear();
  await db.pendingSync.clear();
  console.log("[DB] Database cleared");
}
