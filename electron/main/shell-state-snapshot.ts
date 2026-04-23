import { BrowserWindow } from "electron";

import type { FavoritesController } from "./favorites-controller.js";
import { cloneToolbarPreferences } from "./local-persistence.js";
import {
  type BrowserShellState,
  type ThemeSnapshot,
  type ToolbarPreferences,
  type RuntimeInfoSnapshot,
  type DockPosition,
} from "./model.js";
import { isInternalPageUrl } from "./url-utils.js";

export interface ShellStateSnapshot {
  activeTabId: string | null;
  canRestoreClosedTab: boolean;
  currentPageCanFavorite: boolean;
  currentPageIsFavorite: boolean;
  devtoolsVisible: boolean;
  dockPosition: DockPosition;
  runtimeInfo: RuntimeInfoSnapshot;
  toolbarPreferences: ToolbarPreferences;
  theme: ThemeSnapshot;
  tabs: Array<{
    id: string;
    title: string;
    url: string;
    iconUrl?: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }>;
  windowState: {
    isMaximized: boolean;
  };
}

export function getShellStateSnapshot(
  state: BrowserShellState,
  favoritesController: FavoritesController,
): ShellStateSnapshot {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
  const currentPageCanFavorite = Boolean(
    activeTab?.url && !isInternalPageUrl(activeTab.url),
  );
  const currentPageIsFavorite = Boolean(
    currentPageCanFavorite &&
      activeTab?.url &&
      favoritesController.hasUrl(activeTab.url),
  );

  return {
    activeTabId: state.activeTabId,
    canRestoreClosedTab: state.closedTabHistory.length > 0,
    currentPageCanFavorite,
    currentPageIsFavorite,
    devtoolsVisible: state.devtoolsVisible,
    dockPosition: state.dockPosition,
    runtimeInfo: state.runtimeInfo,
    toolbarPreferences: cloneToolbarPreferences(state.toolbarPreferences),
    theme: state.theme,
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      iconUrl: tab.iconUrl,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
    })),
    windowState: {
      isMaximized: state.isMaximized,
    },
  };
}

export function sendShellStateToWindow(
  win: BrowserWindow,
  snapshot: ShellStateSnapshot,
) {
  if (win.isDestroyed() || win.webContents.isDestroyed()) {
    return;
  }

  try {
    win.webContents.send("docked-shell:state", snapshot);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!errorMessage.includes("disposed")) {
      console.warn("[electron-chrome] failed to send shell state", {
        error: errorMessage,
      });
    }
  }
}
