import {
  createHistoryEntryId,
  readBrowserHistory,
  shouldRecordHistoryUrl,
  writeBrowserHistory,
} from "./local-persistence.js";
import { type BrowserHistoryEntry, MAX_HISTORY_ENTRIES } from "./model.js";

export interface BrowserHistoryStore {
  clear: () => void;
  getEntries: () => BrowserHistoryEntry[];
  markClosed: (url: string) => void;
  recordVisit: (url: string, title: string) => void;
  removeEntry: (id: string) => boolean;
  updateRecentTitle: (url: string, title: string) => void;
}

export function createBrowserHistoryStore(): BrowserHistoryStore {
  let browserHistory = readBrowserHistory();

  function persistBrowserHistory() {
    browserHistory = browserHistory.slice(0, MAX_HISTORY_ENTRIES);
    writeBrowserHistory(browserHistory);
  }

  function recordVisit(url: string, title: string) {
    if (!shouldRecordHistoryUrl(url)) {
      return;
    }

    browserHistory.unshift({
      id: createHistoryEntryId(),
      title: title.trim() || url,
      url,
      visitedAt: new Date().toISOString(),
      closedAt: undefined,
    });
    persistBrowserHistory();
  }

  function updateRecentTitle(url: string, title: string) {
    if (!shouldRecordHistoryUrl(url) || !title.trim()) {
      return;
    }

    const targetEntry = browserHistory.find(
      (entry) => entry.url === url && !entry.closedAt,
    );
    if (!targetEntry || targetEntry.title === title.trim()) {
      return;
    }

    targetEntry.title = title.trim();
    persistBrowserHistory();
  }

  function markClosed(url: string) {
    if (!shouldRecordHistoryUrl(url)) {
      return;
    }

    const targetEntry = browserHistory.find(
      (entry) => entry.url === url && !entry.closedAt,
    );

    if (!targetEntry) {
      return;
    }

    targetEntry.closedAt = new Date().toISOString();
    persistBrowserHistory();
  }

  function clear() {
    browserHistory = [];
    persistBrowserHistory();
  }

  function removeEntry(id: string) {
    const nextHistory = browserHistory.filter((entry) => entry.id !== id);
    const changed = nextHistory.length !== browserHistory.length;

    if (changed) {
      browserHistory = nextHistory;
      persistBrowserHistory();
    }

    return changed;
  }

  function getEntries() {
    return browserHistory;
  }

  return {
    clear,
    getEntries,
    markClosed,
    recordVisit,
    removeEntry,
    updateRecentTitle,
  };
}
