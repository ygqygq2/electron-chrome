import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeTheme,
  WebContentsView,
} from "electron";

import { createDownloadsController } from "./main/downloads-controller.js";
import { createExtensionsController } from "./main/extensions-controller.js";
import { createFavoritesController } from "./main/favorites-controller.js";
import {
  readFavoritesState,
  readRuntimePreferences,
  writeRuntimePreferences,
} from "./main/local-persistence.js";
import {
  buildDesktopChromeUserAgent,
  DEFAULT_URL,
  getWindowBackgroundColor,
  GPU_COMPAT_RELAUNCH_ARG,
  type RuntimeInfoSnapshot,
} from "./main/model.js";
import { createShellController } from "./main/shell-core.js";
import { registerShellIpcHandlers } from "./main/shell-ipc.js";
import { createShellMenuController } from "./main/shell-menu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_CHROME_USER_AGENT = buildDesktopChromeUserAgent();

function isWslEnvironment() {
  return (
    process.platform === "linux" &&
    (Boolean(process.env.WSL_DISTRO_NAME) ||
      os.release().toLowerCase().includes("microsoft"))
  );
}

function hasDxgAdapter() {
  return process.platform === "linux" && fs.existsSync("/dev/dxg");
}

const runtimePreferences = readRuntimePreferences();
const favoritesController = createFavoritesController(readFavoritesState());
nativeTheme.themeSource = runtimePreferences.themeSource;

const shouldUsePersistedCompatibilityGpu =
  runtimePreferences.preferCompatibilityGpu;
const shouldUseCompatibilityGpu =
  shouldUsePersistedCompatibilityGpu ||
  (process.platform === "linux" && !hasDxgAdapter());

function getEnvironmentLabel() {
  if (process.platform === "win32") {
    return "Windows";
  }

  if (process.platform === "darwin") {
    return "macOS";
  }

  if (isWslEnvironment()) {
    return hasDxgAdapter() ? "WSL · vGPU" : "WSL · 兼容";
  }

  if (process.platform === "linux") {
    return process.env.WAYLAND_DISPLAY ? "Linux · Wayland" : "Linux · X11";
  }

  return process.platform;
}

function createInitialRuntimeInfo(): RuntimeInfoSnapshot {
  if (shouldUseCompatibilityGpu) {
    return {
      environmentLabel: getEnvironmentLabel(),
      gpuMode: "compatibility",
      gpuLabel: "GPU 兼容",
      gpuReason: shouldUsePersistedCompatibilityGpu
        ? "检测到上次 GPU 进程异常，已自动切换兼容渲染模式"
        : isWslEnvironment()
          ? "检测到 WSL 环境，已自动优先稳定性并切换兼容渲染模式"
          : "未检测到可用 GPU 设备，已自动切换兼容渲染模式",
      dbusNoiseSuppressed: process.platform === "linux",
    };
  }

  return {
    environmentLabel: getEnvironmentLabel(),
    gpuMode: "hardware",
    gpuLabel: "GPU 自动",
    gpuReason: isWslEnvironment()
      ? "检测到 /dev/dxg，保持硬件加速并继续动态侦测"
      : "默认启用硬件加速，并在运行时继续侦测状态",
    dbusNoiseSuppressed: process.platform === "linux",
  };
}

const runtimeInfo = createInitialRuntimeInfo();
app.userAgentFallback = DESKTOP_CHROME_USER_AGENT;

function applyRuntimeStrategy() {
  if (runtimeInfo.dbusNoiseSuppressed) {
    app.commandLine.appendSwitch("disable-logging");
    app.commandLine.appendSwitch("log-level", "3");
  }

  if (runtimeInfo.gpuMode === "compatibility") {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("disable-gpu");
    app.commandLine.appendSwitch("disable-gpu-compositing");
  }

  // WSL 内核更新后 GPU 子进程沙箱初始化失败(error_code=1002)，
  // 仅禁用 GPU 仍会拉起 GPU 进程并导致主进程退出，需同时关闭 GPU 进程沙箱。
  if (isWslEnvironment()) {
    app.commandLine.appendSwitch("disable-gpu-sandbox");
  }
}

applyRuntimeStrategy();

const extensionsController = createExtensionsController();

const shellController = createShellController({
  extensionsController,
  favoritesController,
  onThemeChanged: () => {
    downloadsController?.notifyStateChanged();
  },
  runtimeInfo,
  runtimePreferences,
  setWindowMenu: (win, state) => {
    Menu.setApplicationMenu(shellMenuController.buildMenu(win, state));
  },
});

const downloadsController = createDownloadsController({
  getActiveDownloadTargetWebContents: () => {
    const hostWindow = shellController.getLastFocusedShellWindow();
    const state = hostWindow
      ? shellController.getWindowState(hostWindow.id)
      : null;
    return state
      ? (shellController.getActivePageView(state)?.webContents ?? null)
      : null;
  },
  getLastFocusedShellWindow: () => shellController.getLastFocusedShellWindow(),
  getPersistenceFilePath: () =>
    path.join(app.getPath("userData"), "downloads-history.json"),
  getPreloadPath: () => path.join(__dirname, "preload.mjs"),
  getThemeSnapshot: () => shellController.getCurrentThemeSnapshot(),
});

function createDockedWindow() {
  const initialTheme = shellController.getCurrentThemeSnapshot();
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "Electron Chrome",
    titleBarStyle: "hidden",
    show: false,
    autoHideMenuBar: false,
    backgroundColor: getWindowBackgroundColor(initialTheme.resolved),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devtoolsView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const state = shellController.createWindowState(devtoolsView);
  shellController.registerWindow(win, state);
  shellController.attachTabKeyboardShortcuts(win.webContents, win, state);
  shellController.attachTabKeyboardShortcuts(
    devtoolsView.webContents,
    win,
    state,
  );

  win.on("focus", () => {
    shellController.markWindowFocused(win.id);
  });
  win.on("resize", () => shellController.layoutViews(win, state));
  win.on("maximize", () => {
    state.isMaximized = true;
    shellController.layoutViews(win, state);
    shellController.notifyStateChanged(win, state);
  });
  win.on("unmaximize", () => {
    state.isMaximized = false;
    shellController.layoutViews(win, state);
    shellController.notifyStateChanged(win, state);
  });
  win.on("closed", () => {
    shellController.handleWindowClosed(win, state);
  });

  win.webContents.on("did-finish-load", () => {
    shellController.sendStateToShell(win, state);
  });

  void loadShellWindow(win);
  shellController.createTab(win, state, DEFAULT_URL, { activate: true });
  Menu.setApplicationMenu(shellMenuController.buildMenu(win, state));
  win.setAutoHideMenuBar(false);
  win.setMenuBarVisibility(true);
  win.once("ready-to-show", () => {
    shellController.layoutViews(win, state);
    win.setMenuBarVisibility(true);
    win.show();
  });

  return win;
}

const shellMenuController = createShellMenuController({
  createWindow: () => createDockedWindow(),
  downloads: downloadsController,
  runtimePreferences,
  setThemeSource: shellController.setThemeSource,
  shell: shellController,
});

registerShellIpcHandlers({
  downloads: downloadsController,
  menu: shellMenuController,
  shell: shellController,
});

async function loadShellWindow(win: BrowserWindow) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await win.loadURL(devServerUrl);
    return;
  }

  await win.loadFile(path.join(__dirname, "../dist/index.html"));
}

function registerGlobalShortcuts() {
  for (const accelerator of ["F12", "CommandOrControl+Shift+I"]) {
    try {
      globalShortcut.register(accelerator, () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (!focusedWindow) {
          return;
        }

        const state = shellController.getWindowState(focusedWindow.id);
        if (!state) {
          return;
        }

        shellController.toggleDockedDevTools(focusedWindow, state);
      });
    } catch (error) {
      console.warn("[electron-chrome] failed to register shortcut", {
        accelerator,
        error,
      });
    }
  }
}

function updateRuntimeInfoFromGpuStatus() {
  if (runtimeInfo.gpuMode === "compatibility") {
    return;
  }

  const gpuStatus = app.getGPUFeatureStatus();
  const limitedReasons = Object.entries(gpuStatus)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => ({ key, value: value.toLowerCase() }))
    .filter(
      ({ value }) =>
        value.includes("disabled") ||
        value.includes("software") ||
        value.includes("unavailable") ||
        value.includes("block"),
    )
    .slice(0, 3)
    .map(({ key, value }) => `${key}: ${value}`);

  if (limitedReasons.length === 0) {
    return;
  }

  runtimeInfo.gpuMode = "limited";
  runtimeInfo.gpuLabel = "GPU 受限";
  runtimeInfo.gpuReason = `Chromium 当前限制：${limitedReasons.join(" / ")}`;
  shellController.refreshAllWindowsState();
}

app.whenReady().then(() => {
  extensionsController.restorePersistedExtensions();
  downloadsController.registerSessionHandlers();
  registerGlobalShortcuts();
  updateRuntimeInfoFromGpuStatus();
  createDockedWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDockedWindow();
    }
  });
});

nativeTheme.on("updated", () => {
  shellController.handleNativeThemeUpdated();
});

app.on("gpu-info-update", () => {
  updateRuntimeInfoFromGpuStatus();
});

app.on("child-process-gone", (_event, details) => {
  const processType = String(details.type ?? "").toLowerCase();

  if (!processType.includes("gpu") || runtimeInfo.gpuMode === "compatibility") {
    return;
  }

  if (!runtimePreferences.preferCompatibilityGpu) {
    runtimePreferences.preferCompatibilityGpu = true;
    writeRuntimePreferences(runtimePreferences);
  }

  if (!process.argv.includes(GPU_COMPAT_RELAUNCH_ARG)) {
    app.relaunch({
      args: [...process.argv.slice(1), GPU_COMPAT_RELAUNCH_ARG],
    });
    app.exit(0);
    return;
  }

  runtimeInfo.gpuMode = "limited";
  runtimeInfo.gpuLabel = "GPU 受限";
  runtimeInfo.gpuReason = `检测到 GPU 进程 ${details.reason}，当前会继续以兼容渲染优先`;
  shellController.refreshAllWindowsState();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
