import fs from "node:fs";
import path from "node:path";

import {
  BrowserWindow,
  type DownloadItem,
  Notification,
  session,
  shell,
  type WebContents,
} from "electron";

import {
  type DownloadRecordSnapshot,
  type DownloadsStateSnapshot,
  getWindowBackgroundColor,
  type ThemeSnapshot,
} from "./model.js";
import { createDownloadsPopupDataUrl } from "./page-html.js";

const MAX_DOWNLOAD_RECORDS = 120;

export interface DownloadsControllerOptions {
  getActiveDownloadTargetWebContents: () => WebContents | null;
  getLastFocusedShellWindow: () => BrowserWindow | null;
  getPersistenceFilePath: () => string;
  getPreloadPath: () => string;
  getThemeSnapshot: () => ThemeSnapshot;
}

export interface DownloadsController {
  clearCompletedDownloadRecords: () => void;
  getDownloadsStateSnapshot: () => DownloadsStateSnapshot;
  notifyStateChanged: () => void;
  openDownloadItemById: (id: string) => Promise<boolean>;
  openDownloadsPopup: (
    parentWindow?: BrowserWindow | null,
  ) => Promise<BrowserWindow>;
  registerSessionHandlers: () => void;
  removeDownloadRecord: (id: string) => void;
  retryDownloadItemById: (id: string) => boolean;
  showDownloadItemInFolderById: (id: string) => boolean;
}

export function createDownloadsController(
  options: DownloadsControllerOptions,
): DownloadsController {
  let downloadsPopupWindow: BrowserWindow | null = null;
  let downloadRecords: DownloadRecordSnapshot[] = [];

  function loadPersistedDownloadRecords() {
    try {
      const filePath = options.getPersistenceFilePath();
      if (!fs.existsSync(filePath)) {
        return;
      }

      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!Array.isArray(raw)) {
        return;
      }

      downloadRecords = raw
        .filter(
          (record): record is DownloadRecordSnapshot =>
            Boolean(record) &&
            typeof record.id === "string" &&
            record.state !== "progressing" &&
            record.state !== "paused",
        )
        .slice(0, MAX_DOWNLOAD_RECORDS);
    } catch (error) {
      console.warn("[electron-chrome] failed to load download records", error);
    }
  }

  function persistDownloadRecords() {
    try {
      const filePath = options.getPersistenceFilePath();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(downloadRecords), "utf-8");
    } catch (error) {
      console.warn(
        "[electron-chrome] failed to persist download records",
        error,
      );
    }
  }

  function showDownloadCompletionNotification(record: DownloadRecordSnapshot) {
    try {
      if (!Notification.isSupported() || record.state !== "completed") {
        return;
      }

      new Notification({
        title: "下载完成",
        body: record.fileName,
      }).show();
    } catch (error) {
      console.warn(
        "[electron-chrome] failed to show download notification",
        error,
      );
    }
  }

  loadPersistedDownloadRecords();

  function createDownloadId() {
    return `download-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function getDownloadState(
    item: DownloadItem,
  ): DownloadRecordSnapshot["state"] {
    if (item.isPaused()) {
      return "paused";
    }

    const state = item.getState();
    return state === "completed" ||
      state === "cancelled" ||
      state === "interrupted"
      ? state
      : "progressing";
  }

  function fileExistsOnDisk(
    savePath: string | undefined,
    state: DownloadRecordSnapshot["state"],
  ) {
    return (
      typeof savePath === "string" &&
      state === "completed" &&
      fs.existsSync(savePath)
    );
  }

  function getDownloadsStateSnapshot(): DownloadsStateSnapshot {
    return {
      theme: options.getThemeSnapshot(),
      items: downloadRecords.map((record) => ({
        ...record,
        existsOnDisk: fileExistsOnDisk(record.savePath, record.state),
      })),
    };
  }

  function notifyStateChanged() {
    if (
      !downloadsPopupWindow ||
      downloadsPopupWindow.isDestroyed() ||
      downloadsPopupWindow.webContents.isDestroyed()
    ) {
      return;
    }

    downloadsPopupWindow.setBackgroundColor(
      getWindowBackgroundColor(options.getThemeSnapshot().resolved),
    );
    downloadsPopupWindow.webContents.send(
      "downloads:state",
      getDownloadsStateSnapshot(),
    );
  }

  function upsertDownloadRecord(record: DownloadRecordSnapshot) {
    const targetIndex = downloadRecords.findIndex(
      (item) => item.id === record.id,
    );

    if (targetIndex >= 0) {
      downloadRecords.splice(targetIndex, 1, record);
    } else {
      downloadRecords.unshift(record);
      if (downloadRecords.length > MAX_DOWNLOAD_RECORDS) {
        downloadRecords.length = MAX_DOWNLOAD_RECORDS;
      }
    }

    // 进行中的记录高频更新，只在状态落定时写盘，避免频繁 IO
    if (record.state !== "progressing") {
      persistDownloadRecords();
    }
  }

  function syncDownloadRecord(
    id: string,
    item: DownloadItem,
    sourcePageUrl: string,
    forcedState?: DownloadRecordSnapshot["state"],
  ) {
    const previous = downloadRecords.find((record) => record.id === id);
    const savePath = item.getSavePath() || previous?.savePath;
    const state = forcedState ?? getDownloadState(item);
    const fileName = path.basename(
      savePath || item.getFilename() || previous?.fileName || "未命名下载",
    );

    upsertDownloadRecord({
      id,
      fileName,
      sourceUrl: item.getURL() || previous?.sourceUrl || "",
      sourcePageUrl: sourcePageUrl || previous?.sourcePageUrl,
      savePath,
      mimeType: item.getMimeType() || previous?.mimeType,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      state,
      isPaused: item.isPaused(),
      canResume: item.canResume(),
      startedAt: previous?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      existsOnDisk: fileExistsOnDisk(savePath, state),
    });
  }

  async function openDownloadsPopup(parentWindow?: BrowserWindow | null) {
    if (downloadsPopupWindow && !downloadsPopupWindow.isDestroyed()) {
      if (downloadsPopupWindow.isMinimized()) {
        downloadsPopupWindow.restore();
      }
      downloadsPopupWindow.focus();
      notifyStateChanged();
      return downloadsPopupWindow;
    }

    downloadsPopupWindow = new BrowserWindow({
      width: 1120,
      height: 760,
      minWidth: 860,
      minHeight: 560,
      parent: parentWindow ?? options.getLastFocusedShellWindow() ?? undefined,
      title: "下载",
      autoHideMenuBar: true,
      show: false,
      backgroundColor: getWindowBackgroundColor(
        options.getThemeSnapshot().resolved,
      ),
      webPreferences: {
        preload: options.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    downloadsPopupWindow.on("closed", () => {
      downloadsPopupWindow = null;
    });

    downloadsPopupWindow.webContents.on("did-finish-load", () => {
      notifyStateChanged();
    });

    await downloadsPopupWindow.loadURL(createDownloadsPopupDataUrl());
    downloadsPopupWindow.once("ready-to-show", () => {
      downloadsPopupWindow?.show();
      notifyStateChanged();
    });

    return downloadsPopupWindow;
  }

  function openDownloadItemById(id: string) {
    const record = downloadRecords.find((item) => item.id === id);

    if (!record?.savePath || !fs.existsSync(record.savePath)) {
      return Promise.resolve(false);
    }

    return shell.openPath(record.savePath).then((result) => result === "");
  }

  function showDownloadItemInFolderById(id: string) {
    const record = downloadRecords.find((item) => item.id === id);

    if (!record?.savePath) {
      return false;
    }

    if (fs.existsSync(record.savePath)) {
      shell.showItemInFolder(record.savePath);
      return true;
    }

    const folderPath = path.dirname(record.savePath);
    if (fs.existsSync(folderPath)) {
      void shell.openPath(folderPath);
      return true;
    }

    return false;
  }

  function retryDownloadItemById(id: string) {
    const record = downloadRecords.find((item) => item.id === id);
    const targetWebContents = options.getActiveDownloadTargetWebContents();

    if (!record?.sourceUrl || !targetWebContents) {
      return false;
    }

    targetWebContents.downloadURL(record.sourceUrl);
    return true;
  }

  function clearCompletedDownloadRecords() {
    downloadRecords = downloadRecords.filter(
      (record) => record.state !== "completed",
    );
    persistDownloadRecords();
    notifyStateChanged();
  }

  function removeDownloadRecord(id: string) {
    const target = downloadRecords.find((record) => record.id === id);

    if (
      !target ||
      target.state === "progressing" ||
      target.state === "paused"
    ) {
      return;
    }

    downloadRecords = downloadRecords.filter((record) => record.id !== id);
    persistDownloadRecords();
    notifyStateChanged();
  }

  function registerSessionHandlers() {
    session.defaultSession.on("will-download", (_event, item, webContents) => {
      const downloadId = createDownloadId();
      const sourcePageUrl = webContents.getURL();

      syncDownloadRecord(downloadId, item, sourcePageUrl);
      notifyStateChanged();

      item.on("updated", () => {
        syncDownloadRecord(downloadId, item, sourcePageUrl);
        notifyStateChanged();
      });

      item.once("done", (_doneEvent, state) => {
        const finalState = item.isPaused()
          ? "paused"
          : state === "completed" ||
              state === "cancelled" ||
              state === "interrupted"
            ? state
            : undefined;
        syncDownloadRecord(downloadId, item, sourcePageUrl, finalState);
        notifyStateChanged();

        const finishedRecord = downloadRecords.find(
          (record) => record.id === downloadId,
        );
        if (finishedRecord) {
          showDownloadCompletionNotification(finishedRecord);
        }
      });
    });
  }

  return {
    clearCompletedDownloadRecords,
    getDownloadsStateSnapshot,
    notifyStateChanged,
    openDownloadItemById,
    openDownloadsPopup,
    registerSessionHandlers,
    removeDownloadRecord,
    retryDownloadItemById,
    showDownloadItemInFolderById,
  };
}
