import type { WebContentsView } from "electron";

export const INTERNAL_HOME_URL = "shell://home";
export const SEARCH_ENGINE_URL = "https://www.baidu.com/s?wd=";
export const DEFAULT_URL = INTERNAL_HOME_URL;
export const INTERNAL_DOWNLOADS_URL = "chrome://downloads";
export const INTERNAL_EXTENSIONS_URL = "chrome://extensions";
export const INTERNAL_HISTORY_URL = "chrome://history";
export const INTERNAL_SETTINGS_URL = "chrome://settings";
export const CONTROLS_HEIGHT = 136;
export const DEFAULT_DOCK_HEIGHT = 360;
export const DEFAULT_DOCK_WIDTH = 520;
export const MAX_HISTORY_ENTRIES = 240;
export const GPU_COMPAT_RELAUNCH_ARG = "--gpu-compat-relaunch";
export const DOCK_POSITIONS = {
  bottom: "bottom",
  left: "left",
  right: "right",
} as const;

export type DockPosition = (typeof DOCK_POSITIONS)[keyof typeof DOCK_POSITIONS];
export type SettingsSection =
  | "browser"
  | "uiStyle"
  | "tabOptions"
  | "downloadSetting"
  | "tpMoreMouseGesture"
  | "shortcut"
  | "advanced"
  | "lab"
  | "privacySecurity";
export type MenuSection =
  | "file"
  | "navigate"
  | "debug"
  | "app"
  | "downloads"
  | "favorites";
export type GpuMode = "hardware" | "compatibility" | "limited";
export type ThemeSource = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ToolbarPlacement = "left" | "right";
export type ToolbarContextButtonId = "restoreClosedTab" | "favorites";

export interface ToolbarVisibilityPreference {
  visible: boolean;
}

export interface ToolbarPlacementPreference
  extends ToolbarVisibilityPreference {
  placement: ToolbarPlacement;
}

export interface ToolbarPreferences {
  home: ToolbarVisibilityPreference;
  restoreClosedTab: ToolbarPlacementPreference;
  favorites: ToolbarPlacementPreference;
  downloads: ToolbarVisibilityPreference;
  extensions: ToolbarVisibilityPreference;
}

export const DEFAULT_TOOLBAR_PREFERENCES: ToolbarPreferences = {
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

export interface RuntimePreferences {
  preferCompatibilityGpu: boolean;
  themeSource: ThemeSource;
  toolbarPreferences: ToolbarPreferences;
}

export interface ThemeSnapshot {
  source: ThemeSource;
  resolved: ResolvedTheme;
}

export interface RuntimeInfoSnapshot {
  environmentLabel: string;
  gpuMode: GpuMode;
  gpuLabel: string;
  gpuReason: string;
  dbusNoiseSuppressed: boolean;
}

export type DownloadRecordState =
  | "progressing"
  | "paused"
  | "completed"
  | "cancelled"
  | "interrupted";

export interface DownloadRecordSnapshot {
  id: string;
  fileName: string;
  sourceUrl: string;
  sourcePageUrl?: string;
  savePath?: string;
  mimeType?: string;
  receivedBytes: number;
  totalBytes: number;
  state: DownloadRecordState;
  isPaused: boolean;
  canResume: boolean;
  startedAt: string;
  updatedAt: string;
  existsOnDisk: boolean;
}

export interface DownloadsStateSnapshot {
  theme: ThemeSnapshot;
  items: DownloadRecordSnapshot[];
}

export interface TabSnapshot {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserHistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: string;
}

export interface BrowserTab extends TabSnapshot {
  iconRequestVersion: number;
  pageView: WebContentsView;
}

export interface BrowserShellState {
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

export const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  summary: string;
}> = [
  {
    id: "browser",
    label: "基础偏好",
    summary: "启动页、搜索与关闭恢复等基础浏览器偏好。",
  },
  {
    id: "uiStyle",
    label: "界面外观",
    summary: "主题、工具栏按钮与壳层观感。",
  },
  {
    id: "tabOptions",
    label: "标签行为",
    summary: "标签创建、关闭与切换体验说明。",
  },
  {
    id: "downloadSetting",
    label: "下载中心",
    summary: "下载入口与下载页演进方向。",
  },
  {
    id: "tpMoreMouseGesture",
    label: "手势与快捷操作",
    summary: "为后续更高频交互预留，但当前不做假功能。",
  },
  {
    id: "shortcut",
    label: "快捷键",
    summary: "展示当前已经接入并验证可用的快捷键。",
  },
  {
    id: "advanced",
    label: "高级与运行时",
    summary: "环境信息、GPU 状态与兼容策略。",
  },
  {
    id: "lab",
    label: "实验功能",
    summary: "实验位只做预留，默认不影响主浏览链路。",
  },
  {
    id: "privacySecurity",
    label: "隐私与数据",
    summary: "历史记录范围与本地数据说明。",
  },
];

export function getDesktopChromePlatformToken() {
  if (process.platform === "win32") {
    return "Windows NT 10.0; Win64; x64";
  }

  if (process.platform === "darwin") {
    return "Macintosh; Intel Mac OS X 10_15_7";
  }

  return process.arch === "arm64"
    ? "X11; Linux aarch64"
    : "X11; Linux x86_64";
}

export function buildDesktopChromeUserAgent() {
  const chromeVersion = process.versions.chrome || "140.0.0.0";
  return `Mozilla/5.0 (${getDesktopChromePlatformToken()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

export function getWindowBackgroundColor(theme: ResolvedTheme) {
  return theme === "dark" ? "#0b1118" : "#dce4ee";
}
