import { contextBridge, ipcRenderer } from "electron";

import type {
  DownloadsStateSnapshot,
} from "./main/model.js";

export type DockedShellGpuMode = "hardware" | "compatibility" | "limited";
export type DockedShellThemeSource = "system" | "light" | "dark";
export type DockedShellResolvedTheme = "light" | "dark";
export type DockedShellToolbarPlacement = "left" | "right";
export type DockedShellMenuSection =
  | "file"
  | "navigate"
  | "debug"
  | "app"
  | "downloads"
  | "favorites";
export type DockedShellToolbarContextButtonId =
  | "restoreClosedTab"
  | "favorites";

export interface DockedShellToolbarVisibilityPreference {
  visible: boolean;
}

export interface DockedShellToolbarPlacementPreference extends DockedShellToolbarVisibilityPreference {
  placement: DockedShellToolbarPlacement;
}

export interface DockedShellToolbarPreferencesSnapshot {
  home: DockedShellToolbarVisibilityPreference;
  restoreClosedTab: DockedShellToolbarPlacementPreference;
  favorites: DockedShellToolbarPlacementPreference;
  downloads: DockedShellToolbarVisibilityPreference;
  extensions: DockedShellToolbarVisibilityPreference;
}

export interface DockedShellThemeSnapshot {
  source: DockedShellThemeSource;
  resolved: DockedShellResolvedTheme;
}

export interface DockedShellWindowStateSnapshot {
  isMaximized: boolean;
}

export interface DockedShellRuntimeInfoSnapshot {
  environmentLabel: string;
  gpuMode: DockedShellGpuMode;
  gpuLabel: string;
  gpuReason: string;
  dbusNoiseSuppressed: boolean;
}

export interface DockedShellTabSnapshot {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface DockedShellStateSnapshot {
  activeTabId: string | null;
  canRestoreClosedTab: boolean;
  devtoolsVisible: boolean;
  dockPosition: "bottom" | "left" | "right";
  runtimeInfo: DockedShellRuntimeInfoSnapshot;
  toolbarPreferences: DockedShellToolbarPreferencesSnapshot;
  theme: DockedShellThemeSnapshot;
  tabs: DockedShellTabSnapshot[];
  windowState: DockedShellWindowStateSnapshot;
}

export interface DockedShellMenuAnchor {
  x: number;
  y: number;
}

export type DownloadsPopupStateSnapshot = DownloadsStateSnapshot;

contextBridge.exposeInMainWorld("dockedShell", {
  getState: () =>
    ipcRenderer.invoke(
      "docked-shell:get-state",
    ) as Promise<DockedShellStateSnapshot | null>,
  newTab: (url?: string) => ipcRenderer.send("docked-shell:new-tab", url),
  activateTab: (tabId: string) =>
    ipcRenderer.send("docked-shell:activate-tab", tabId),
  closeTab: (tabId: string) =>
    ipcRenderer.send("docked-shell:close-tab", tabId),
  restoreClosedTab: () => ipcRenderer.send("docked-shell:restore-closed-tab"),
  navigate: (url: string) => ipcRenderer.send("docked-shell:navigate", url),
  openHome: () => ipcRenderer.send("docked-shell:open-home"),
  goBack: () => ipcRenderer.send("docked-shell:go-back"),
  goForward: () => ipcRenderer.send("docked-shell:go-forward"),
  reload: () => ipcRenderer.send("docked-shell:reload"),
  openDownloadsPopup: () => ipcRenderer.send("docked-shell:open-downloads-popup"),
  minimizeWindow: () => ipcRenderer.send("docked-shell:minimize-window"),
  toggleMaximizeWindow: () =>
    ipcRenderer.send("docked-shell:toggle-maximize-window"),
  closeWindow: () => ipcRenderer.send("docked-shell:close-window"),
  showMenu: (section: DockedShellMenuSection, anchor: DockedShellMenuAnchor) =>
    ipcRenderer.invoke("docked-shell:show-menu", { section, anchor }),
  showToolbarButtonContextMenu: (
    buttonId: DockedShellToolbarContextButtonId,
    anchor: DockedShellMenuAnchor,
  ) =>
    ipcRenderer.invoke("docked-shell:show-toolbar-button-context-menu", {
      buttonId,
      anchor,
    }),
  onStateChanged: (callback: (state: DockedShellStateSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: DockedShellStateSnapshot,
    ) => callback(payload);
    ipcRenderer.on("docked-shell:state", listener);
    return () => ipcRenderer.removeListener("docked-shell:state", listener);
  },
});

contextBridge.exposeInMainWorld("downloadsPopup", {
  getState: () =>
    ipcRenderer.invoke(
      "downloads-popup:get-state",
    ) as Promise<DownloadsPopupStateSnapshot>,
  openItem: (id: string) => ipcRenderer.invoke("downloads-popup:open-item", id),
  showItemInFolder: (id: string) =>
    ipcRenderer.invoke("downloads-popup:show-item-in-folder", id),
  retryDownload: (id: string) =>
    ipcRenderer.invoke("downloads-popup:retry-download", id),
  clearCompleted: () => ipcRenderer.send("downloads-popup:clear-completed"),
  removeItem: (id: string) => ipcRenderer.send("downloads-popup:remove-item", id),
  openDownloadsPage: () => ipcRenderer.send("downloads-popup:open-downloads-page"),
  openDownloadsSettings: () =>
    ipcRenderer.send("downloads-popup:open-downloads-settings"),
  onStateChanged: (
    callback: (state: DownloadsPopupStateSnapshot) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: DownloadsPopupStateSnapshot,
    ) => callback(payload);
    ipcRenderer.on("downloads:state", listener);
    return () => ipcRenderer.removeListener("downloads:state", listener);
  },
});
