const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  onOpenSettings: (cb) => ipcRenderer.on("open-settings", cb),
  onNewPage: (cb) => ipcRenderer.on("new-page", cb),
  platform: process.platform,
  isElectron: true,
});
