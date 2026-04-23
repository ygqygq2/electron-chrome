import { ipcMain } from "electron";

import {
  DEFAULT_URL,
  INTERNAL_SETTINGS_URL,
  type MenuSection,
  type ThemeSource,
  type ToolbarContextButtonId,
} from "./model.js";
import type { DownloadsController } from "./downloads-controller.js";
import type { ShellMenuController } from "./shell-menu.js";
import type { ShellController } from "./shell-controller-types.js";

export interface ShellIpcRegistrationOptions {
  downloads: Pick<
    DownloadsController,
    | "clearCompletedDownloadRecords"
    | "getDownloadsStateSnapshot"
    | "openDownloadItemById"
    | "openDownloadsPopup"
    | "removeDownloadRecord"
    | "retryDownloadItemById"
    | "showDownloadItemInFolderById"
  >;
  menu: Pick<
    ShellMenuController,
    "showMenuSection" | "showToolbarButtonContextMenu"
  >;
  shell: Pick<
    ShellController,
    | "activateTab"
    | "closeTab"
    | "createTab"
    | "getActivePageView"
    | "getLastFocusedShellWindow"
    | "getStateSnapshot"
    | "getWindowContextFromWebContents"
    | "getWindowState"
    | "navigateActiveTab"
    | "notifyStateChanged"
    | "openDownloadsTab"
    | "openSettingsTab"
    | "openTabUrl"
    | "quickFavoriteActiveTab"
    | "restoreClosedTab"
    | "setThemeSource"
  >;
}

export function registerShellIpcHandlers(
  options: ShellIpcRegistrationOptions,
) {
  function withShellContext<T>(
    sender: Electron.WebContents,
    callback: (
      win: Electron.BrowserWindow,
      state: NonNullable<ReturnType<ShellController["getWindowState"]>>,
    ) => T,
  ) {
    const context = options.shell.getWindowContextFromWebContents(sender);
    if (!context) {
      return null;
    }

    return callback(context.win, context.state);
  }

  ipcMain.handle("docked-shell:get-state", (event) => {
    return withShellContext(event.sender, (_win, state) =>
      options.shell.getStateSnapshot(state),
    );
  });

  ipcMain.on("docked-shell:new-tab", (event, url?: string) => {
    withShellContext(event.sender, (win, state) => {
      options.shell.createTab(win, state, url || DEFAULT_URL, { activate: true });
    });
  });

  ipcMain.on("docked-shell:activate-tab", (event, tabId: string) => {
    withShellContext(event.sender, (win, state) => {
      options.shell.activateTab(win, state, tabId);
    });
  });

  ipcMain.on("docked-shell:close-tab", (event, tabId: string) => {
    withShellContext(event.sender, (win, state) => {
      options.shell.closeTab(win, state, tabId);
    });
  });

  ipcMain.on("docked-shell:restore-closed-tab", (event) => {
    withShellContext(event.sender, (win, state) => {
      options.shell.restoreClosedTab(win, state);
    });
  });

  ipcMain.on("docked-shell:navigate", (event, url: string) => {
    withShellContext(event.sender, (_win, state) => {
      options.shell.navigateActiveTab(state, url);
    });
  });

  ipcMain.on("docked-shell:open-home", (event) => {
    withShellContext(event.sender, (_win, state) => {
      options.shell.navigateActiveTab(state, DEFAULT_URL);
    });
  });

  ipcMain.on("docked-shell:quick-favorite-current-page", (event) => {
    withShellContext(event.sender, (win, state) => {
      options.shell.quickFavoriteActiveTab(win, state);
    });
  });

  ipcMain.on("docked-shell:go-back", (event) => {
    withShellContext(event.sender, (_win, state) => {
      options.shell.getActivePageView(state)?.webContents.navigationHistory.goBack();
    });
  });

  ipcMain.on("docked-shell:go-forward", (event) => {
    withShellContext(event.sender, (_win, state) => {
      options.shell.getActivePageView(state)?.webContents.navigationHistory.goForward();
    });
  });

  ipcMain.on("docked-shell:reload", (event) => {
    withShellContext(event.sender, (_win, state) => {
      options.shell.getActivePageView(state)?.webContents.reload();
    });
  });

  ipcMain.on("docked-shell:open-downloads-popup", (event) => {
    const context = options.shell.getWindowContextFromWebContents(event.sender);
    void options.downloads.openDownloadsPopup(context?.win ?? null);
  });

  ipcMain.on("docked-shell:minimize-window", (event) => {
    options.shell.getWindowContextFromWebContents(event.sender)?.win.minimize();
  });

  ipcMain.on("docked-shell:toggle-maximize-window", (event) => {
    withShellContext(event.sender, (win) => {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    });
  });

  ipcMain.on("docked-shell:close-window", (event) => {
    options.shell.getWindowContextFromWebContents(event.sender)?.win.close();
  });

  ipcMain.handle(
    "docked-shell:show-menu",
    (
      event,
      payload: { section: MenuSection; anchor: { x: number; y: number } },
    ) => {
      withShellContext(event.sender, (win, state) => {
        options.menu.showMenuSection(win, state, payload.section, payload.anchor);
      });
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
      const context = options.shell.getWindowContextFromWebContents(event.sender);

      if (!context) {
        return;
      }

      options.menu.showToolbarButtonContextMenu(
        context.win,
        payload.buttonId,
        payload.anchor,
      );
    },
  );

  ipcMain.handle("downloads-popup:get-state", () =>
    options.downloads.getDownloadsStateSnapshot(),
  );

  ipcMain.on("downloads-popup:set-theme-source", (_event, themeSource: ThemeSource) => {
    options.shell.setThemeSource(themeSource);
  });

  ipcMain.handle("downloads-popup:open-item", (_event, id: string) => {
    return options.downloads.openDownloadItemById(id);
  });

  ipcMain.handle("downloads-popup:show-item-in-folder", (_event, id: string) => {
    return options.downloads.showDownloadItemInFolderById(id);
  });

  ipcMain.handle("downloads-popup:retry-download", (_event, id: string) => {
    return options.downloads.retryDownloadItemById(id);
  });

  ipcMain.on("downloads-popup:clear-completed", () => {
    options.downloads.clearCompletedDownloadRecords();
  });

  ipcMain.on("downloads-popup:remove-item", (_event, id: string) => {
    options.downloads.removeDownloadRecord(id);
  });

  ipcMain.on("downloads-popup:open-downloads-page", () => {
    const hostWindow = options.shell.getLastFocusedShellWindow();
    const state = hostWindow ? options.shell.getWindowState(hostWindow.id) : null;
    if (!hostWindow || !state) {
      return;
    }

    options.shell.openDownloadsTab(hostWindow, state);
  });

  ipcMain.on("downloads-popup:open-downloads-settings", () => {
    const hostWindow = options.shell.getLastFocusedShellWindow();
    const state = hostWindow ? options.shell.getWindowState(hostWindow.id) : null;
    if (!hostWindow || !state) {
      return;
    }

    const targetTab = options.shell.openSettingsTab(hostWindow, state);
    if (targetTab) {
      options.shell.openTabUrl(
        targetTab,
        `${INTERNAL_SETTINGS_URL}/downloadSetting`,
        state,
      );
      options.shell.notifyStateChanged(hostWindow, state);
    }
  });
}
