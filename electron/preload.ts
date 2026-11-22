import { contextBridge, ipcRenderer } from "electron";

import type { DownloadsStateSnapshot } from "./main/model.js";

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
  currentPageCanFavorite: boolean;
  currentPageIsFavorite: boolean;
  findBarVisible: boolean;
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
  showClosedTabsMenu: (anchor: DockedShellMenuAnchor) =>
    ipcRenderer.invoke("docked-shell:show-closed-tabs-menu", anchor),
  navigate: (url: string) => ipcRenderer.send("docked-shell:navigate", url),
  openHome: () => ipcRenderer.send("docked-shell:open-home"),
  quickFavoriteCurrentPage: () =>
    ipcRenderer.send("docked-shell:quick-favorite-current-page"),
  goBack: () => ipcRenderer.send("docked-shell:go-back"),
  goForward: () => ipcRenderer.send("docked-shell:go-forward"),
  reload: () => ipcRenderer.send("docked-shell:reload"),
  findInPage: (
    query: string,
    options?: { forward?: boolean; findNext?: boolean },
  ) =>
    ipcRenderer.invoke("docked-shell:find-in-page", {
      query,
      forward: options?.forward,
      findNext: options?.findNext,
    }),
  hideFindBar: () => ipcRenderer.send("docked-shell:find-bar-hide"),
  showTabContextMenu: (tabId: string, anchor: DockedShellMenuAnchor) =>
    ipcRenderer.invoke("docked-shell:show-tab-context-menu", { tabId, anchor }),
  closeOtherTabs: (tabId: string) =>
    ipcRenderer.send("docked-shell:close-other-tabs", tabId),
  openDownloadsPopup: () =>
    ipcRenderer.send("docked-shell:open-downloads-popup"),
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
  onFocusUrlInput: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("docked-shell:focus-url-input", listener);
    return () =>
      ipcRenderer.removeListener("docked-shell:focus-url-input", listener);
  },
  onFindBarShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("docked-shell:find-bar-shown", listener);
    return () =>
      ipcRenderer.removeListener("docked-shell:find-bar-shown", listener);
  },
  onFindBarResult: (
    callback: (result: { activeMatchOrdinal: number; matches: number }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { activeMatchOrdinal: number; matches: number },
    ) => callback(payload);
    ipcRenderer.on("docked-shell:find-bar-result", listener);
    return () =>
      ipcRenderer.removeListener("docked-shell:find-bar-result", listener);
  },
});

contextBridge.exposeInMainWorld("downloadsPopup", {
  getState: () =>
    ipcRenderer.invoke(
      "downloads-popup:get-state",
    ) as Promise<DownloadsPopupStateSnapshot>,
  setThemeSource: (themeSource: DockedShellThemeSource) =>
    ipcRenderer.send("downloads-popup:set-theme-source", themeSource),
  openItem: (id: string) => ipcRenderer.invoke("downloads-popup:open-item", id),
  showItemInFolder: (id: string) =>
    ipcRenderer.invoke("downloads-popup:show-item-in-folder", id),
  retryDownload: (id: string) =>
    ipcRenderer.invoke("downloads-popup:retry-download", id),
  clearCompleted: () => ipcRenderer.send("downloads-popup:clear-completed"),
  removeItem: (id: string) =>
    ipcRenderer.send("downloads-popup:remove-item", id),
  openDownloadsPage: () =>
    ipcRenderer.send("downloads-popup:open-downloads-page"),
  openDownloadsSettings: () =>
    ipcRenderer.send("downloads-popup:open-downloads-settings"),
  onStateChanged: (callback: (state: DownloadsPopupStateSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: DownloadsPopupStateSnapshot,
    ) => callback(payload);
    ipcRenderer.on("downloads:state", listener);
    return () => ipcRenderer.removeListener("downloads:state", listener);
  },
});
