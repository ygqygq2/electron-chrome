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
  type WebContents,
  WebContentsView,
} from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL = "https://www.baidu.com/";
const INTERNAL_SETTINGS_URL = "chrome://settings";
const CONTROLS_HEIGHT = 136;
const DEFAULT_DOCK_HEIGHT = 360;
const DEFAULT_DOCK_WIDTH = 520;
const WINDOW_BACKGROUND = "#08111f";
const DOCK_POSITIONS = {
  bottom: "bottom",
  left: "left",
  right: "right",
} as const;

type DockPosition = (typeof DOCK_POSITIONS)[keyof typeof DOCK_POSITIONS];
type MenuSection = "file" | "navigate" | "debug" | "app";
type GpuMode = "hardware" | "compatibility" | "limited";
const GPU_COMPAT_RELAUNCH_ARG = "--gpu-compat-relaunch";

interface RuntimePreferences {
  preferCompatibilityGpu: boolean;
}

interface RuntimeInfoSnapshot {
  environmentLabel: string;
  gpuMode: GpuMode;
  gpuLabel: string;
  gpuReason: string;
  dbusNoiseSuppressed: boolean;
}

interface TabSnapshot {
  id: string;
  title: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface BrowserTab extends TabSnapshot {
  pageView: WebContentsView;
}

interface BrowserShellState {
  devtoolsView: WebContentsView;
  devtoolsVisible: boolean;
  dockPosition: DockPosition;
  runtimeInfo: RuntimeInfoSnapshot;
  tabs: BrowserTab[];
  activeTabId: string | null;
  attachedTabId: string | null;
  devtoolsAttached: boolean;
}

const dockedWindowStateById = new Map<number, BrowserShellState>();

function getRuntimePreferencesPath() {
  return path.join(app.getPath("userData"), "runtime-preferences.json");
}

function readRuntimePreferences(): RuntimePreferences {
  try {
    const raw = fs.readFileSync(getRuntimePreferencesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimePreferences>;

    return {
      preferCompatibilityGpu: Boolean(parsed.preferCompatibilityGpu),
    };
  } catch {
    return {
      preferCompatibilityGpu: false,
    };
  }
}

function writeRuntimePreferences(preferences: RuntimePreferences) {
  const runtimePreferencesPath = getRuntimePreferencesPath();

  fs.mkdirSync(path.dirname(runtimePreferencesPath), { recursive: true });
  fs.writeFileSync(
    runtimePreferencesPath,
    JSON.stringify(preferences, null, 2),
    "utf8",
  );
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

function normalizeInternalUrl(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function isSettingsUrl(url: string) {
  const normalizedUrl = normalizeInternalUrl(url);
  return (
    normalizedUrl === INTERNAL_SETTINGS_URL ||
    normalizedUrl === "about:settings"
  );
}

function isInternalPageUrl(url: string) {
  return isSettingsUrl(url);
}

function isInternalRenderedUrl(url: string) {
  return url.startsWith("data:text/html");
}

function getInternalPageDisplayUrl(url: string) {
  if (isSettingsUrl(url)) {
    return INTERNAL_SETTINGS_URL;
  }

  return url;
}

function createSettingsPageHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>设置</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: #e6edf3;
        background:
          radial-gradient(circle at top right, rgb(31 111 235 / 16%), transparent 28%),
          linear-gradient(180deg, #0f141a 0%, #0b1016 100%);
      }

      .page {
        max-width: 1040px;
        margin: 0 auto;
        padding: 48px 28px 64px;
      }

      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #58a6ff;
      }

      h1 {
        margin: 10px 0 8px;
        font-size: 34px;
        line-height: 1.2;
      }

      .lead {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
        color: #9fb0c3;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
        margin-top: 28px;
      }

      .card {
        padding: 18px 18px 16px;
        background: rgb(255 255 255 / 4%);
        border: 1px solid rgb(255 255 255 / 8%);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgb(0 0 0 / 18%);
      }

      .card h2 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      .muted {
        margin: 0;
        color: #9fb0c3;
        font-size: 13px;
        line-height: 1.65;
      }

      ul {
        margin: 12px 0 0;
        padding-left: 18px;
        color: #c9d1d9;
        font-size: 13px;
        line-height: 1.7;
      }

      .tip {
        margin-top: 28px;
        padding: 16px 18px;
        background: rgb(88 166 255 / 8%);
        border: 1px solid rgb(88 166 255 / 18%);
        border-radius: 16px;
        color: #c9d1d9;
        font-size: 13px;
        line-height: 1.7;
      }

      code {
        padding: 2px 6px;
        font-size: 12px;
        background: rgb(255 255 255 / 6%);
        border-radius: 999px;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="eyebrow">chrome://settings</div>
      <h1>设置</h1>
      <p class="lead">这是浏览器壳的第一版内置设置页。目标不是一次性复刻完整 Chrome，而是先把“设置在标签页里打开”这条体验链路打通。</p>

      <section class="grid">
        <article class="card">
          <h2>浏览器壳</h2>
          <p class="muted">这些是当前已经生效、或者即将扩展到真正可配置状态的行为。</p>
          <ul>
            <li>新标签页默认打开首页</li>
            <li>标签过多时自动收缩，过载后临时隐藏超出标签</li>
            <li>顶部应用菜单按钮会弹出原生菜单</li>
          </ul>
        </article>

        <article class="card">
          <h2>开发与调试</h2>
          <p class="muted">高频调试动作先放进这里，方便和普通网页一样在标签页里查看。</p>
          <ul>
            <li><code>F12</code>：打开停靠式 DevTools</li>
            <li><code>Ctrl/Cmd + T</code>：新建标签页</li>
            <li><code>Ctrl/Cmd + ,</code>：打开设置</li>
          </ul>
        </article>

        <article class="card">
          <h2>运行时说明</h2>
          <p class="muted">GPU 与平台策略继续在后台自动判断，不再把长说明铺在顶部壳层上。</p>
          <ul>
            <li>WSL / Linux 会继续做兼容性策略判断</li>
            <li>系统原生菜单栏仍然保留</li>
            <li>内置页优先走本地渲染，不依赖外网</li>
          </ul>
        </article>
      </section>

      <section class="tip">
        你现在看到的是浏览器内置页面承载能力的第一步。后续若需要真正可持久化的设置项，可以继续把设置表单、存储与同步逻辑接进来。
      </section>
    </main>
  </body>
</html>`;
}

function createInternalPageHtml(url: string) {
  if (isSettingsUrl(url)) {
    return createSettingsPageHtml();
  }

  return `<!doctype html><html><head><meta charset="UTF-8" /><title>内部页面</title></head><body></body></html>`;
}

function createInternalPageDataUrl(url: string) {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createInternalPageHtml(url))}`;
}

function openTabUrl(tab: BrowserTab, url: string) {
  const nextUrl = getInternalPageDisplayUrl(url || DEFAULT_URL);

  tab.url = nextUrl;
  if (isInternalPageUrl(nextUrl)) {
    tab.title = nextUrl === INTERNAL_SETTINGS_URL ? "设置" : "内部页面";
    void tab.pageView.webContents.loadURL(createInternalPageDataUrl(nextUrl));
    return;
  }

  void tab.pageView.webContents.loadURL(nextUrl);
}

function getStateSnapshot(state: BrowserShellState) {
  return {
    activeTabId: state.activeTabId,
    devtoolsVisible: state.devtoolsVisible,
    dockPosition: state.dockPosition,
    runtimeInfo: state.runtimeInfo,
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
    })),
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

function refreshAllWindowsState() {
  for (const win of BrowserWindow.getAllWindows()) {
    const state = dockedWindowStateById.get(win.id);
    if (state) {
      notifyStateChanged(win, state);
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

  pageView.webContents.on("page-title-updated", (_event, title) => {
    tab.title = title || tab.title || tab.url || "新标签页";
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
  openTabUrl(tab, initialUrl || DEFAULT_URL);
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
  openTabUrl(activeTab, url);
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
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "Electron Chrome",
    titleBarStyle: "hidden",
    show: false,
    backgroundColor: WINDOW_BACKGROUND,
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
    devtoolsView,
    devtoolsVisible: false,
    dockPosition: DOCK_POSITIONS.bottom,
    runtimeInfo,
    tabs: [],
    activeTabId: null,
    attachedTabId: null,
    devtoolsAttached: false,
  };

  dockedWindowStateById.set(win.id, state);

  attachDevToolsToggleShortcut(win.webContents, win, state);
  attachDevToolsToggleShortcut(devtoolsView.webContents, win, state);

  win.on("resize", () => layoutViews(win, state));
  win.on("maximize", () => layoutViews(win, state));
  win.on("unmaximize", () => layoutViews(win, state));
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
  win.once("ready-to-show", () => {
    layoutViews(win, state);
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

ipcMain.on("docked-shell:navigate", (event, url: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = win ? dockedWindowStateById.get(win.id) : null;
  if (!state) {
    return;
  }
  navigateActiveTab(state, url);
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
