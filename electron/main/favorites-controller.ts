import {
  createFavoriteEntryId,
  writeFavoritesState,
} from "./local-persistence.js";
import type { FavoriteEntry, FavoritesStateSnapshot } from "./model.js";

function normalizeFavoriteUrl(url: string) {
  const normalized = url.trim();

  if (!normalized) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/i.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

function normalizeFolderPath(folder: string) {
  return folder.trim().replace(/^\/+|\/+$/g, "") || "收藏栏";
}

function touchFavoriteEntry(
  entry: FavoriteEntry,
  patch: Partial<Pick<FavoriteEntry, "title" | "url" | "folder">>,
): FavoriteEntry {
  return {
    ...entry,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export interface FavoritesController {
  getState: () => FavoritesStateSnapshot;
  addEntry: (title: string, url: string, folder?: string) => string | null;
  removeEntry: (id: string) => boolean;
  editEntry: (
    id: string,
    title: string,
    url: string,
    folder: string,
  ) => boolean;
  moveEntry: (id: string, folder: string) => boolean;
  createFolder: (parentFolder: string | null, name: string) => string | null;
  hasUrl: (url: string) => boolean;
}

export function createFavoritesController(
  initialState: FavoritesStateSnapshot,
): FavoritesController {
  let state = initialState;

  const persist = () => {
    writeFavoritesState(state);
  };

  const ensureFolderExists = (folder: string) => {
    const normalizedFolder = normalizeFolderPath(folder);

    if (!state.folders.includes(normalizedFolder)) {
      state = {
        ...state,
        folders: [...state.folders, normalizedFolder].sort((left, right) =>
          left.localeCompare(right, "zh-CN"),
        ),
      };
    }

    return normalizedFolder;
  };

  return {
    getState: () => state,
    addEntry(title: string, url: string, folder = "收藏栏") {
      const normalizedUrl = normalizeFavoriteUrl(url);

      if (!normalizedUrl) {
        return null;
      }

      const nextFolder = ensureFolderExists(folder);
      const safeTitle = title.trim() || normalizedUrl;
      const existingEntry = state.entries.find(
        (entry) => entry.url === normalizedUrl,
      );

      if (existingEntry) {
        state = {
          ...state,
          entries: state.entries.map((entry) =>
            entry.id === existingEntry.id
              ? touchFavoriteEntry(entry, {
                  title: safeTitle,
                  url: normalizedUrl,
                  folder: nextFolder,
                })
              : entry,
          ),
        };
        persist();
        return existingEntry.id;
      }

      const now = new Date().toISOString();
      const nextEntry: FavoriteEntry = {
        id: createFavoriteEntryId(),
        title: safeTitle,
        url: normalizedUrl,
        folder: nextFolder,
        createdAt: now,
        updatedAt: now,
      };

      state = {
        ...state,
        entries: [nextEntry, ...state.entries],
      };
      persist();
      return nextEntry.id;
    },
    removeEntry(id: string) {
      const nextEntries = state.entries.filter((entry) => entry.id !== id);

      if (nextEntries.length === state.entries.length) {
        return false;
      }

      state = {
        ...state,
        entries: nextEntries,
      };
      persist();
      return true;
    },
    editEntry(id: string, title: string, url: string, folder: string) {
      const normalizedUrl = normalizeFavoriteUrl(url);

      if (!normalizedUrl) {
        return false;
      }

      const nextFolder = ensureFolderExists(folder || "收藏栏");
      let changed = false;

      state = {
        ...state,
        entries: state.entries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          changed = true;
          return touchFavoriteEntry(entry, {
            title: title.trim() || normalizedUrl,
            url: normalizedUrl,
            folder: nextFolder,
          });
        }),
      };

      if (changed) {
        persist();
      }

      return changed;
    },
    moveEntry(id: string, folder: string) {
      const nextFolder = ensureFolderExists(folder || "收藏栏");
      let changed = false;

      state = {
        ...state,
        entries: state.entries.map((entry) => {
          if (entry.id !== id || entry.folder === nextFolder) {
            return entry;
          }

          changed = true;
          return touchFavoriteEntry(entry, { folder: nextFolder });
        }),
      };

      if (changed) {
        persist();
      }

      return changed;
    },
    createFolder(parentFolder: string | null, name: string) {
      const normalizedName = name.trim().replace(/\//g, "-");

      if (!normalizedName) {
        return null;
      }

      const nextFolder = parentFolder
        ? `${normalizeFolderPath(parentFolder)}/${normalizedName}`
        : normalizedName;

      ensureFolderExists(nextFolder);
      persist();
      return nextFolder;
    },
    hasUrl(url: string) {
      const normalizedUrl = normalizeFavoriteUrl(url);
      return (
        Boolean(normalizedUrl) &&
        state.entries.some((entry) => entry.url === normalizedUrl)
      );
    },
  };
}
