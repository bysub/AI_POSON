export { db, initDatabase, clearDatabase } from "./db";
export type { LocalProduct, LocalCategory, LocalOrder, PendingSync } from "./db";

export { syncManager, SyncManager } from "./sync/sync-manager";
export type { SyncStatus, SyncResult, ApiClient } from "./sync/sync-manager";

export { HttpApiClient, createApiClient } from "./api/client";
