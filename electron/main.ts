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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL = "https://www.baidu.com/";
const INTERNAL_DOWNLOADS_URL = "chrome://downloads";
const INTERNAL_EXTENSIONS_URL = "chrome://extensions";
const INTERNAL_SETTINGS_URL = "chrome://settings";
const CONTROLS_HEIGHT = 136;
const DEFAULT_DOCK_HEIGHT = 360;
const DEFAULT_DOCK_WIDTH = 520;
const DOCK_POSITIONS = {
  bottom: "bottom",
  left: "left",
  right: "right",
} as const;

type DockPosition = (typeof DOCK_POSITIONS)[keyof typeof DOCK_POSITIONS];
type MenuSection =
  | "file"
  | "navigate"
  | "debug"
  | "app"
  | "downloads"
  | "favorites";
type GpuMode = "hardware" | "compatibility" | "limited";
type ThemeSource = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type ToolbarPlacement = "left" | "right";
type ToolbarContextButtonId = "restoreClosedTab" | "favorites";
const GPU_COMPAT_RELAUNCH_ARG = "--gpu-compat-relaunch";

interface ToolbarVisibilityPreference {
  visible: boolean;
}

interface ToolbarPlacementPreference extends ToolbarVisibilityPreference {
  placement: ToolbarPlacement;
}

interface ToolbarPreferences {
  home: ToolbarVisibilityPreference;
  restoreClosedTab: ToolbarPlacementPreference;
  favorites: ToolbarPlacementPreference;
  downloads: ToolbarVisibilityPreference;
  extensions: ToolbarVisibilityPreference;
}

const DEFAULT_TOOLBAR_PREFERENCES: ToolbarPreferences = {
  home: {
    visible: true,
  },
  restoreClosedTab: {
    visible: true,
    placement: "right",
  },
  favorites: {
    visible: true,
    placement: "right",
  },
  downloads: {
    visible: true,
  },
  extensions: {
    visible: true,
  },
};

interface RuntimePreferences {
  preferCompatibilityGpu: boolean;
  themeSource: ThemeSource;
  toolbarPreferences: ToolbarPreferences;
}

interface ThemeSnapshot {
  source: ThemeSource;
  resolved: ResolvedTheme;
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
  closedTabHistory: Array<Pick<TabSnapshot, "title" | "url">>;
  devtoolsView: WebContentsView;
  devtoolsVisible: boolean;
  dockPosition: DockPosition;
  runtimeInfo: RuntimeInfoSnapshot;
  toolbarPreferences: ToolbarPreferences;
  theme: ThemeSnapshot;
  tabs: BrowserTab[];
  activeTabId: string | null;
  attachedTabId: string | null;
  devtoolsAttached: boolean;
  isMaximized: boolean;
}

const dockedWindowStateById = new Map<number, BrowserShellState>();

function getWindowBackgroundColor(theme: ResolvedTheme) {
  return theme === "dark" ? "#0b1118" : "#dce4ee";
}

function normalizeThemeSource(value: string | undefined): ThemeSource {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function normalizeToolbarPlacement(
  value: string | undefined,
): ToolbarPlacement {
  return value === "left" || value === "right" ? value : "right";
}

function cloneToolbarPreferences(
  preferences: ToolbarPreferences,
): ToolbarPreferences {
  return {
    home: { ...preferences.home },
    restoreClosedTab: { ...preferences.restoreClosedTab },
    favorites: { ...preferences.favorites },
    downloads: { ...preferences.downloads },
    extensions: { ...preferences.extensions },
  };
}

function normalizeToolbarPreferences(
  value: Partial<ToolbarPreferences> | undefined,
): ToolbarPreferences {
  const home = value?.home;
  const restoreClosedTab = value?.restoreClosedTab;
  const favorites = value?.favorites;
  const downloads = value?.downloads;
  const extensions = value?.extensions;

  return {
    home: {
      visible: home?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.home.visible,
    },
    restoreClosedTab: {
      visible:
        restoreClosedTab?.visible ??
        DEFAULT_TOOLBAR_PREFERENCES.restoreClosedTab.visible,
      placement: normalizeToolbarPlacement(restoreClosedTab?.placement),
    },
    favorites: {
      visible:
        favorites?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.favorites.visible,
      placement: normalizeToolbarPlacement(favorites?.placement),
    },
    downloads: {
      visible:
        downloads?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.downloads.visible,
    },
    extensions: {
      visible:
        extensions?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.extensions.visible,
    },
  };
}

function getResolvedTheme(): ResolvedTheme {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

function getThemeSnapshot(themeSource: ThemeSource): ThemeSnapshot {
  return {
    source: themeSource,
    resolved: getResolvedTheme(),
  };
}

function getRuntimePreferencesPath() {
  return path.join(app.getPath("userData"), "runtime-preferences.json");
}

function readRuntimePreferences(): RuntimePreferences {
  try {
    const raw = fs.readFileSync(getRuntimePreferencesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimePreferences>;

    return {
      preferCompatibilityGpu: Boolean(parsed.preferCompatibilityGpu),
      themeSource: normalizeThemeSource(parsed.themeSource),
      toolbarPreferences: normalizeToolbarPreferences(
        parsed.toolbarPreferences,
      ),
    };
  } catch {
    return {
      preferCompatibilityGpu: false,
      themeSource: "system",
      toolbarPreferences: cloneToolbarPreferences(DEFAULT_TOOLBAR_PREFERENCES),
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

function isDownloadsUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_DOWNLOADS_URL;
}

function isExtensionsUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_EXTENSIONS_URL;
}

function isInternalPageUrl(url: string) {
  return isSettingsUrl(url) || isDownloadsUrl(url) || isExtensionsUrl(url);
}

function isInternalRenderedUrl(url: string) {
  return url.startsWith("data:text/html");
}

function getInternalPageDisplayUrl(url: string) {
  if (isSettingsUrl(url)) {
    return INTERNAL_SETTINGS_URL;
  }

  if (isDownloadsUrl(url)) {
    return INTERNAL_DOWNLOADS_URL;
  }

  if (isExtensionsUrl(url)) {
    return INTERNAL_EXTENSIONS_URL;
  }

  return url;
}

function createDownloadsPageHtml(theme: ThemeSnapshot) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>下载</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${theme.resolved === "dark" ? "#101821" : "#f3f7fb"};
        --panel: ${theme.resolved === "dark" ? "#18212c" : "#ffffff"};
        --line: ${theme.resolved === "dark" ? "#324255" : "#d6dee8"};
        --text: ${theme.resolved === "dark" ? "#edf2f7" : "#1f2328"};
        --muted: ${theme.resolved === "dark" ? "#93a1b1" : "#617283"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 36px 28px; color: var(--text); background: var(--bg); }
      .card { max-width: 880px; margin: 0 auto; padding: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      ul { margin: 18px 0 0; color: var(--muted); line-height: 1.8; }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>下载</h1>
      <p>这里是第一版下载页占位。后续可接入真实下载任务列表、进度、失败重试和打开文件夹能力。</p>
      <ul>
        <li>顶部按钮已经可以直接打开本页</li>
        <li>下载弹出菜单也会把用户带到这里</li>
        <li>当前版本优先打通浏览器式入口路径</li>
      </ul>
    </section>
  </body>
</html>`;
}

function createExtensionsPageHtml(theme: ThemeSnapshot) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>扩展</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${theme.resolved === "dark" ? "#101821" : "#f3f7fb"};
        --panel: ${theme.resolved === "dark" ? "#18212c" : "#ffffff"};
        --line: ${theme.resolved === "dark" ? "#324255" : "#d6dee8"};
        --text: ${theme.resolved === "dark" ? "#edf2f7" : "#1f2328"};
        --muted: ${theme.resolved === "dark" ? "#93a1b1" : "#617283"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 36px 28px; color: var(--text); background: var(--bg); }
      .card { max-width: 880px; margin: 0 auto; padding: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      ul { margin: 18px 0 0; color: var(--muted); line-height: 1.8; }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>扩展</h1>
      <p>这里是扩展页占位。当前版本先把入口与浏览器壳打通，后续可继续接入扩展管理与安装能力。</p>
      <ul>
        <li>顶部扩展按钮会直接打开本页</li>
        <li>主题会跟随当前壳层同步</li>
        <li>后续可扩展为真正的扩展管理面板</li>
      </ul>
    </section>
  </body>
</html>`;
}

function createSettingsPageHtml(theme: ThemeSnapshot) {
  const isDark = theme.resolved === "dark";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>设置</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${isDark ? "#121a23" : "#f7f9fc"};
        --sidebar-bg: ${isDark ? "#151f2a" : "#ffffff"};
        --content-bg: ${isDark ? "#121a23" : "#ffffff"};
        --line: ${isDark ? "#233243" : "#e5eaf0"};
        --text: ${isDark ? "#edf3fb" : "#232a31"};
        --muted: ${isDark ? "#95a5b7" : "#7a8796"};
        --soft: ${isDark ? "#1a2531" : "#f7f9fc"};
        --accent: ${isDark ? "#5f9dff" : "#4d97ff"};
        --accent-strong: ${isDark ? "#4d8cf2" : "#3e86f0"};
        --accent-text: #ffffff;
        --button-bg: ${isDark ? "#192431" : "#ffffff"};
        --button-hover: ${isDark ? "#203041" : "#f2f6fb"};
        --input-bg: ${isDark ? "#101821" : "#fbfcfe"};
        --shadow: ${isDark ? "0 12px 30px rgba(0,0,0,0.22)" : "0 8px 24px rgba(31,45,61,0.06)"};
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--text);
        background: var(--bg);
      }

      .page {
        display: grid;
        grid-template-columns: 244px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar {
        padding: 18px 0 22px;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .sidebar-title {
        padding: 0 18px 14px;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: ${isDark ? "#d6deea" : "#687789"};
      }

      .sidebar-search {
        padding: 0 18px 14px;
      }

      .sidebar-search input,
      .top-search input,
      .homepage-input,
      .select-field {
        width: 100%;
        height: 34px;
        padding: 0 12px;
        color: var(--text);
        background: var(--input-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
        outline: none;
      }

      .sidebar-search input::placeholder,
      .top-search input::placeholder {
        color: var(--muted);
      }

      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 18px;
        font-size: 14px;
        color: var(--muted);
      }

      .nav-item.active {
        color: var(--accent-text);
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
      }

      .nav-icon {
        display: inline-flex;
        width: 15px;
        justify-content: center;
        opacity: 0.9;
      }

      .content {
        padding: 20px 30px 60px;
        background: var(--content-bg);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
      }

      .top-search {
        width: 190px;
      }

      .ghost-button,
      .inline-button {
        height: 34px;
        padding: 0 14px;
        color: var(--muted);
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
        cursor: default;
      }

      .ghost-button:hover,
      .inline-button:hover {
        background: var(--button-hover);
      }

      .section {
        max-width: 920px;
        margin-bottom: 36px;
      }

      .section h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .section-note {
        margin: 8px 0 16px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }

      .option-line,
      .checkbox-line,
      .radio-line {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 12px;
        font-size: 14px;
        color: var(--text);
      }

      .radio-line input,
      .checkbox-line input {
        margin-top: 3px;
      }

      .field-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .homepage-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 4px;
      }

      .homepage-input {
        width: min(420px, 100%);
      }

      .placeholder-panel {
        width: min(620px, 100%);
        min-height: 58px;
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 6px;
      }

      .muted {
        color: var(--muted);
      }

      .inline-note {
        color: var(--muted);
        font-size: 13px;
      }

      .theme-footnote {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media (width <= 960px) {
        .page {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: none;
          border-bottom: 1px solid var(--line);
        }

        .content {
          padding: 20px 18px 42px;
        }

        .topbar,
        .homepage-row {
          flex-direction: column;
          align-items: stretch;
        }

        .top-search {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">选项</div>
        <div class="sidebar-search">
          <input type="text" placeholder="搜索设置" />
        </div>
        <nav class="nav">
          <div class="nav-item active"><span class="nav-icon">◉</span><span>基本设置</span></div>
          <div class="nav-item"><span class="nav-icon">☰</span><span>界面设置</span></div>
          <div class="nav-item"><span class="nav-icon">▣</span><span>标签设置</span></div>
          <div class="nav-item"><span class="nav-icon">⇩</span><span>下载设置</span></div>
          <div class="nav-item"><span class="nav-icon">◎</span><span>鼠标手势</span></div>
          <div class="nav-item"><span class="nav-icon">⌘</span><span>快捷键</span></div>
          <div class="nav-item"><span class="nav-icon">⚗</span><span>实验室</span></div>
          <div class="nav-item"><span class="nav-icon">⚙</span><span>高级设置</span></div>
        </nav>
      </aside>

      <section class="content">
        <div class="topbar">
          <div class="top-search">
            <input type="text" placeholder="搜索设置" />
          </div>
          <button class="ghost-button" type="button">恢复默认设置</button>
        </div>

        <section class="section">
          <h2>启动页面</h2>
          <p class="section-note">这一版先把布局和视觉做得更像浏览器设置中心，后续可以继续往这里填真实功能。</p>

          <div class="field-stack">
            <label class="radio-line">
              <input type="radio" checked />
              <span>打开主页</span>
            </label>
            <div class="homepage-row">
              <input class="homepage-input" type="text" value="https://hao.360.com/?a=1004" />
              <button class="inline-button" type="button">主页已锁定</button>
            </div>
            <div class="inline-note">后续这里可扩展“继续上次未关闭网页”“打开以下网页”等真实配置。</div>
            <label class="radio-line muted">
              <input type="radio" />
              <span>继续浏览上次关闭前打开的网页</span>
            </label>
            <label class="radio-line muted">
              <input type="radio" />
              <span>打开以下网页</span>
            </label>
            <div class="placeholder-panel"></div>
          </div>
        </section>

        <section class="section">
          <h2>搜索</h2>
          <div class="option-line">
            <span style="width: 84px">搜索引擎</span>
            <input class="select-field" type="text" value="360搜索" style="width: 140px" />
            <input class="select-field" type="text" value="管理搜索引擎..." style="width: 180px" />
          </div>
          <label class="checkbox-line">
            <input type="checkbox" checked />
            <span>地址栏可直接搜索，自动匹配默认搜索引擎</span>
          </label>
          <label class="checkbox-line">
            <input type="checkbox" checked />
            <span>新标签页小文本框可作为浏览器搜索工具条</span>
          </label>
          <label class="checkbox-line">
            <input type="checkbox" checked />
            <span>启用搜索栏热词提示等扩展能力</span>
          </label>
          <label class="checkbox-line">
            <input type="checkbox" checked />
            <span>地址栏搜索结果展示联想词</span>
          </label>
        </section>

        <section class="section">
          <h2>默认浏览器</h2>
          <label class="checkbox-line">
            <input type="checkbox" />
            <span>启动时检查是否为默认浏览器</span>
          </label>
          <div class="option-line">
            <button class="inline-button" type="button">将 Electron Chrome 设为默认浏览器</button>
          </div>
          <div class="inline-note">当前默认浏览器状态：后续可接入系统检测，这里先保留占位。</div>
        </section>

        <section class="section">
          <h2>关闭时</h2>
          <label class="checkbox-line">
            <input type="checkbox" checked />
            <span>浏览器异常关闭后，下次启动时提示恢复标签页</span>
          </label>
          <div class="theme-footnote">当前主题来源：${theme.source} · 实际生效：${theme.resolved}。如果使用 <strong>system</strong>，页面会跟随系统主题自动刷新。</div>
        </section>
      </section>
    </main>
  </body>
</html>`;
}

function createInternalPageHtml(url: string, theme: ThemeSnapshot) {
  if (isSettingsUrl(url)) {
    return createSettingsPageHtml(theme);
  }

  if (isDownloadsUrl(url)) {
    return createDownloadsPageHtml(theme);
  }

  if (isExtensionsUrl(url)) {
    return createExtensionsPageHtml(theme);
  }

  return `<!doctype html><html><head><meta charset="UTF-8" /><title>内部页面</title></head><body></body></html>`;
}

function createInternalPageDataUrl(url: string, theme: ThemeSnapshot) {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createInternalPageHtml(url, theme))}`;
}

function openTabUrl(tab: BrowserTab, url: string, theme: ThemeSnapshot) {
  const nextUrl = getInternalPageDisplayUrl(url || DEFAULT_URL);

  tab.url = nextUrl;
  if (isInternalPageUrl(nextUrl)) {
    tab.title = isSettingsUrl(nextUrl)
      ? "设置"
      : isDownloadsUrl(nextUrl)
        ? "下载"
        : isExtensionsUrl(nextUrl)
          ? "扩展"
          : "内部页面";
    void tab.pageView.webContents.loadURL(
      createInternalPageDataUrl(nextUrl, theme),
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

    openTabUrl(tab, tab.url, state.theme);
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
  openTabUrl(tab, initialUrl || DEFAULT_URL, state.theme);
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
  openTabUrl(activeTab, url, state.theme);
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
