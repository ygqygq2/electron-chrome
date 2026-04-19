import fs from "node:fs";
import path from "node:path";

import { app, nativeTheme } from "electron";

import {
  DEFAULT_TOOLBAR_PREFERENCES,
  MAX_HISTORY_ENTRIES,
  type BrowserHistoryEntry,
  type ResolvedTheme,
  type RuntimePreferences,
  type ThemeSnapshot,
  type ThemeSource,
  type ToolbarPlacement,
  type ToolbarPreferences,
} from "./model";

export function normalizeThemeSource(value: string | undefined): ThemeSource {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function normalizeToolbarPlacement(
  value: string | undefined,
): ToolbarPlacement {
  return value === "left" || value === "right" ? value : "right";
}

export function cloneToolbarPreferences(
  preferences: ToolbarPreferences,
): ToolbarPreferences {
  return {
    home: { ...preferences.home },
    restoreClosedTab: { ...preferences.restoreClosedTab },
    favorites: { ...preferences.favorites },
    downloads: { ...preferences.downloads },
    extensions: { ...preferences.extensions },
  };
}

export function normalizeToolbarPreferences(
  value: Partial<ToolbarPreferences> | undefined,
): ToolbarPreferences {
  const home = value?.home;
  const restoreClosedTab = value?.restoreClosedTab;
  const favorites = value?.favorites;
  const downloads = value?.downloads;
  const extensions = value?.extensions;

  return {
    home: {
      visible: home?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.home.visible,
    },
    restoreClosedTab: {
      visible:
        restoreClosedTab?.visible ??
        DEFAULT_TOOLBAR_PREFERENCES.restoreClosedTab.visible,
      placement: normalizeToolbarPlacement(restoreClosedTab?.placement),
    },
    favorites: {
      visible:
        favorites?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.favorites.visible,
      placement: normalizeToolbarPlacement(favorites?.placement),
    },
    downloads: {
      visible:
        downloads?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.downloads.visible,
    },
    extensions: {
      visible:
        extensions?.visible ?? DEFAULT_TOOLBAR_PREFERENCES.extensions.visible,
    },
  };
}

export function getResolvedTheme(): ResolvedTheme {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

export function getThemeSnapshot(themeSource: ThemeSource): ThemeSnapshot {
  return {
    source: themeSource,
    resolved: getResolvedTheme(),
  };
}

export function getRuntimePreferencesPath() {
  return path.join(app.getPath("userData"), "runtime-preferences.json");
}

export function getBrowserHistoryPath() {
  return path.join(app.getPath("userData"), "browser-history.json");
}

export function readBrowserHistory(): BrowserHistoryEntry[] {
  try {
    const raw = fs.readFileSync(getBrowserHistoryPath(), "utf8");
    const parsed = JSON.parse(raw) as BrowserHistoryEntry[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          Boolean(entry?.id) &&
          Boolean(entry?.url) &&
          Boolean(entry?.visitedAt),
      )
      .slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function writeBrowserHistory(entries: BrowserHistoryEntry[]) {
  const historyPath = getBrowserHistoryPath();
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(entries, null, 2), "utf8");
}

export function createHistoryEntryId() {
  return `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function shouldRecordHistoryUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

export function formatHistoryTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date(value))
      .replace(/\//g, "-");
  } catch {
    return value;
  }
}

export function readRuntimePreferences(): RuntimePreferences {
  try {
    const raw = fs.readFileSync(getRuntimePreferencesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimePreferences>;

    return {
      preferCompatibilityGpu: Boolean(parsed.preferCompatibilityGpu),
      themeSource: normalizeThemeSource(parsed.themeSource),
      toolbarPreferences: normalizeToolbarPreferences(
        parsed.toolbarPreferences,
      ),
    };
  } catch {
    return {
      preferCompatibilityGpu: false,
      themeSource: "system",
      toolbarPreferences: cloneToolbarPreferences(DEFAULT_TOOLBAR_PREFERENCES),
    };
  }
}

export function writeRuntimePreferences(preferences: RuntimePreferences) {
  const runtimePreferencesPath = getRuntimePreferencesPath();

  fs.mkdirSync(path.dirname(runtimePreferencesPath), { recursive: true });
  fs.writeFileSync(
    runtimePreferencesPath,
    JSON.stringify(preferences, null, 2),
    "utf8",
  );
}
