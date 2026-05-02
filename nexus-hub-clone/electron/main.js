const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");

const NEXUS_URL = process.env.NEXUS_URL || "http://localhost:18245/nexus";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#090e1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, "icon.png"),
    show: false,
  });

  mainWindow.loadURL(NEXUS_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  const template = [
    {
      label: "Nexus OS",
      submenu: [
        { label: "About Nexus OS", role: "about" },
        { type: "separator" },
        { label: "Preferences...", accelerator: "CmdOrCtrl+,", click: () => mainWindow?.webContents.send("open-settings") },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New Page", accelerator: "CmdOrCtrl+N", click: () => mainWindow?.webContents.send("new-page") },
        { label: "Open...", accelerator: "CmdOrCtrl+O" },
        { type: "separator" },
        { label: "Close Window", accelerator: "CmdOrCtrl+W", role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(process.env.NODE_ENV === "development" ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-app-version", () => app.getVersion());
