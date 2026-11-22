import fs from "node:fs";
import path from "node:path";

import {
  app,
  type BrowserWindow,
  dialog,
  type Extension,
  session,
} from "electron";

export interface ExtensionSnapshot {
  id: string;
  name: string;
  version: string;
  manifestVersion: number;
  path: string;
  enabled: boolean;
}

interface PersistedExtensionEntry {
  id: string;
  path: string;
  disabled: boolean;
}

const LOAD_OPTIONS = { allowFileAccess: true as const };

export interface ExtensionsController {
  getExtensionSnapshots: () => ExtensionSnapshot[];
  loadExtensionFromDialog: (
    parentWindow: BrowserWindow | null,
  ) => Promise<boolean>;
  removeExtensionById: (id: string) => boolean;
  setExtensionEnabled: (id: string, enabled: boolean) => Promise<boolean>;
  restorePersistedExtensions: () => void;
}

function getPersistenceFilePath() {
  return path.join(app.getPath("userData"), "extensions.json");
}

function readManifestSummary(extensionPath: string): {
  name: string;
  version: string;
  manifestVersion: number;
} {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf-8"),
    ) as {
      name?: string;
      version?: string;
      manifest_version?: number;
    };

    return {
      name: manifest.name ?? path.basename(extensionPath),
      version: manifest.version ?? "-",
      manifestVersion: manifest.manifest_version ?? 2,
    };
  } catch {
    return {
      name: path.basename(extensionPath),
      version: "-",
      manifestVersion: 2,
    };
  }
}

export function createExtensionsController(): ExtensionsController {
  let persistedEntries: PersistedExtensionEntry[] = [];

  function loadPersistedEntries() {
    try {
      const filePath = getPersistenceFilePath();
      if (!fs.existsSync(filePath)) {
        return;
      }

      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(raw)) {
        persistedEntries = raw.filter(
          (entry): entry is PersistedExtensionEntry =>
            Boolean(entry) &&
            typeof entry.path === "string" &&
            typeof entry.id === "string",
        );
      }
    } catch (error) {
      console.warn("[electron-chrome] failed to load extension entries", error);
    }
  }

  function persistEntries() {
    try {
      const filePath = getPersistenceFilePath();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify(persistedEntries, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.warn("[electron-chrome] failed to persist extensions", error);
    }
  }

  function upsertPersistedEntry(entry: PersistedExtensionEntry) {
    const index = persistedEntries.findIndex((item) => item.id === entry.id);

    if (index >= 0) {
      persistedEntries.splice(index, 1, entry);
    } else {
      persistedEntries.push(entry);
    }

    persistEntries();
  }

  function getExtensionSnapshots(): ExtensionSnapshot[] {
    const snapshots: ExtensionSnapshot[] = [];

    for (const extension of session.defaultSession.getAllExtensions()) {
      const entry = persistedEntries.find((item) => item.id === extension.id);

      snapshots.push({
        id: extension.id,
        name: extension.name,
        version: extension.version ?? "-",
        manifestVersion: extension.manifest?.manifest_version ?? 2,
        path: entry?.path ?? "",
        enabled: true,
      });
    }

    for (const entry of persistedEntries) {
      if (snapshots.some((item) => item.id === entry.id)) {
        continue;
      }

      if (!entry.disabled) {
        continue;
      }

      const summary = readManifestSummary(entry.path);
      snapshots.push({
        id: entry.id,
        name: summary.name,
        version: summary.version,
        manifestVersion: summary.manifestVersion,
        path: entry.path,
        enabled: false,
      });
    }

    return snapshots;
  }

  async function loadExtensionFromDirectoryPath(
    dirPath: string,
  ): Promise<Extension | null> {
    try {
      const extension = await session.defaultSession.loadExtension(
        dirPath,
        LOAD_OPTIONS,
      );

      upsertPersistedEntry({
        id: extension.id,
        path: dirPath,
        disabled: false,
      });
      return extension;
    } catch (error) {
      console.warn("[electron-chrome] failed to load extension", {
        dirPath,
        error,
      });
      return null;
    }
  }

  async function loadExtensionFromDialog(parentWindow: BrowserWindow | null) {
    const dialogOptions = {
      title: "加载未打包扩展",
      message: "选择包含 manifest.json 的扩展目录",
      properties: ["openDirectory" as const],
    };

    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    const selectedPath = result.filePaths[0];
    if (result.canceled || !selectedPath) {
      return false;
    }

    const extension = await loadExtensionFromDirectoryPath(selectedPath);
    return extension !== null;
  }

  function removeExtensionById(id: string) {
    const entry = persistedEntries.find((item) => item.id === id);

    try {
      session.defaultSession.removeExtension(id);
    } catch {
      // 扩展未加载时移除操作会抛错，可安全忽略
    }

    if (entry) {
      persistedEntries = persistedEntries.filter((item) => item.id !== id);
      persistEntries();
      return true;
    }

    return false;
  }

  async function setExtensionEnabled(id: string, enabled: boolean) {
    const entry = persistedEntries.find((item) => item.id === id);
    if (!entry) {
      return false;
    }

    if (!enabled) {
      try {
        session.defaultSession.removeExtension(id);
      } catch {
        // 忽略未加载的扩展
      }
      entry.disabled = true;
      persistEntries();
      return true;
    }

    entry.disabled = false;
    persistEntries();
    const extension = await loadExtensionFromDirectoryPath(entry.path);
    return extension !== null;
  }

  function restorePersistedExtensions() {
    loadPersistedEntries();

    for (const entry of persistedEntries) {
      if (entry.disabled) {
        continue;
      }

      void loadExtensionFromDirectoryPath(entry.path);
    }
  }

  loadPersistedEntries();

  return {
    getExtensionSnapshots,
    loadExtensionFromDialog,
    removeExtensionById,
    setExtensionEnabled,
    restorePersistedExtensions,
  };
}
