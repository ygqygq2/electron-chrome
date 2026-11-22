import {
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  nativeTheme,
  type WebContents,
  WebContentsView,
} from "electron";

import {
  handleFavoritesUrlAction,
  openFavoritesTab,
  refreshFavoritesTabs,
} from "./favorites-shell.js";
import {
  cloneToolbarPreferences,
  getThemeSnapshot,
  normalizeThemeSource,
  normalizeToolbarPreferences,
  writeRuntimePreferences,
} from "./local-persistence.js";
import {
  type BrowserShellState,
  type BrowserTab,
  buildDesktopChromeUserAgent,
  CONTROLS_HEIGHT,
  DEFAULT_DOCK_HEIGHT,
  DEFAULT_DOCK_WIDTH,
  DEFAULT_URL,
  DOCK_POSITIONS,
  type DockPosition,
  FIND_BAR_HEIGHT,
  getWindowBackgroundColor,
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_SETTINGS_URL,
  SETTINGS_SECTIONS,
  type ThemeSource,
  type ToolbarPreferences,
} from "./model.js";
import { createInternalPageDataUrl } from "./page-html.js";
import type {
  ShellController,
  ShellControllerOptions,
} from "./shell-controller-types.js";
import { queueTabFaviconUpdate } from "./shell-favicon.js";
import { createBrowserHistoryStore } from "./shell-history-store.js";
import {
  getShellStateSnapshot,
  sendShellStateToWindow,
} from "./shell-state-snapshot.js";
import {
  getHistoryActionFromUrl,
  getInternalPageDisplayUrl,
  getSettingsSectionFromUrl,
  isDownloadsUrl,
  isExtensionsUrl,
  isFavoritesUrl,
  isHistoryUrl,
  isInternalPageUrl,
  isInternalRenderedUrl,
  isSettingsUrl,
} from "./url-utils.js";

const DESKTOP_CHROME_USER_AGENT = buildDesktopChromeUserAgent();
const MAX_CLOSED_TAB_HISTORY = 12;

export function createShellController(
  options: ShellControllerOptions,
): ShellController {
  const { favoritesController, runtimeInfo, runtimePreferences } = options;
  const windowStates = new Map<number, BrowserShellState>();
  const browserHistoryStore = createBrowserHistoryStore();
  let lastFocusedShellWindowId: number | null = null;

  function isDevToolsToggleShortcut(input: Electron.Input) {
    const key = typeof input.key === "string" ? input.key.toLowerCase() : "";
    return (
      input.type === "keyDown" &&
      (input.key === "F12" ||
        (Boolean(input.control) && Boolean(input.shift) && key === "i"))
    );
  }

  function isFindShortcut(input: Electron.Input) {
    return (
      input.type === "keyDown" && Boolean(input.control) && input.key === "f"
    );
  }

  function isFocusAddressBarShortcut(input: Electron.Input) {
    return (
      input.type === "keyDown" && Boolean(input.control) && input.key === "l"
    );
  }

  function isZoomShortcut(input: Electron.Input) {
    if (input.type !== "keyDown" || !input.control) {
      return false;
    }

    return input.key === "=" || input.key === "-" || input.key === "0";
  }

  function createTabId() {
    return `tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function getLastFocusedShellWindow() {
    const rememberedWindow = lastFocusedShellWindowId
      ? BrowserWindow.fromId(lastFocusedShellWindowId)
      : null;

    if (rememberedWindow && windowStates.has(rememberedWindow.id)) {
      return rememberedWindow;
    }

    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && windowStates.has(focusedWindow.id)) {
      return focusedWindow;
    }

    return (
      BrowserWindow.getAllWindows().find((win) => windowStates.has(win.id)) ??
      null
    );
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

  function getFavoritesShellDeps() {
    return {
      controller: favoritesController,
      activateTab,
      createTab,
      getActiveTab,
      isInternalPageUrl,
      navigateActiveTab,
      notifyStateChanged,
      openTabUrl,
      windowStates,
    };
  }

  function openTabUrl(tab: BrowserTab, url: string, state: BrowserShellState) {
    const rawUrl = url || DEFAULT_URL;
    const historyAction = getHistoryActionFromUrl(rawUrl);
    const favoritesChanged = handleFavoritesUrlAction(
      rawUrl,
      state,
      getFavoritesShellDeps(),
    );

    if (historyAction?.type === "clear") {
      browserHistoryStore.clear();
    } else if (historyAction?.type === "delete") {
      browserHistoryStore.removeEntry(historyAction.id);
    }

    if (favoritesChanged) {
      refreshFavoritesTabs(getFavoritesShellDeps());
    }

    const nextUrl = getInternalPageDisplayUrl(rawUrl);

    tab.url = nextUrl;
    if (isInternalPageUrl(nextUrl)) {
      tab.iconUrl = undefined;
      tab.title = isSettingsUrl(nextUrl)
        ? `设置 · ${
            SETTINGS_SECTIONS.find(
              (section) => section.id === getSettingsSectionFromUrl(nextUrl),
            )?.label ?? "基础偏好"
          }`
        : isDownloadsUrl(nextUrl)
          ? "下载"
          : isExtensionsUrl(nextUrl)
            ? "扩展"
            : isFavoritesUrl(nextUrl)
              ? "收藏夹"
              : isHistoryUrl(nextUrl)
                ? "历史记录"
                : "内部页面";
      void tab.pageView.webContents.loadURL(
        createInternalPageDataUrl(
          nextUrl,
          state.theme,
          state,
          browserHistoryStore.getEntries(),
          favoritesController.getState(),
        ),
      );
      return;
    }

    void tab.pageView.webContents.loadURL(nextUrl);
  }

  function getStateSnapshot(state: BrowserShellState) {
    return getShellStateSnapshot(state, favoritesController);
  }

  function quickFavoriteActiveTab(
    win: BrowserWindow,
    state: BrowserShellState,
  ) {
    const activeTab = getActiveTab(state);

    if (!activeTab?.url || isInternalPageUrl(activeTab.url)) {
      notifyStateChanged(win, state);
      return false;
    }

    if (favoritesController.hasUrl(activeTab.url)) {
      notifyStateChanged(win, state);
      return false;
    }

    const addedEntryId = favoritesController.addEntry(
      activeTab.title,
      activeTab.url,
      "收藏栏",
    );

    if (!addedEntryId) {
      notifyStateChanged(win, state);
      return false;
    }

    refreshFavoritesTabs(getFavoritesShellDeps());
    return true;
  }

  function sendStateToShell(win: BrowserWindow, state: BrowserShellState) {
    sendShellStateToWindow(win, getStateSnapshot(state));
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
    options.setWindowMenu(win, state);
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
      const state = windowStates.get(win.id);
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
      const state = windowStates.get(win.id);
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
      const state = windowStates.get(win.id);
      if (!state) {
        continue;
      }

      state.theme = getThemeSnapshot(normalizedThemeSource);
      win.setBackgroundColor(getWindowBackgroundColor(state.theme.resolved));
      refreshInternalPagesForTheme(state);
      notifyStateChanged(win, state);
    }

    options.onThemeChanged();
  }

  function handleNativeThemeUpdated() {
    if (runtimePreferences.themeSource !== "system") {
      return;
    }

    for (const win of BrowserWindow.getAllWindows()) {
      const state = windowStates.get(win.id);
      if (!state) {
        continue;
      }

      state.theme = getThemeSnapshot("system");
      win.setBackgroundColor(getWindowBackgroundColor(state.theme.resolved));
      refreshInternalPagesForTheme(state);
      notifyStateChanged(win, state);
    }

    options.onThemeChanged();
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
    const contentTop =
      CONTROLS_HEIGHT + (state.findBarVisible ? FIND_BAR_HEIGHT : 0);
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
    activePageView.setBounds({
      x: 0,
      y: contentTop,
      width,
      height: pageHeight,
    });
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

  function openFavoritesManagerTab(
    win: BrowserWindow,
    state: BrowserShellState,
  ) {
    return openFavoritesTab(win, state, getFavoritesShellDeps());
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

  function attachTabKeyboardShortcuts(
    contents: WebContents,
    win: BrowserWindow,
    state: BrowserShellState,
  ) {
    contents.on("before-input-event", (event, input) => {
      if (isDevToolsToggleShortcut(input)) {
        event.preventDefault();
        toggleDockedDevTools(win, state);
        return;
      }

      if (isFindShortcut(input)) {
        event.preventDefault();
        startFindInPage(win, state);
        return;
      }

      if (isFocusAddressBarShortcut(input)) {
        event.preventDefault();
        sendShellUiEvent(win, "docked-shell:focus-url-input");
        return;
      }

      if (isZoomShortcut(input)) {
        event.preventDefault();
        zoomActiveTab(state, input.key);
      }
    });
  }

  function sendShellUiEvent(
    win: BrowserWindow,
    channel:
      | "docked-shell:focus-url-input"
      | "docked-shell:find-bar-shown"
      | "docked-shell:find-bar-result",
    payload?: unknown,
  ) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) {
      return;
    }

    try {
      win.webContents.send(channel, payload);
    } catch {
      // 窗口销毁过程中的事件发送失败可安全忽略
    }
  }

  function zoomActiveTab(state: BrowserShellState, key: string) {
    const pageView = getActivePageView(state);
    if (!pageView) {
      return;
    }

    const { webContents } = pageView;

    if (key === "0") {
      webContents.setZoomLevel(0);
      return;
    }

    const currentLevel = webContents.getZoomLevel();
    webContents.setZoomLevel(currentLevel + (key === "=" ? 1 : -1));
  }

  function startFindInPage(win: BrowserWindow, state: BrowserShellState) {
    state.findBarVisible = true;
    layoutViews(win, state);
    notifyStateChanged(win, state);
    sendShellUiEvent(win, "docked-shell:find-bar-shown");
  }

  function hideFindBar(win: BrowserWindow, state: BrowserShellState) {
    if (!state.findBarVisible) {
      return;
    }

    const activePageView = getActivePageView(state);
    if (activePageView && !activePageView.webContents.isDestroyed()) {
      activePageView.webContents.stopFindInPage("clearSelection");
    }

    state.findBarVisible = false;
    layoutViews(win, state);
    notifyStateChanged(win, state);
  }

  function performFindInPage(
    win: BrowserWindow,
    state: BrowserShellState,
    query: string,
    options: { forward?: boolean; findNext?: boolean } = {},
  ) {
    const activePageView = getActivePageView(state);
    if (!activePageView || activePageView.webContents.isDestroyed()) {
      return;
    }

    const trimmedQuery = query.trim();
    const { webContents } = activePageView;

    if (!trimmedQuery) {
      webContents.stopFindInPage("clearSelection");
      sendShellUiEvent(win, "docked-shell:find-bar-result", {
        activeMatchOrdinal: 0,
        matches: 0,
      });
      return;
    }

    webContents.findInPage(trimmedQuery, {
      forward: options.forward !== false,
      findNext: options.findNext === true,
    });

    webContents.once("found-in-page", (_event, result) => {
      sendShellUiEvent(win, "docked-shell:find-bar-result", {
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
      });
    });
  }

  function closeOtherTabs(
    win: BrowserWindow,
    state: BrowserShellState,
    tabId: string,
  ) {
    const targetIds = state.tabs
      .map((tab) => tab.id)
      .filter((id) => id !== tabId);

    for (const id of targetIds) {
      closeTab(win, state, id);
    }
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
      iconUrl: undefined,
      iconRequestVersion: 0,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      pageView,
    };

    attachTabKeyboardShortcuts(pageView.webContents, win, state);

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
      browserHistoryStore.updateRecentTitle(tab.url, tab.title);
      notifyStateChanged(win, state);
    });

    pageView.webContents.on("page-favicon-updated", (_event, favicons) => {
      queueTabFaviconUpdate(
        win,
        state,
        tab,
        tab.url,
        notifyStateChanged,
        favicons,
      );
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
      browserHistoryStore.recordVisit(tab.url, tab.title);
    });

    pageView.webContents.on("did-navigate", (_event, url) => {
      if (!(isInternalPageUrl(tab.url) && isInternalRenderedUrl(url))) {
        tab.url = url;
        queueTabFaviconUpdate(win, state, tab, url, notifyStateChanged);
      }
      syncTabNavigationState(tab);
      notifyStateChanged(win, state);
    });

    pageView.webContents.on("did-navigate-in-page", (_event, url) => {
      if (!(isInternalPageUrl(tab.url) && isInternalRenderedUrl(url))) {
        tab.url = url;
        queueTabFaviconUpdate(win, state, tab, url, notifyStateChanged);
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
        queueTabFaviconUpdate(win, state, tab, tab.url, notifyStateChanged);
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

  function closeTab(
    win: BrowserWindow,
    state: BrowserShellState,
    tabId: string,
  ) {
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
      state.closedTabHistory = state.closedTabHistory.slice(
        -MAX_CLOSED_TAB_HISTORY,
      );
      browserHistoryStore.markClosed(tab.url);
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

  function createWindowState(devtoolsView: WebContentsView): BrowserShellState {
    return {
      closedTabHistory: [],
      findBarVisible: false,
      devtoolsView,
      devtoolsVisible: false,
      dockPosition: DOCK_POSITIONS.bottom,
      currentPageCanFavorite: false,
      currentPageIsFavorite: false,
      runtimeInfo,
      toolbarPreferences: cloneToolbarPreferences(
        runtimePreferences.toolbarPreferences,
      ),
      theme: getThemeSnapshot(runtimePreferences.themeSource),
      tabs: [],
      activeTabId: null,
      attachedTabId: null,
      devtoolsAttached: false,
      isMaximized: false,
    };
  }

  function registerWindow(win: BrowserWindow, state: BrowserShellState) {
    windowStates.set(win.id, state);
  }

  function markWindowFocused(windowId: number) {
    lastFocusedShellWindowId = windowId;
  }

  function handleWindowClosed(win: BrowserWindow, state: BrowserShellState) {
    if (lastFocusedShellWindowId === win.id) {
      lastFocusedShellWindowId = null;
    }
    windowStates.delete(win.id);
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
      state.devtoolsView.webContents.close();
    } catch {
      console.warn(
        "[electron-chrome] failed to close devtools view during cleanup",
        { windowId: win.id },
      );
    }
  }

  function getWindowState(windowId: number) {
    return windowStates.get(windowId) ?? null;
  }

  function getWindowContextFromWebContents(contents: WebContents) {
    const win = BrowserWindow.fromWebContents(contents);
    const state = win ? getWindowState(win.id) : null;

    if (!win || !state) {
      return null;
    }

    return { win, state };
  }

  function getCurrentThemeSnapshot() {
    return getThemeSnapshot(runtimePreferences.themeSource);
  }

  return {
    activateTab,
    attachTabKeyboardShortcuts,
    closeOtherTabs,
    closeTab,
    createTab,
    createWindowState,
    getActivePageView,
    getActiveTab,
    getCurrentThemeSnapshot,
    getFavoritesShellDeps,
    getLastFocusedShellWindow,
    getStateSnapshot,
    getWindowContextFromWebContents,
    getWindowState,
    handleNativeThemeUpdated,
    handleWindowClosed,
    hideFindBar,
    layoutViews,
    markWindowFocused,
    navigateActiveTab,
    notifyStateChanged,
    performFindInPage,
    startFindInPage,
    openDownloadsTab,
    openExtensionsTab,
    openFavoritesTab: openFavoritesManagerTab,
    openHistoryTab,
    openSettingsTab,
    openTabUrl,
    quickFavoriteActiveTab,
    refreshAllWindowsState,
    registerWindow,
    restoreClosedTab,
    sendStateToShell,
    setDockPosition,
    setThemeSource,
    toggleDockedDevTools,
    updateToolbarPreferences,
  };
}
