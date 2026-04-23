import {
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
} from "electron";

import { buildFavoritesMenuTemplate } from "./favorites-shell.js";
import {
  DEFAULT_URL,
  DOCK_POSITIONS,
  type BrowserShellState,
  type MenuSection,
  type RuntimePreferences,
  type ThemeSource,
  type ToolbarContextButtonId,
  type ToolbarPreferences,
} from "./model.js";
import type { DownloadsController } from "./downloads-controller.js";
import type { ShellController } from "./shell-controller-types.js";

export interface ShellMenuControllerOptions {
  createWindow: () => BrowserWindow;
  downloads: Pick<DownloadsController, "openDownloadsPopup">;
  runtimePreferences: RuntimePreferences;
  setThemeSource: (themeSource: ThemeSource) => void;
  shell: Pick<
    ShellController,
    | "closeTab"
    | "createTab"
    | "getActivePageView"
    | "getActiveTab"
    | "getFavoritesShellDeps"
    | "navigateActiveTab"
    | "notifyStateChanged"
    | "openDownloadsTab"
    | "openExtensionsTab"
    | "openFavoritesTab"
    | "openHistoryTab"
    | "openSettingsTab"
    | "restoreClosedTab"
    | "setDockPosition"
    | "toggleDockedDevTools"
    | "updateToolbarPreferences"
  >;
}

export interface ShellMenuController {
  buildMenu: (win: BrowserWindow, state: BrowserShellState) => Menu;
  showMenuSection: (
    win: BrowserWindow,
    state: BrowserShellState,
    section: MenuSection,
    anchor: { x: number; y: number },
  ) => void;
  showToolbarButtonContextMenu: (
    win: BrowserWindow,
    buttonId: ToolbarContextButtonId,
    anchor: { x: number; y: number },
  ) => void;
}

export function createShellMenuController(
  options: ShellMenuControllerOptions,
): ShellMenuController {
  const { runtimePreferences, shell } = options;

  function buildThemeMenuTemplate(): MenuItemConstructorOptions[] {
    return [
      {
        label: "跟随系统",
        type: "radio",
        checked: runtimePreferences.themeSource === "system",
        click: () => options.setThemeSource("system"),
      },
      {
        label: "浅色",
        type: "radio",
        checked: runtimePreferences.themeSource === "light",
        click: () => options.setThemeSource("light"),
      },
      {
        label: "深色",
        type: "radio",
        checked: runtimePreferences.themeSource === "dark",
        click: () => options.setThemeSource("dark"),
      },
    ];
  }

  function buildDownloadsMenuTemplate(
    win: BrowserWindow,
    state: BrowserShellState,
  ): MenuItemConstructorOptions[] {
    return [
      {
        label: "打开下载窗口",
        click: () => {
          void options.downloads.openDownloadsPopup(win);
        },
      },
      {
        label: "打开下载页",
        click: () => shell.openDownloadsTab(win, state),
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
                shell.updateToolbarPreferences((preferences) => ({
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
                shell.updateToolbarPreferences((preferences) => ({
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
      buildToolbarVisibilityItem(toolbarPreferences, "home", "显示主页按钮"),
      buildToolbarVisibilityItem(
        toolbarPreferences,
        "restoreClosedTab",
        "显示历史记录按钮",
      ),
      buildToolbarVisibilityItem(toolbarPreferences, "favorites", "显示收藏夹按钮"),
      buildToolbarVisibilityItem(toolbarPreferences, "downloads", "显示下载按钮"),
      buildToolbarVisibilityItem(toolbarPreferences, "extensions", "显示扩展按钮"),
    ];
  }

  function buildToolbarVisibilityItem<K extends keyof ToolbarPreferences>(
    toolbarPreferences: ToolbarPreferences,
    key: K,
    label: string,
  ): MenuItemConstructorOptions {
    return {
      label,
      type: "checkbox",
      checked: toolbarPreferences[key].visible,
      click: () => {
        shell.updateToolbarPreferences((preferences) => ({
          ...preferences,
          [key]: {
            ...preferences[key],
            visible: !preferences[key].visible,
          },
        }));
      },
    };
  }

  function buildFileMenuTemplate(
    win: BrowserWindow,
    state: BrowserShellState,
  ): MenuItemConstructorOptions[] {
    return [
      {
        label: "新标签页",
        accelerator: "CmdOrCtrl+T",
        click: () => shell.createTab(win, state, DEFAULT_URL, { activate: true }),
      },
      {
        label: "关闭当前标签页",
        accelerator: "CmdOrCtrl+W",
        enabled: state.tabs.length > 1,
        click: () => {
          if (state.activeTabId) {
            shell.closeTab(win, state, state.activeTabId);
          }
        },
      },
      { type: "separator" },
      {
        label: "设置",
        accelerator: "CmdOrCtrl+,",
        click: () => shell.openSettingsTab(win, state),
      },
      {
        label: "历史记录",
        accelerator: "CmdOrCtrl+H",
        click: () => shell.openHistoryTab(win, state),
      },
      {
        label: "扩展",
        click: () => shell.openExtensionsTab(win, state),
      },
      {
        label: "收藏夹",
        click: () => shell.openFavoritesTab(win, state),
      },
      {
        label: "下载",
        click: () => shell.openDownloadsTab(win, state),
      },
      { type: "separator" },
      {
        label: "新窗口",
        accelerator: "CmdOrCtrl+N",
        click: () => options.createWindow(),
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
        click: () => shell.createTab(win, state, DEFAULT_URL, { activate: true }),
      },
      {
        label: "设置",
        accelerator: "CmdOrCtrl+,",
        click: () => shell.openSettingsTab(win, state),
      },
      {
        label: "恢复刚关闭的标签页",
        enabled: state.closedTabHistory.length > 0,
        click: () => shell.restoreClosedTab(win, state),
      },
      {
        label: "历史记录",
        accelerator: "CmdOrCtrl+H",
        click: () => shell.openHistoryTab(win, state),
      },
      {
        label: "扩展",
        click: () => shell.openExtensionsTab(win, state),
      },
      {
        label: "收藏夹",
        click: () => shell.openFavoritesTab(win, state),
        submenu: buildFavoritesMenuTemplate(win, state, shell.getFavoritesShellDeps()),
      },
      {
        label: "下载",
        click: () => shell.openDownloadsTab(win, state),
      },
      {
        label: "主题",
        submenu: buildThemeMenuTemplate(),
      },
      { type: "separator" },
      {
        label: "后退",
        enabled: Boolean(shell.getActiveTab(state)?.canGoBack),
        click: () =>
          shell.getActivePageView(state)?.webContents.navigationHistory.goBack(),
      },
      {
        label: "前进",
        enabled: Boolean(shell.getActiveTab(state)?.canGoForward),
        click: () =>
          shell.getActivePageView(state)?.webContents.navigationHistory.goForward(),
      },
      {
        label: "刷新",
        accelerator: "F5",
        click: () => shell.getActivePageView(state)?.webContents.reload(),
      },
      { type: "separator" },
      {
        label: state.devtoolsVisible ? "关闭停靠 DevTools" : "打开停靠 DevTools",
        accelerator: "F12",
        click: () => shell.toggleDockedDevTools(win, state),
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
        click: () => shell.navigateActiveTab(state, DEFAULT_URL),
      },
      {
        label: "在新标签页打开默认地址",
        accelerator: "CmdOrCtrl+Shift+T",
        click: () => shell.createTab(win, state, DEFAULT_URL, { activate: true }),
      },
      { type: "separator" },
      {
        label: "后退",
        accelerator: "Alt+Left",
        enabled: Boolean(shell.getActiveTab(state)?.canGoBack),
        click: () =>
          shell.getActivePageView(state)?.webContents.navigationHistory.goBack(),
      },
      {
        label: "前进",
        accelerator: "Alt+Right",
        enabled: Boolean(shell.getActiveTab(state)?.canGoForward),
        click: () =>
          shell.getActivePageView(state)?.webContents.navigationHistory.goForward(),
      },
      {
        label: "刷新网页",
        accelerator: "F5",
        click: () => shell.getActivePageView(state)?.webContents.reload(),
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
        click: () => shell.toggleDockedDevTools(win, state),
      },
      {
        label: "关闭停靠 DevTools",
        enabled: state.devtoolsVisible,
        click: () => shell.toggleDockedDevTools(win, state),
      },
      { type: "separator" },
      {
        label: "停靠位置",
        submenu: [
          {
            label: "底部",
            type: "radio",
            checked: state.dockPosition === DOCK_POSITIONS.bottom,
            click: () => shell.setDockPosition(win, state, DOCK_POSITIONS.bottom),
          },
          {
            label: "左侧",
            type: "radio",
            checked: state.dockPosition === DOCK_POSITIONS.left,
            click: () => shell.setDockPosition(win, state, DOCK_POSITIONS.left),
          },
          {
            label: "右侧",
            type: "radio",
            checked: state.dockPosition === DOCK_POSITIONS.right,
            click: () => shell.setDockPosition(win, state, DOCK_POSITIONS.right),
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
              ? buildFavoritesMenuTemplate(win, state, shell.getFavoritesShellDeps())
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

  function showToolbarButtonContextMenu(
    win: BrowserWindow,
    buttonId: ToolbarContextButtonId,
    anchor: { x: number; y: number },
  ) {
    Menu.buildFromTemplate(
      buildToolbarButtonContextMenuTemplate(buttonId),
    ).popup({
      window: win,
      x: Math.round(anchor.x),
      y: Math.round(anchor.y),
    });
  }

  return {
    buildMenu,
    showMenuSection,
    showToolbarButtonContextMenu,
  };
}
