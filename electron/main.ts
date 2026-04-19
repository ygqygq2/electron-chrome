import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  nativeTheme,
  type WebContents,
  WebContentsView,
} from "electron";

import {
  DEFAULT_URL,
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_SETTINGS_URL,
  CONTROLS_HEIGHT,
  DEFAULT_DOCK_HEIGHT,
  DEFAULT_DOCK_WIDTH,
  MAX_HISTORY_ENTRIES,
  DOCK_POSITIONS,
  GPU_COMPAT_RELAUNCH_ARG,
  SETTINGS_SECTIONS,
  buildDesktopChromeUserAgent,
  getWindowBackgroundColor,
  type DockPosition,
  type MenuSection,
  type ThemeSource,
  type ToolbarContextButtonId,
  type ToolbarPreferences,
  type RuntimeInfoSnapshot,
  type BrowserTab,
  type BrowserShellState,
} from "./main/model.js";

import {
  normalizeThemeSource,
  cloneToolbarPreferences,
  normalizeToolbarPreferences,
  getThemeSnapshot,
  readBrowserHistory,
  writeBrowserHistory,
  createHistoryEntryId,
  shouldRecordHistoryUrl,
  readRuntimePreferences,
  writeRuntimePreferences,
} from "./main/local-persistence.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_CHROME_USER_AGENT = buildDesktopChromeUserAgent();
const dockedWindowStateById = new Map<number, BrowserShellState>();

function persistBrowserHistory() {
  browserHistory = browserHistory.slice(0, MAX_HISTORY_ENTRIES);
  writeBrowserHistory(browserHistory);
}

function recordHistoryVisit(url: string, title: string) {
  if (!shouldRecordHistoryUrl(url)) {
    return;
  }

  browserHistory.unshift({
    id: createHistoryEntryId(),
    title: title.trim() || url,
    url,
    visitedAt: new Date().toISOString(),
  });
  persistBrowserHistory();
}

function updateRecentHistoryTitle(url: string, title: string) {
  if (!shouldRecordHistoryUrl(url) || !title.trim()) {
    return;
  }

  const targetEntry = browserHistory.find((entry) => entry.url === url);
  if (!targetEntry || targetEntry.title === title.trim()) {
    return;
  }

  targetEntry.title = title.trim();
  persistBrowserHistory();
}


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
let browserHistory = readBrowserHistory();
nativeTheme.themeSource = runtimePreferences.themeSource;
const shouldUsePersistedCompatibilityGpu =
  runtimePreferences.preferCompatibilityGpu;
const shouldUseCompatibilityGpu =
  shouldUsePersistedCompatibilityGpu ||
  isWslEnvironment() ||
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
}

applyRuntimeStrategy();

function isDevToolsToggleShortcut(input: Electron.Input) {
  const key = typeof input.key === "string" ? input.key.toLowerCase() : "";
  return (
    input.type === "keyDown" &&
    (input.key === "F12" ||
      (Boolean(input.control) && Boolean(input.shift) && key === "i"))
  );
}

function createTabId() {
  return `tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}


import {
  getSettingsSectionFromUrl,
  isSettingsUrl,
  isDownloadsUrl,
  isExtensionsUrl,
  isHistoryUrl,
  isInternalPageUrl,
  isInternalRenderedUrl,
  getInternalPageDisplayUrl,
} from "./main/url-utils.js";

import {
  createInternalPageDataUrl,
} from "./main/page-html.js";


function openTabUrl(tab: BrowserTab, url: string, state: BrowserShellState) {
  const nextUrl = getInternalPageDisplayUrl(url || DEFAULT_URL);

  tab.url = nextUrl;
  if (isInternalPageUrl(nextUrl)) {
    tab.title = isSettingsUrl(nextUrl)
      ? `设置 · ${(SETTINGS_SECTIONS.find((section) => section.id === getSettingsSectionFromUrl(nextUrl))?.label ?? "基础偏好")}`
      : isDownloadsUrl(nextUrl)
        ? "下载"
        : isExtensionsUrl(nextUrl)
          ? "扩展"
          : isHistoryUrl(nextUrl)
            ? "历史记录"
          : "内部页面";
    void tab.pageView.webContents.loadURL(
      createInternalPageDataUrl(nextUrl, state.theme, state, browserHistory),
    );
    return;
  }

  void tab.pageView.webContents.loadURL(nextUrl);
}

function getStateSnapshot(state: BrowserShellState) {
  return {
    activeTabId: state.activeTabId,
    canRestoreClosedTab: state.closedTabHistory.length > 0,
    devtoolsVisible: state.devtoolsVisible,
    dockPosition: state.dockPosition,
    runtimeInfo: state.runtimeInfo,
    toolbarPreferences: cloneToolbarPreferences(state.toolbarPreferences),
    theme: state.theme,
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
    })),
    windowState: {
      isMaximized: state.isMaximized,
    },
  };
}

function sendStateToShell(win: BrowserWindow, state: BrowserShellState) {
  if (win.isDestroyed() || win.webContents.isDestroyed()) {
    return;
  }

  try {
    win.webContents.send("docked-shell:state", getStateSnapshot(state));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!errorMessage.includes("disposed")) {
      console.warn("[electron-chrome] failed to send shell state", {
        error: errorMessage,
      });
    }
  }
}

function getTabById(state: BrowserShellState, tabId: string | null) {
  return state.tabs.find((tab) => tab.id === tabId) ?? null;
}

function getActiveTab(state: BrowserShellState) {
  return getTabById(state, state.activeTabId);
}

function getActivePageView(state: BrowserShellState) {
  return getActiveTab(state)?.pageView ?? null;
}

function updateWindowTitle(win: BrowserWindow, state: BrowserShellState) {
  const activeTab = getActiveTab(state);
  const title = activeTab?.title || activeTab?.url || "Electron Chrome";
  win.setTitle(`${title} - Electron Chrome`);
}

function syncTabNavigationState(tab: BrowserTab) {
  const { webContents } = tab.pageView;
  tab.canGoBack = webContents.navigationHistory.canGoBack();
  tab.canGoForward = webContents.navigationHistory.canGoForward();
}

function notifyStateChanged(win: BrowserWindow, state: BrowserShellState) {
  updateWindowTitle(win, state);
  Menu.setApplicationMenu(buildMenu(win, state));
  sendStateToShell(win, state);
}

function refreshInternalPagesForTheme(state: BrowserShellState) {
  for (const tab of state.tabs) {
    if (!isInternalPageUrl(tab.url)) {
      continue;
    }

    openTabUrl(tab, tab.url, state);
  }
}

function refreshAllWindowsState() {
  for (const win of BrowserWindow.getAllWindows()) {
    const state = dockedWindowStateById.get(win.id);
    if (!state) {
      continue;
    }

    state.theme = getThemeSnapshot(runtimePreferences.themeSource);
    state.toolbarPreferences = cloneToolbarPreferences(
      runtimePreferences.toolbarPreferences,
    );
    win.setBackgroundColor(getWindowBackgroundColor(state.theme.resolved));
    notifyStateChanged(win, state);
  }
}

function updateToolbarPreferences(
  updater: (preferences: ToolbarPreferences) => ToolbarPreferences,
) {
  runtimePreferences.toolbarPreferences = normalizeToolbarPreferences(
    updater(cloneToolbarPreferences(runtimePreferences.toolbarPreferences)),
  );
  writeRuntimePreferences(runtimePreferences);

  for (const win of BrowserWindow.getAllWindows()) {
    const state = dockedWindowStateById.get(win.id);
    if (!state) {
      continue;
    }

    state.toolbarPreferences = cloneToolbarPreferences(
      runtimePreferences.toolbarPreferences,
    );
    notifyStateChanged(win, state);
  }
}

function setThemeSource(nextThemeSource: ThemeSource) {
  const normalizedThemeSource = normalizeThemeSource(nextThemeSource);

  if (runtimePreferences.themeSource === normalizedThemeSource) {
    return;
  }

  runtimePreferences.themeSource = normalizedThemeSource;
  nativeTheme.themeSource = normalizedThemeSource;
  writeRuntimePreferences(runtimePreferences);

  for (const win of BrowserWindow.getAllWindows()) {
    const state = dockedWindowStateById.get(win.id);
    if (!state) {
      continue;
    }

    state.theme = getThemeSnapshot(normalizedThemeSource);
    win.setBackgroundColor(getWindowBackgroundColor(state.theme.resolved));
    refreshInternalPagesForTheme(state);
    notifyStateChanged(win, state);
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
  refreshAllWindowsState();
}

function ensureActivePageViewAttached(
  win: BrowserWindow,
  state: BrowserShellState,
) {
  const activeTab = getActiveTab(state);
  const activePageView = activeTab?.pageView ?? null;

  if (state.attachedTabId && state.attachedTabId !== activeTab?.id) {
    const previousTab = getTabById(state, state.attachedTabId);
    if (previousTab) {
      win.contentView.removeChildView(previousTab.pageView);
    }
    state.attachedTabId = null;
  }

  if (activePageView && state.attachedTabId !== activeTab?.id) {
    win.contentView.addChildView(activePageView);
    state.attachedTabId = activeTab?.id ?? null;
  }

  if (!state.devtoolsAttached) {
    win.contentView.addChildView(state.devtoolsView);
    state.devtoolsAttached = true;
  }
}

function bindActiveTabDevTools(state: BrowserShellState) {
  const activePageView = getActivePageView(state);
  if (!activePageView) {
    return;
  }
  activePageView.webContents.setDevToolsWebContents(
    state.devtoolsView.webContents,
  );
}

function layoutViews(win: BrowserWindow, state: BrowserShellState) {
  const { width, height } = win.getContentBounds();
  const activePageView = getActivePageView(state);
  const contentTop = CONTROLS_HEIGHT;
  const contentHeight = Math.max(0, height - contentTop);

  if (!activePageView) {
    state.devtoolsView.setBounds({ x: 0, y: height, width: 0, height: 0 });
    return;
  }

  if (!state.devtoolsVisible) {
    activePageView.setBounds({
      x: 0,
      y: contentTop,
      width,
      height: contentHeight,
    });
    state.devtoolsView.setBounds({ x: 0, y: height, width: 0, height: 0 });
    return;
  }

  if (state.dockPosition === DOCK_POSITIONS.left) {
    const devtoolsWidth = Math.min(
      DEFAULT_DOCK_WIDTH,
      Math.max(360, Math.floor(width * 0.42)),
    );
    activePageView.setBounds({
      x: devtoolsWidth,
      y: contentTop,
      width: Math.max(0, width - devtoolsWidth),
      height: contentHeight,
    });
    state.devtoolsView.setBounds({
      x: 0,
      y: contentTop,
      width: devtoolsWidth,
      height: contentHeight,
    });
    return;
  }

  if (state.dockPosition === DOCK_POSITIONS.right) {
    const devtoolsWidth = Math.min(
      DEFAULT_DOCK_WIDTH,
      Math.max(360, Math.floor(width * 0.42)),
    );
    const pageWidth = Math.max(0, width - devtoolsWidth);
    activePageView.setBounds({
      x: 0,
      y: contentTop,
      width: pageWidth,
      height: contentHeight,
    });
    state.devtoolsView.setBounds({
      x: pageWidth,
      y: contentTop,
      width: devtoolsWidth,
      height: contentHeight,
    });
    return;
  }

  const devtoolsHeight = Math.min(
    DEFAULT_DOCK_HEIGHT,
    Math.max(260, Math.floor(contentHeight * 0.45)),
  );
  const pageHeight = Math.max(0, contentHeight - devtoolsHeight);
  activePageView.setBounds({ x: 0, y: contentTop, width, height: pageHeight });
  state.devtoolsView.setBounds({
    x: 0,
    y: contentTop + pageHeight,
    width,
    height: devtoolsHeight,
  });
}

function openDockedDevTools(win: BrowserWindow, state: BrowserShellState) {
  const activePageView = getActivePageView(state);
  if (!activePageView) {
    return;
  }

  bindActiveTabDevTools(state);
  state.devtoolsVisible = true;
  layoutViews(win, state);
  notifyStateChanged(win, state);

  if (!activePageView.webContents.isDevToolsOpened()) {
    activePageView.webContents.openDevTools({
      mode: "detach",
      activate: false,
      title: `Docked DevTools ${activePageView.webContents.id}`,
    });
  }
}

function closeDockedDevTools(win: BrowserWindow, state: BrowserShellState) {
  const activePageView = getActivePageView(state);
  if (activePageView?.webContents.isDevToolsOpened()) {
    activePageView.webContents.closeDevTools();
  }
  state.devtoolsVisible = false;
  layoutViews(win, state);
  notifyStateChanged(win, state);
}

function toggleDockedDevTools(win: BrowserWindow, state: BrowserShellState) {
  if (state.devtoolsVisible) {
    closeDockedDevTools(win, state);
    return;
  }
  openDockedDevTools(win, state);
}

function inspectElement(
  win: BrowserWindow,
  state: BrowserShellState,
  x: number,
  y: number,
) {
  const activePageView = getActivePageView(state);
  if (!activePageView) {
    return;
  }

  openDockedDevTools(win, state);
  setTimeout(() => {
    activePageView.webContents.inspectElement(Number(x) || 0, Number(y) || 0);
  }, 120);
}

function setDockPosition(
  win: BrowserWindow,
  state: BrowserShellState,
  dockPosition: DockPosition,
) {
  state.dockPosition = dockPosition;
  layoutViews(win, state);
  notifyStateChanged(win, state);
}

function activateTab(
  win: BrowserWindow,
  state: BrowserShellState,
  tabId: string,
) {
  const nextTab = getTabById(state, tabId);
  const previousTab = getActiveTab(state);

  if (!nextTab || previousTab?.id === nextTab.id) {
    return;
  }

  if (previousTab?.pageView.webContents.isDevToolsOpened()) {
    previousTab.pageView.webContents.closeDevTools();
  }

  state.activeTabId = nextTab.id;
  ensureActivePageViewAttached(win, state);
  bindActiveTabDevTools(state);
  layoutViews(win, state);
  notifyStateChanged(win, state);
}

function createContextMenu(
  win: BrowserWindow,
  state: BrowserShellState,
  linkURL: string,
  x: number,
  y: number,
) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "新标签页打开链接",
      enabled: Boolean(linkURL),
      click: () => {
        if (linkURL) {
          createTab(win, state, linkURL, { activate: true });
        }
      },
    },
    { type: "separator" },
    {
      label: "检查元素",
      click: () => inspectElement(win, state, x, y),
    },
  ];

  Menu.buildFromTemplate(template).popup({ window: win });
}

function openSettingsTab(win: BrowserWindow, state: BrowserShellState) {
  const existingTab = state.tabs.find((tab) => isSettingsUrl(tab.url));

  if (existingTab) {
    activateTab(win, state, existingTab.id);
    return existingTab;
  }

  return createTab(win, state, INTERNAL_SETTINGS_URL, { activate: true });
}

function openDownloadsTab(win: BrowserWindow, state: BrowserShellState) {
  const existingTab = state.tabs.find((tab) => isDownloadsUrl(tab.url));

  if (existingTab) {
    activateTab(win, state, existingTab.id);
    return existingTab;
  }

  return createTab(win, state, INTERNAL_DOWNLOADS_URL, { activate: true });
}

function openExtensionsTab(win: BrowserWindow, state: BrowserShellState) {
  const existingTab = state.tabs.find((tab) => isExtensionsUrl(tab.url));

  if (existingTab) {
    activateTab(win, state, existingTab.id);
    return existingTab;
  }

  return createTab(win, state, INTERNAL_EXTENSIONS_URL, { activate: true });
}

function openHistoryTab(win: BrowserWindow, state: BrowserShellState) {
  const existingTab = state.tabs.find((tab) => isHistoryUrl(tab.url));

  if (existingTab) {
    activateTab(win, state, existingTab.id);
    openTabUrl(existingTab, INTERNAL_HISTORY_URL, state);
    notifyStateChanged(win, state);
    return existingTab;
  }

  return createTab(win, state, INTERNAL_HISTORY_URL, { activate: true });
}

function restoreClosedTab(win: BrowserWindow, state: BrowserShellState) {
  const lastClosedTab = state.closedTabHistory.pop();

  if (!lastClosedTab?.url) {
    notifyStateChanged(win, state);
    return;
  }

  createTab(win, state, lastClosedTab.url, { activate: true });
}

function buildThemeMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: "跟随系统",
      type: "radio",
      checked: runtimePreferences.themeSource === "system",
      click: () => setThemeSource("system"),
    },
    {
      label: "浅色",
      type: "radio",
      checked: runtimePreferences.themeSource === "light",
      click: () => setThemeSource("light"),
    },
    {
      label: "深色",
      type: "radio",
      checked: runtimePreferences.themeSource === "dark",
      click: () => setThemeSource("dark"),
    },
  ];
}

function buildDownloadsMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "打开下载页",
      click: () => openDownloadsTab(win, state),
    },
    {
      label: "当前暂无下载任务",
      enabled: false,
    },
  ];
}

function buildFavoritesMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: "收藏夹功能开发中",
      enabled: false,
    },
    {
      label: "后续将在这里接入书签列表与管理能力",
      enabled: false,
    },
  ];
}

function buildToolbarButtonContextMenuTemplate(
  buttonId: ToolbarContextButtonId,
): MenuItemConstructorOptions[] {
  const toolbarPreferences = runtimePreferences.toolbarPreferences;
  const canChangePlacement =
    buttonId === "restoreClosedTab" || buttonId === "favorites";
  const currentPreference = toolbarPreferences[buttonId];

  return [
    ...(canChangePlacement
      ? [
          {
            label: "放在左边",
            type: "radio" as const,
            checked: currentPreference.placement === "left",
            click: () => {
              updateToolbarPreferences((preferences) => ({
                ...preferences,
                [buttonId]: {
                  ...preferences[buttonId],
                  placement: "left",
                },
              }));
            },
          },
          {
            label: "放在右边",
            type: "radio" as const,
            checked: currentPreference.placement === "right",
            click: () => {
              updateToolbarPreferences((preferences) => ({
                ...preferences,
                [buttonId]: {
                  ...preferences[buttonId],
                  placement: "right",
                },
              }));
            },
          },
          { type: "separator" as const },
        ]
      : []),
    {
      label: "显示主页按钮",
      type: "checkbox",
      checked: toolbarPreferences.home.visible,
      click: () => {
        updateToolbarPreferences((preferences) => ({
          ...preferences,
          home: {
            ...preferences.home,
            visible: !preferences.home.visible,
          },
        }));
      },
    },
    {
      label: "显示恢复关闭标签按钮",
      type: "checkbox",
      checked: toolbarPreferences.restoreClosedTab.visible,
      click: () => {
        updateToolbarPreferences((preferences) => ({
          ...preferences,
          restoreClosedTab: {
            ...preferences.restoreClosedTab,
            visible: !preferences.restoreClosedTab.visible,
          },
        }));
      },
    },
    {
      label: "显示收藏夹按钮",
      type: "checkbox",
      checked: toolbarPreferences.favorites.visible,
      click: () => {
        updateToolbarPreferences((preferences) => ({
          ...preferences,
          favorites: {
            ...preferences.favorites,
            visible: !preferences.favorites.visible,
          },
        }));
      },
    },
    {
      label: "显示下载按钮",
      type: "checkbox",
      checked: toolbarPreferences.downloads.visible,
      click: () => {
        updateToolbarPreferences((preferences) => ({
          ...preferences,
          downloads: {
            ...preferences.downloads,
            visible: !preferences.downloads.visible,
          },
        }));
      },
    },
    {
      label: "显示扩展按钮",
      type: "checkbox",
      checked: toolbarPreferences.extensions.visible,
      click: () => {
        updateToolbarPreferences((preferences) => ({
          ...preferences,
          extensions: {
            ...preferences.extensions,
            visible: !preferences.extensions.visible,
          },
        }));
      },
    },
  ];
}

function attachDevToolsToggleShortcut(
  contents: WebContents,
  win: BrowserWindow,
  state: BrowserShellState,
) {
  contents.on("before-input-event", (event, input) => {
    if (!isDevToolsToggleShortcut(input)) {
      return;
    }
    event.preventDefault();
    toggleDockedDevTools(win, state);
  });
}

function createTab(
  win: BrowserWindow,
  state: BrowserShellState,
  initialUrl: string,
  options: { activate?: boolean } = {},
) {
  const pageView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  pageView.webContents.setUserAgent(DESKTOP_CHROME_USER_AGENT);

  const tab: BrowserTab = {
    id: createTabId(),
    title: "新标签页",
    url: initialUrl,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    pageView,
  };

  attachDevToolsToggleShortcut(pageView.webContents, win, state);

  pageView.webContents.setWindowOpenHandler(({ url }) => {
    if (url) {
      createTab(win, state, url, { activate: true });
    }
    return { action: "deny" };
  });

  pageView.webContents.on("will-navigate", (event, url) => {
    if (!isInternalPageUrl(url)) {
      return;
    }

    event.preventDefault();
    openTabUrl(tab, url, state);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("page-title-updated", (_event, title) => {
    tab.title = title || tab.title || tab.url || "新标签页";
    updateRecentHistoryTitle(tab.url, tab.title);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("did-start-loading", () => {
    tab.isLoading = true;
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("did-stop-loading", () => {
    tab.isLoading = false;
    syncTabNavigationState(tab);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("did-finish-load", () => {
    recordHistoryVisit(tab.url, tab.title);
  });

  pageView.webContents.on("did-navigate", (_event, url) => {
    if (!(isInternalPageUrl(tab.url) && isInternalRenderedUrl(url))) {
      tab.url = url;
    }
    syncTabNavigationState(tab);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("did-navigate-in-page", (_event, url) => {
    if (!(isInternalPageUrl(tab.url) && isInternalRenderedUrl(url))) {
      tab.url = url;
    }
    syncTabNavigationState(tab);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      tab.isLoading = false;
      tab.title = `加载失败 (${errorCode})`;
      tab.url = validatedURL || tab.url;
      notifyStateChanged(win, state);
      console.warn("[electron-chrome] load failed", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

  pageView.webContents.on("context-menu", (_event, params) => {
    activateTab(win, state, tab.id);
    createContextMenu(win, state, params.linkURL, params.x, params.y);
  });

  pageView.webContents.on("devtools-opened", () => {
    state.devtoolsVisible = true;
    layoutViews(win, state);
    notifyStateChanged(win, state);
  });

  pageView.webContents.on("devtools-closed", () => {
    if (getActiveTab(state)?.id !== tab.id) {
      return;
    }
    state.devtoolsVisible = false;
    layoutViews(win, state);
    notifyStateChanged(win, state);
  });

  state.tabs.push(tab);

  if (options.activate !== false || !state.activeTabId) {
    state.activeTabId = tab.id;
    ensureActivePageViewAttached(win, state);
    bindActiveTabDevTools(state);
  }

  layoutViews(win, state);
  notifyStateChanged(win, state);
  openTabUrl(tab, initialUrl || DEFAULT_URL, state);
  return tab;
}

function closeTab(win: BrowserWindow, state: BrowserShellState, tabId: string) {
  if (state.tabs.length <= 1) {
    return;
  }

  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index < 0) {
    return;
  }

  const [tab] = state.tabs.splice(index, 1);
  if (!tab) {
    return;
  }

  if (tab.url) {
    state.closedTabHistory.push({
      title: tab.title,
      url: tab.url,
    });
    state.closedTabHistory = state.closedTabHistory.slice(-12);
  }

  if (state.attachedTabId === tab.id) {
    win.contentView.removeChildView(tab.pageView);
    state.attachedTabId = null;
  }

  try {
    tab.pageView.webContents.close();
  } catch {
    console.warn("[electron-chrome] failed to close tab webContents", {
      tabId,
    });
  }

  if (state.activeTabId === tabId) {
    const fallback =
      state.tabs[Math.max(0, index - 1)] ?? state.tabs[0] ?? null;
    state.activeTabId = fallback?.id ?? null;
  }

  ensureActivePageViewAttached(win, state);
  bindActiveTabDevTools(state);
  layoutViews(win, state);
  notifyStateChanged(win, state);
}

function navigateActiveTab(state: BrowserShellState, url: string) {
  const activeTab = getActiveTab(state);
  if (!activeTab || !url) {
    return;
  }
  openTabUrl(activeTab, url, state);
}

function buildFileMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "新标签页",
      accelerator: "CmdOrCtrl+T",
      click: () => createTab(win, state, DEFAULT_URL, { activate: true }),
    },
    {
      label: "关闭当前标签页",
      accelerator: "CmdOrCtrl+W",
      enabled: state.tabs.length > 1,
      click: () => {
        if (state.activeTabId) {
          closeTab(win, state, state.activeTabId);
        }
      },
    },
    { type: "separator" },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => openSettingsTab(win, state),
    },
    {
      label: "历史记录",
      accelerator: "CmdOrCtrl+H",
      click: () => openHistoryTab(win, state),
    },
    {
      label: "扩展",
      click: () => openExtensionsTab(win, state),
    },
    {
      label: "下载",
      click: () => openDownloadsTab(win, state),
    },
    { type: "separator" },
    {
      label: "新窗口",
      accelerator: "CmdOrCtrl+N",
      click: () => createDockedWindow(),
    },
    { type: "separator" },
    { role: "quit", label: "退出" },
  ];
}

function buildAppMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "新标签页",
      accelerator: "CmdOrCtrl+T",
      click: () => createTab(win, state, DEFAULT_URL, { activate: true }),
    },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => openSettingsTab(win, state),
    },
    {
      label: "恢复刚关闭的标签页",
      enabled: state.closedTabHistory.length > 0,
      click: () => restoreClosedTab(win, state),
    },
    {
      label: "历史记录",
      accelerator: "CmdOrCtrl+H",
      click: () => openHistoryTab(win, state),
    },
    {
      label: "扩展",
      click: () => openExtensionsTab(win, state),
    },
    {
      label: "下载",
      click: () => openDownloadsTab(win, state),
    },
    {
      label: "主题",
      submenu: buildThemeMenuTemplate(),
    },
    { type: "separator" },
    {
      label: "后退",
      enabled: Boolean(getActiveTab(state)?.canGoBack),
      click: () =>
        getActivePageView(state)?.webContents.navigationHistory.goBack(),
    },
    {
      label: "前进",
      enabled: Boolean(getActiveTab(state)?.canGoForward),
      click: () =>
        getActivePageView(state)?.webContents.navigationHistory.goForward(),
    },
    {
      label: "刷新",
      accelerator: "F5",
      click: () => getActivePageView(state)?.webContents.reload(),
    },
    { type: "separator" },
    {
      label: state.devtoolsVisible ? "关闭停靠 DevTools" : "打开停靠 DevTools",
      accelerator: "F12",
      click: () => toggleDockedDevTools(win, state),
    },
    { type: "separator" },
    { role: "quit", label: "退出" },
  ];
}

function buildNavigationMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "打开默认地址",
      accelerator: "CmdOrCtrl+Shift+L",
      click: () => navigateActiveTab(state, DEFAULT_URL),
    },
    {
      label: "在新标签页打开默认地址",
      accelerator: "CmdOrCtrl+Shift+T",
      click: () => createTab(win, state, DEFAULT_URL, { activate: true }),
    },
    { type: "separator" },
    {
      label: "后退",
      accelerator: "Alt+Left",
      enabled: Boolean(getActiveTab(state)?.canGoBack),
      click: () =>
        getActivePageView(state)?.webContents.navigationHistory.goBack(),
    },
    {
      label: "前进",
      accelerator: "Alt+Right",
      enabled: Boolean(getActiveTab(state)?.canGoForward),
      click: () =>
        getActivePageView(state)?.webContents.navigationHistory.goForward(),
    },
    {
      label: "刷新网页",
      accelerator: "F5",
      click: () => getActivePageView(state)?.webContents.reload(),
    },
  ];
}

function buildDebugMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "网页开发者工具（停靠）",
      accelerator: "F12",
      click: () => toggleDockedDevTools(win, state),
    },
    {
      label: "关闭停靠 DevTools",
      enabled: state.devtoolsVisible,
      click: () => closeDockedDevTools(win, state),
    },
    { type: "separator" },
    {
      label: "停靠位置",
      submenu: [
        {
          label: "底部",
          type: "radio",
          checked: state.dockPosition === DOCK_POSITIONS.bottom,
          click: () => setDockPosition(win, state, DOCK_POSITIONS.bottom),
        },
        {
          label: "左侧",
          type: "radio",
          checked: state.dockPosition === DOCK_POSITIONS.left,
          click: () => setDockPosition(win, state, DOCK_POSITIONS.left),
        },
        {
          label: "右侧",
          type: "radio",
          checked: state.dockPosition === DOCK_POSITIONS.right,
          click: () => setDockPosition(win, state, DOCK_POSITIONS.right),
        },
      ],
    },
    { type: "separator" },
    {
      label: "壳窗口 DevTools",
      accelerator: "CmdOrCtrl+Shift+I",
      click: () => win.webContents.toggleDevTools(),
    },
  ];
}

function showMenuSection(
  win: BrowserWindow,
  state: BrowserShellState,
  section: MenuSection,
  anchor: { x: number; y: number },
) {
  const template =
    section === "file"
      ? buildFileMenuTemplate(win, state)
      : section === "navigate"
        ? buildNavigationMenuTemplate(win, state)
        : section === "downloads"
          ? buildDownloadsMenuTemplate(win, state)
          : section === "favorites"
            ? buildFavoritesMenuTemplate()
            : section === "debug"
              ? buildDebugMenuTemplate(win, state)
              : buildAppMenuTemplate(win, state);

  Menu.buildFromTemplate(template).popup({
    window: win,
    x: Math.round(anchor.x),
    y: Math.round(anchor.y),
  });
}

function buildMenu(win: BrowserWindow, state: BrowserShellState) {
  return Menu.buildFromTemplate([
    {
      label: "文件",
      submenu: buildFileMenuTemplate(win, state),
    },
    {
      label: "导航",
      submenu: buildNavigationMenuTemplate(win, state),
    },
    {
      label: "调试",
      submenu: buildDebugMenuTemplate(win, state),
    },
    {
      label: "主题",
      submenu: buildThemeMenuTemplate(),
    },
  ]);
}

async function loadShellWindow(win: BrowserWindow) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await win.loadURL(devServerUrl);
    return;
  }

  await win.loadFile(path.join(__dirname, "../dist/index.html"));
}

function createDockedWindow() {
  const initialTheme = getThemeSnapshot(runtimePreferences.themeSource);
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

  const state: BrowserShellState = {
    closedTabHistory: [],
    devtoolsView,
    devtoolsVisible: false,
    dockPosition: DOCK_POSITIONS.bottom,
    runtimeInfo,
    toolbarPreferences: cloneToolbarPreferences(
      runtimePreferences.toolbarPreferences,
    ),
    theme: initialTheme,
    tabs: [],
    activeTabId: null,
    attachedTabId: null,
    devtoolsAttached: false,
    isMaximized: false,
  };

  dockedWindowStateById.set(win.id, state);

  attachDevToolsToggleShortcut(win.webContents, win, state);
  attachDevToolsToggleShortcut(devtoolsView.webContents, win, state);

  win.on("resize", () => layoutViews(win, state));
  win.on("maximize", () => {
    state.isMaximized = true;
    layoutViews(win, state);
    notifyStateChanged(win, state);
  });
  win.on("unmaximize", () => {
    state.isMaximized = false;
    layoutViews(win, state);
    notifyStateChanged(win, state);
  });
  win.on("closed", () => {
    dockedWindowStateById.delete(win.id);
    for (const tab of state.tabs) {
      try {
        tab.pageView.webContents.close();
      } catch {
        console.warn(
          "[electron-chrome] failed to close page view during cleanup",
          { tabId: tab.id },
        );
      }
    }
    try {
      devtoolsView.webContents.close();
    } catch {
      console.warn(
        "[electron-chrome] failed to close devtools view during cleanup",
        { windowId: win.id },
      );
    }
  });

  win.webContents.on("did-finish-load", () => {
    sendStateToShell(win, state);
  });

  void loadShellWindow(win);
  createTab(win, state, DEFAULT_URL, { activate: true });
  Menu.setApplicationMenu(buildMenu(win, state));
  win.setAutoHideMenuBar(false);
  win.setMenuBarVisibility(true);
  win.once("ready-to-show", () => {
    layoutViews(win, state);
    win.setMenuBarVisibility(true);
    win.show();
  });
  return win;
}

function registerGlobalShortcuts() {
  for (const accelerator of ["F12", "CommandOrControl+Shift+I"]) {
    try {
      globalShortcut.register(accelerator, () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (!focusedWindow) {
          return;
        }
        const state = dockedWindowStateById.get(focusedWindow.id);
        if (!state) {
          return;
        }
        toggleDockedDevTools(focusedWindow, state);
      });
    } catch (error) {
      console.warn("[electron-chrome] failed to register shortcut", {
        accelerator,
        error,
      });
    }
  }
}

ipcMain.handle("docked-shell:get-state", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  return state ? getStateSnapshot(state) : null;
});

ipcMain.on("docked-shell:new-tab", (event, url?: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!win || !state) {
    return;
  }
  createTab(win, state, url || DEFAULT_URL, { activate: true });
});

ipcMain.on("docked-shell:activate-tab", (event, tabId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!win || !state) {
    return;
  }
  activateTab(win, state, tabId);
});

ipcMain.on("docked-shell:close-tab", (event, tabId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!win || !state) {
    return;
  }
  closeTab(win, state, tabId);
});

ipcMain.on("docked-shell:restore-closed-tab", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!win || !state) {
    return;
  }
  restoreClosedTab(win, state);
});

ipcMain.on("docked-shell:navigate", (event, url: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  navigateActiveTab(state, url);
});

ipcMain.on("docked-shell:open-home", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  navigateActiveTab(state, DEFAULT_URL);
});

ipcMain.on("docked-shell:go-back", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  getActivePageView(state)?.webContents.navigationHistory.goBack();
});

ipcMain.on("docked-shell:go-forward", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  getActivePageView(state)?.webContents.navigationHistory.goForward();
});

ipcMain.on("docked-shell:reload", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  getActivePageView(state)?.webContents.reload();
});

ipcMain.on("docked-shell:minimize-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on("docked-shell:toggle-maximize-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!win || !state) {
    return;
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on("docked-shell:close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.handle(
  "docked-shell:show-menu",
  (
    event,
    payload: { section: MenuSection; anchor: { x: number; y: number } },
  ) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? dockedWindowStateById.get(win.id) : null;

    if (!win || !state) {
      return;
    }

    showMenuSection(win, state, payload.section, payload.anchor);
  },
);

ipcMain.handle(
  "docked-shell:show-toolbar-button-context-menu",
  (
    event,
    payload: {
      buttonId: ToolbarContextButtonId;
      anchor: { x: number; y: number };
    },
  ) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return;
    }

    Menu.buildFromTemplate(
      buildToolbarButtonContextMenuTemplate(payload.buttonId),
    ).popup({
      window: win,
      x: Math.round(payload.anchor.x),
      y: Math.round(payload.anchor.y),
    });
  },
);

app.whenReady().then(() => {
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
  if (runtimePreferences.themeSource !== "system") {
    return;
  }

  for (const win of BrowserWindow.getAllWindows()) {
    const state = dockedWindowStateById.get(win.id);
    if (!state) {
      continue;
    }

    state.theme = getThemeSnapshot("system");
    win.setBackgroundColor(getWindowBackgroundColor(state.theme.resolved));
    refreshInternalPagesForTheme(state);
    notifyStateChanged(win, state);
  }
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
  refreshAllWindowsState();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
