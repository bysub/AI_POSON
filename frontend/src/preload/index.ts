import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  // App
  getVersion: () => ipcRenderer.invoke("app:version"),
  quit: () => ipcRenderer.invoke("app:quit"),
  toggleDevTools: () => ipcRenderer.invoke("app:toggleDevTools"),

  // Environment
  getEnv: (key: string) => ipcRenderer.invoke("env:get", key),

  // Printer API
  printer: {
    connect: () => ipcRenderer.invoke("printer:connect"),
    disconnect: () => ipcRenderer.invoke("printer:disconnect"),
    printReceipt: (data: unknown) => ipcRenderer.invoke("printer:printReceipt", data),
    printKitchenOrder: (data: unknown) => ipcRenderer.invoke("printer:printKitchenOrder", data),
    openCashDrawer: () => ipcRenderer.invoke("printer:openCashDrawer"),
    getStatus: () => ipcRenderer.invoke("printer:status"),
  },

  // Scanner API
  scanner: {
    connect: () => ipcRenderer.invoke("scanner:connect"),
    disconnect: () => ipcRenderer.invoke("scanner:disconnect"),
    getStatus: () => ipcRenderer.invoke("scanner:status"),
    onScan: (callback: (barcode: string) => void) => {
      ipcRenderer.on("scanner:barcode", (_event, barcode) => callback(barcode));
    },
    removeScanListener: () => {
      ipcRenderer.removeAllListeners("scanner:barcode");
    },
  },

  // Payment Terminal API
  terminal: {
    connect: () => ipcRenderer.invoke("terminal:connect"),
    disconnect: () => ipcRenderer.invoke("terminal:disconnect"),
    requestPayment: (data: unknown) => ipcRenderer.invoke("terminal:requestPayment", data),
    cancelPayment: (transactionId: string) =>
      ipcRenderer.invoke("terminal:cancelPayment", transactionId),
    getStatus: () => ipcRenderer.invoke("terminal:status"),
  },

  // Hardware Manager API
  hardware: {
    getStatus: () => ipcRenderer.invoke("hardware:status"),
    connectAll: () => ipcRenderer.invoke("hardware:connectAll"),
    disconnectAll: () => ipcRenderer.invoke("hardware:disconnectAll"),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
