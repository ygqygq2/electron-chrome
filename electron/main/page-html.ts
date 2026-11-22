import type { ExtensionSnapshot } from "./extensions-controller.js";
import { createFavoritesPageHtml } from "./favorites-page-html.js";
import {
  createDownloadsPageHtml,
  createDownloadsPopupDataUrl,
} from "./internal-pages/downloads-page-html.js";
import { createExtensionsPageHtml } from "./internal-pages/extensions-page-html.js";
import { createHistoryPageHtml } from "./internal-pages/history-page-html.js";
import { createHomePageHtml } from "./internal-pages/home-page-html.js";
import { createSettingsPageHtml } from "./internal-pages/settings-page-html.js";
import type {
  BrowserHistoryEntry,
  BrowserShellState,
  FavoritesStateSnapshot,
  ThemeSnapshot,
} from "./model.js";
import {
  getSettingsSectionFromUrl,
  isDownloadsUrl,
  isExtensionsUrl,
  isFavoritesUrl,
  isHistoryUrl,
  isHomeUrl,
} from "./url-utils.js";

export { createDownloadsPopupDataUrl };

export function createInternalPageHtml(
  url: string,
  theme: ThemeSnapshot,
  state: BrowserShellState,
  history: BrowserHistoryEntry[],
  favoritesState: FavoritesStateSnapshot,
  extensions: ExtensionSnapshot[],
) {
  if (isHomeUrl(url)) {
    return createHomePageHtml(theme);
  }

  const settingsSection = getSettingsSectionFromUrl(url);

  if (settingsSection) {
    return createSettingsPageHtml(
      theme,
      settingsSection,
      state.toolbarPreferences,
      state.runtimeInfo,
      history,
    );
  }

  if (isDownloadsUrl(url)) {
    return createDownloadsPageHtml(theme);
  }

  if (isExtensionsUrl(url)) {
    return createExtensionsPageHtml(theme, extensions);
  }

  if (isFavoritesUrl(url)) {
    return createFavoritesPageHtml(theme, favoritesState);
  }

  if (isHistoryUrl(url)) {
    return createHistoryPageHtml(theme, history);
  }

  return '<!doctype html><html><head><meta charset="UTF-8" /><title>内部页面</title></head><body></body></html>';
}

export function createInternalPageDataUrl(
  url: string,
  theme: ThemeSnapshot,
  state: BrowserShellState,
  history: BrowserHistoryEntry[],
  favoritesState: FavoritesStateSnapshot,
  extensions: ExtensionSnapshot[],
) {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createInternalPageHtml(url, theme, state, history, favoritesState, extensions))}`;
}
