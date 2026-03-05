import { app, BrowserWindow, protocol } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { createWindow, registerAppProtocol } from "./window-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { registerSttHandlers } from "./stt-daemon";

// 프로덕션 모드에서 커스텀 프로토콜 등록 (app.whenReady() 이전에 호출 필수)
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.poson.kiosk");

  registerAppProtocol();
  registerIpcHandlers();
  registerSttHandlers();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
