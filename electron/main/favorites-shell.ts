import { BrowserWindow, type MenuItemConstructorOptions } from "electron";

import type { FavoritesController } from "./favorites-controller.js";
import {
  type BrowserShellState,
  type BrowserTab,
  INTERNAL_FAVORITES_URL,
} from "./model.js";
import { getFavoritesActionFromUrl, isFavoritesUrl } from "./url-utils.js";

interface FavoritesShellDeps {
  controller: FavoritesController;
  activateTab: (
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
  getActiveTab: (state: BrowserShellState) => BrowserTab | null;
  isInternalPageUrl: (url: string) => boolean;
  navigateActiveTab: (state: BrowserShellState, url: string) => void;
  notifyStateChanged: (win: BrowserWindow, state: BrowserShellState) => void;
  openTabUrl: (tab: BrowserTab, url: string, state: BrowserShellState) => void;
  windowStates: Map<number, BrowserShellState>;
}

export function refreshFavoritesTabs(deps: FavoritesShellDeps) {
  deps.windowStates.forEach((state, windowId) => {
    const win = BrowserWindow.fromId(windowId);

    if (!win) {
      return;
    }

    state.tabs
      .filter((tab) => isFavoritesUrl(tab.url))
      .forEach((tab) => {
        deps.openTabUrl(tab, INTERNAL_FAVORITES_URL, state);
      });

    deps.notifyStateChanged(win, state);
  });
}

export function openFavoritesTab(
  win: BrowserWindow,
  state: BrowserShellState,
  deps: FavoritesShellDeps,
) {
  const existingTab = state.tabs.find((tab) => isFavoritesUrl(tab.url));

  if (existingTab) {
    deps.activateTab(win, state, existingTab.id);
    deps.openTabUrl(existingTab, INTERNAL_FAVORITES_URL, state);
    deps.notifyStateChanged(win, state);
    return existingTab;
  }

  return deps.createTab(win, state, INTERNAL_FAVORITES_URL, { activate: true });
}

export function buildFavoritesMenuTemplate(
  win: BrowserWindow,
  state: BrowserShellState,
  deps: FavoritesShellDeps,
): MenuItemConstructorOptions[] {
  const activeTab = deps.getActiveTab(state);
  const favoritesState = deps.controller.getState();
  const topEntries = favoritesState.entries.slice(0, 8);
  const canAddCurrent = Boolean(
    activeTab?.url && !deps.isInternalPageUrl(activeTab.url),
  );
  const alreadyFavorite = Boolean(
    activeTab?.url && deps.controller.hasUrl(activeTab.url),
  );

  return [
    {
      label: alreadyFavorite ? "当前页面已收藏" : "收藏当前页面",
      enabled: canAddCurrent,
      click: () => {
        if (!activeTab?.url || deps.isInternalPageUrl(activeTab.url)) {
          return;
        }

        deps.controller.addEntry(activeTab.title, activeTab.url, "收藏栏");
        refreshFavoritesTabs(deps);
      },
    },
    {
      label: "打开收藏管理页",
      click: () => openFavoritesTab(win, state, deps),
    },
    { type: "separator" },
    ...(topEntries.length > 0
      ? topEntries.map((entry) => ({
          label: entry.title || entry.url,
          sublabel: entry.folder,
          click: () => deps.navigateActiveTab(state, entry.url),
        }))
      : [
          {
            label: "还没有收藏内容",
            enabled: false,
          },
        ]),
  ];
}

export function handleFavoritesUrlAction(
  rawUrl: string,
  state: BrowserShellState,
  deps: FavoritesShellDeps,
) {
  const favoritesAction = getFavoritesActionFromUrl(rawUrl);

  if (!favoritesAction) {
    return false;
  }

  if (favoritesAction.type === "add-current") {
    const activeTab = deps.getActiveTab(state);

    if (activeTab?.url && !deps.isInternalPageUrl(activeTab.url)) {
      return Boolean(
        deps.controller.addEntry(activeTab.title, activeTab.url, "收藏栏"),
      );
    }

    return false;
  }

  if (favoritesAction.type === "create") {
    return Boolean(
      deps.controller.addEntry(
        favoritesAction.title,
        favoritesAction.url,
        favoritesAction.folder || "收藏栏",
      ),
    );
  }

  if (favoritesAction.type === "create-folder") {
    return Boolean(
      deps.controller.createFolder(
        favoritesAction.parent || null,
        favoritesAction.name,
      ),
    );
  }

  if (favoritesAction.type === "delete") {
    return deps.controller.removeEntry(favoritesAction.id);
  }

  if (favoritesAction.type === "edit") {
    return deps.controller.editEntry(
      favoritesAction.id,
      favoritesAction.title,
      favoritesAction.url,
      favoritesAction.folder || "收藏栏",
    );
  }

  if (favoritesAction.type === "move") {
    return deps.controller.moveEntry(
      favoritesAction.id,
      favoritesAction.folder || "收藏栏",
    );
  }

  return false;
}
