import type { BrowserWindow, WebContents, WebContentsView } from "electron";

import type { FavoritesController } from "./favorites-controller.js";
import type {
  BrowserShellState,
  BrowserTab,
  DockPosition,
  RuntimeInfoSnapshot,
  RuntimePreferences,
  ThemeSnapshot,
  ThemeSource,
  ToolbarPreferences,
} from "./model.js";
import type { ShellStateSnapshot } from "./shell-state-snapshot.js";

export interface FavoritesShellDepsSnapshot {
  controller: FavoritesController;
  activateTab: ShellController["activateTab"];
  createTab: ShellController["createTab"];
  getActiveTab: ShellController["getActiveTab"];
  isInternalPageUrl: (url: string) => boolean;
  navigateActiveTab: ShellController["navigateActiveTab"];
  notifyStateChanged: ShellController["notifyStateChanged"];
  openTabUrl: ShellController["openTabUrl"];
  windowStates: Map<number, BrowserShellState>;
}

export interface ShellControllerOptions {
  favoritesController: FavoritesController;
  onThemeChanged: () => void;
  runtimeInfo: RuntimeInfoSnapshot;
  runtimePreferences: RuntimePreferences;
  setWindowMenu: (win: BrowserWindow, state: BrowserShellState) => void;
}

export interface ShellController {
  activateTab: (
    win: BrowserWindow,
    state: BrowserShellState,
    tabId: string,
  ) => void;
  attachTabKeyboardShortcuts: (
    contents: WebContents,
    win: BrowserWindow,
    state: BrowserShellState,
  ) => void;
  closeOtherTabs: (
    win: BrowserWindow,
    state: BrowserShellState,
    tabId: string,
  ) => void;
  closeTab: (
    win: BrowserWindow,
    state: BrowserShellState,
    tabId: string,
  ) => void;
  createTab: (
    win: BrowserWindow,
    state: BrowserShellState,
    initialUrl: string,
    options?: { activate?: boolean },
  ) => BrowserTab;
  createWindowState: (devtoolsView: WebContentsView) => BrowserShellState;
  getActivePageView: (state: BrowserShellState) => WebContentsView | null;
  getActiveTab: (state: BrowserShellState) => BrowserTab | null;
  getCurrentThemeSnapshot: () => ThemeSnapshot;
  getFavoritesShellDeps: () => FavoritesShellDepsSnapshot;
  getLastFocusedShellWindow: () => BrowserWindow | null;
  getStateSnapshot: (state: BrowserShellState) => ShellStateSnapshot;
  getWindowContextFromWebContents: (
    contents: WebContents,
  ) => { state: BrowserShellState; win: BrowserWindow } | null;
  getWindowState: (windowId: number) => BrowserShellState | null;
  handleNativeThemeUpdated: () => void;
  handleWindowClosed: (win: BrowserWindow, state: BrowserShellState) => void;
  layoutViews: (win: BrowserWindow, state: BrowserShellState) => void;
  markWindowFocused: (windowId: number) => void;
  navigateActiveTab: (state: BrowserShellState, url: string) => void;
  notifyStateChanged: (win: BrowserWindow, state: BrowserShellState) => void;
  hideFindBar: (win: BrowserWindow, state: BrowserShellState) => void;
  performFindInPage: (
    win: BrowserWindow,
    state: BrowserShellState,
    query: string,
    options?: { forward?: boolean; findNext?: boolean },
  ) => void;
  startFindInPage: (win: BrowserWindow, state: BrowserShellState) => void;
  openDownloadsTab: (
    win: BrowserWindow,
    state: BrowserShellState,
  ) => BrowserTab;
  openExtensionsTab: (
    win: BrowserWindow,
    state: BrowserShellState,
  ) => BrowserTab;
  openFavoritesTab: (
    win: BrowserWindow,
    state: BrowserShellState,
  ) => BrowserTab;
  openHistoryTab: (win: BrowserWindow, state: BrowserShellState) => BrowserTab;
  openSettingsTab: (win: BrowserWindow, state: BrowserShellState) => BrowserTab;
  openTabUrl: (tab: BrowserTab, url: string, state: BrowserShellState) => void;
  quickFavoriteActiveTab: (
    win: BrowserWindow,
    state: BrowserShellState,
  ) => boolean;
  refreshAllWindowsState: () => void;
  registerWindow: (win: BrowserWindow, state: BrowserShellState) => void;
  restoreClosedTab: (win: BrowserWindow, state: BrowserShellState) => void;
  restoreClosedTabAt: (
    win: BrowserWindow,
    state: BrowserShellState,
    index: number,
  ) => void;
  sendStateToShell: (win: BrowserWindow, state: BrowserShellState) => void;
  setDockPosition: (
    win: BrowserWindow,
    state: BrowserShellState,
    dockPosition: DockPosition,
  ) => void;
  setThemeSource: (nextThemeSource: ThemeSource) => void;
  toggleDockedDevTools: (win: BrowserWindow, state: BrowserShellState) => void;
  updateToolbarPreferences: (
    updater: (preferences: ToolbarPreferences) => ToolbarPreferences,
  ) => void;
}
