import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { app, nativeTheme } from "electron";

import {
  type BrowserHistoryEntry,
  DEFAULT_TOOLBAR_PREFERENCES,
  type FavoriteEntry,
  type FavoritesStateSnapshot,
  MAX_HISTORY_ENTRIES,
  type ResolvedTheme,
  type RuntimePreferences,
  type ThemeSnapshot,
  type ThemeSource,
  type ToolbarPlacement,
  type ToolbarPreferences,
} from "./model";

type SqliteStatement<Row extends object = Record<string, unknown>> = {
  all(...params: unknown[]): Row[];
  get(...params: unknown[]): Row | undefined;
  run(...params: unknown[]): unknown;
};

type SqliteDatabase = {
  exec(sql: string): void;
  prepare<Row extends object = Record<string, unknown>>(
    sql: string,
  ): SqliteStatement<Row>;
};

type SqliteConstructor = new (location: string) => SqliteDatabase;

const require = createRequire(import.meta.url);
const BROWSER_DATA_DB_FILE_NAME = "browser-data.sqlite";
const BROWSER_DATA_SCHEMA_VERSION = "history-schema-1";
const FAVORITES_DATA_FILE_NAME = "favorites-data.json";
const DEFAULT_FAVORITE_FOLDERS = ["收藏栏", "文档资料", "项目相关"];
let cachedHistoryDatabase: SqliteDatabase | null | undefined;
let sqliteSupportLogged = false;

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

export function getBrowserDataDbPath() {
  return path.join(app.getPath("userData"), BROWSER_DATA_DB_FILE_NAME);
}

export function getFavoritesDataPath() {
  return path.join(app.getPath("userData"), FAVORITES_DATA_FILE_NAME);
}

function normalizeFavoriteFolders(value: unknown) {
  const normalized = new Set<string>(DEFAULT_FAVORITE_FOLDERS);

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item !== "string") {
        return;
      }

      const folder = item.trim().replace(/^\/+|\/+$/g, "");
      if (folder) {
        normalized.add(folder);
      }
    });
  }

  return Array.from(normalized).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

function normalizeFavoriteEntries(value: unknown): FavoriteEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupedEntries = new Map<string, FavoriteEntry>();

  value.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const candidate = item as Partial<FavoriteEntry>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const title =
      typeof candidate.title === "string" ? candidate.title.trim() : "";
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    const folder =
      typeof candidate.folder === "string" ? candidate.folder.trim() : "收藏栏";
    const createdAt =
      typeof candidate.createdAt === "string" && candidate.createdAt.trim()
        ? candidate.createdAt.trim()
        : new Date().toISOString();
    const updatedAt =
      typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
        ? candidate.updatedAt.trim()
        : createdAt;

    if (!id || !url) {
      return;
    }

    dedupedEntries.set(id, {
      id,
      title: title || url,
      url,
      folder: folder || "收藏栏",
      createdAt,
      updatedAt,
    });
  });

  return [...dedupedEntries.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function normalizeFavoritesState(value: unknown): FavoritesStateSnapshot {
  if (typeof value !== "object" || value === null) {
    return {
      folders: [...DEFAULT_FAVORITE_FOLDERS],
      entries: [],
    };
  }

  const candidate = value as Partial<FavoritesStateSnapshot>;
  const entries = normalizeFavoriteEntries(candidate.entries);
  const folders = normalizeFavoriteFolders([
    ...(Array.isArray(candidate.folders) ? candidate.folders : []),
    ...entries.map((entry) => entry.folder),
  ]);

  return {
    folders,
    entries,
  };
}

function loadSqliteConstructor(): SqliteConstructor | null {
  try {
    const sqliteModule = require("node:sqlite") as {
      DatabaseSync?: SqliteConstructor;
    };

    return sqliteModule.DatabaseSync ?? null;
  } catch (error) {
    if (!sqliteSupportLogged) {
      sqliteSupportLogged = true;
      console.warn(
        "[electron-chrome] node:sqlite unavailable, fallback to JSON history",
        error,
      );
    }

    return null;
  }
}

function normalizeHistoryEntries(value: unknown): BrowserHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupedEntries = new Map<string, BrowserHistoryEntry>();

  value.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const candidate = item as Partial<BrowserHistoryEntry>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    const visitedAt =
      typeof candidate.visitedAt === "string" ? candidate.visitedAt.trim() : "";

    if (!id || !url || !visitedAt) {
      return;
    }

    dedupedEntries.set(id, {
      id,
      url,
      visitedAt,
      title:
        typeof candidate.title === "string" && candidate.title.trim()
          ? candidate.title.trim()
          : url,
      ...(typeof candidate.closedAt === "string" && candidate.closedAt.trim()
        ? { closedAt: candidate.closedAt.trim() }
        : {}),
    });
  });

  return [...dedupedEntries.values()]
    .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt))
    .slice(0, MAX_HISTORY_ENTRIES);
}

function readLegacyBrowserHistory() {
  try {
    const raw = fs.readFileSync(getBrowserHistoryPath(), "utf8");
    return normalizeHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

function initializeHistoryDatabaseSchema(db: SqliteDatabase) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS history_visit_entries (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      visited_at TEXT NOT NULL,
      closed_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_visit_entries_visited_at
      ON history_visit_entries (visited_at DESC, updated_at DESC);
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function getHistoryMetadataValue(db: SqliteDatabase, key: string) {
  const row = db
    .prepare<{ value: string }>("SELECT value FROM metadata WHERE key = ?")
    .get(key);

  return typeof row?.value === "string" ? row.value : null;
}

function setHistoryMetadataValue(
  db: SqliteDatabase,
  key: string,
  value: string,
) {
  db.prepare(
    `
      INSERT INTO metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
  ).run(key, value, new Date().toISOString());
}

function readBrowserHistoryFromDb(db: SqliteDatabase) {
  const rows = db
    .prepare<{
      id: string;
      url: string;
      title: string;
      visited_at: string;
      closed_at: string | null;
    }>(
      `
        SELECT id, url, title, visited_at, closed_at
        FROM history_visit_entries
        ORDER BY visited_at DESC, updated_at DESC, id DESC
      `,
    )
    .all();

  return normalizeHistoryEntries(
    rows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      visitedAt: row.visited_at,
      ...(row.closed_at ? { closedAt: row.closed_at } : {}),
    })),
  );
}

function writeBrowserHistoryToDb(
  db: SqliteDatabase,
  entries: BrowserHistoryEntry[],
) {
  const normalizedEntries = normalizeHistoryEntries(entries);
  const nextIds = new Set(normalizedEntries.map((entry) => entry.id));
  const currentRows = db
    .prepare<{ id: string }>("SELECT id FROM history_visit_entries")
    .all();
  const deleteStatement = db.prepare(
    "DELETE FROM history_visit_entries WHERE id = ?",
  );
  const upsertStatement = db.prepare(
    `
      INSERT INTO history_visit_entries (id, url, title, visited_at, closed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        title = excluded.title,
        visited_at = excluded.visited_at,
        closed_at = excluded.closed_at,
        updated_at = excluded.updated_at
    `,
  );

  db.exec("BEGIN IMMEDIATE TRANSACTION");

  try {
    currentRows.forEach((row) => {
      if (!nextIds.has(row.id)) {
        deleteStatement.run(row.id);
      }
    });

    normalizedEntries.forEach((entry) => {
      upsertStatement.run(
        entry.id,
        entry.url,
        entry.title,
        entry.visitedAt,
        entry.closedAt ?? null,
        new Date().toISOString(),
      );
    });

    setHistoryMetadataValue(db, "schema-version", BROWSER_DATA_SCHEMA_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function migrateHistoryDatabaseIfNeeded(db: SqliteDatabase) {
  const schemaVersion = getHistoryMetadataValue(db, "schema-version");
  const row = db
    .prepare<{
      count: number;
    }>("SELECT COUNT(*) AS count FROM history_visit_entries")
    .get();
  const hasHistoryRows = Number(row?.count ?? 0) > 0;

  if (schemaVersion === BROWSER_DATA_SCHEMA_VERSION && hasHistoryRows) {
    return;
  }

  writeBrowserHistoryToDb(db, readLegacyBrowserHistory());
}

function getHistoryDatabase() {
  if (cachedHistoryDatabase !== undefined) {
    return cachedHistoryDatabase;
  }

  const DatabaseSync = loadSqliteConstructor();

  if (!DatabaseSync) {
    cachedHistoryDatabase = null;
    return cachedHistoryDatabase;
  }

  try {
    const databasePath = getBrowserDataDbPath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    initializeHistoryDatabaseSchema(db);
    try {
      db.prepare(
        "ALTER TABLE history_visit_entries ADD COLUMN closed_at TEXT",
      ).run();
    } catch {
      // ignore existing column
    }
    migrateHistoryDatabaseIfNeeded(db);
    cachedHistoryDatabase = db;
    return cachedHistoryDatabase;
  } catch (error) {
    console.error(
      "[electron-chrome] failed to initialize SQLite history store, fallback to JSON",
      error,
    );
    cachedHistoryDatabase = null;
    return cachedHistoryDatabase;
  }
}

export function readBrowserHistory(): BrowserHistoryEntry[] {
  const db = getHistoryDatabase();

  if (!db) {
    return readLegacyBrowserHistory();
  }

  try {
    return readBrowserHistoryFromDb(db);
  } catch (error) {
    console.error(
      "[electron-chrome] failed to read SQLite history store, fallback to JSON",
      error,
    );
    return readLegacyBrowserHistory();
  }
}

export function writeBrowserHistory(entries: BrowserHistoryEntry[]) {
  const normalizedEntries = normalizeHistoryEntries(entries);
  const db = getHistoryDatabase();

  if (db) {
    try {
      writeBrowserHistoryToDb(db, normalizedEntries);
    } catch (error) {
      console.error(
        "[electron-chrome] failed to write SQLite history store, fallback to JSON mirror",
        error,
      );
    }
  }

  const historyPath = getBrowserHistoryPath();
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(
    historyPath,
    JSON.stringify(normalizedEntries, null, 2),
    "utf8",
  );
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

export function createFavoriteEntryId() {
  return `favorite-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function readFavoritesState(): FavoritesStateSnapshot {
  try {
    const raw = fs.readFileSync(getFavoritesDataPath(), "utf8");
    return normalizeFavoritesState(JSON.parse(raw));
  } catch {
    return {
      folders: [...DEFAULT_FAVORITE_FOLDERS],
      entries: [],
    };
  }
}

export function writeFavoritesState(state: FavoritesStateSnapshot) {
  const favoritesDataPath = getFavoritesDataPath();
  const normalized = normalizeFavoritesState(state);

  fs.mkdirSync(path.dirname(favoritesDataPath), { recursive: true });
  fs.writeFileSync(
    favoritesDataPath,
    JSON.stringify(normalized, null, 2),
    "utf8",
  );
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
