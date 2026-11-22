import {
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_FAVORITES_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_HOME_URL,
  INTERNAL_SETTINGS_URL,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./model.js";

function normalizeInternalUrl(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export function getHistoryActionFromUrl(url: string) {
  const normalizedUrl = normalizeInternalUrl(url);

  if (normalizedUrl === `${INTERNAL_HISTORY_URL}/clear`) {
    return { type: "clear" as const };
  }

  const deletePrefix = `${INTERNAL_HISTORY_URL}/delete/`;
  if (normalizedUrl.startsWith(deletePrefix)) {
    const id = normalizedUrl.slice(deletePrefix.length).trim();
    if (id) {
      return { type: "delete" as const, id };
    }
  }

  return null;
}

function splitUrlAndQuery(url: string) {
  const trimmed = url.trim();
  const [pathname = "", search = ""] = trimmed.split("?", 2);
  return {
    pathname: pathname.replace(/\/+$/, ""),
    search,
  };
}

function readFavoritesSearchParams(search: string) {
  const params = new URLSearchParams(search);
  return {
    title: params.get("title") ?? "",
    url: params.get("url") ?? "",
    folder: params.get("folder") ?? "",
    parent: params.get("parent") ?? "",
    name: params.get("name") ?? "",
  };
}

export function getFavoritesActionFromUrl(url: string) {
  const { pathname, search } = splitUrlAndQuery(url);

  if (pathname === INTERNAL_FAVORITES_URL) {
    return null;
  }

  if (!pathname.startsWith(`${INTERNAL_FAVORITES_URL}/`)) {
    return null;
  }

  const suffix = pathname.slice(`${INTERNAL_FAVORITES_URL}/`.length);
  const params = readFavoritesSearchParams(search);

  if (suffix === "add-current") {
    return { type: "add-current" as const };
  }

  if (suffix === "create") {
    return {
      type: "create" as const,
      title: params.title,
      url: params.url,
      folder: params.folder,
    };
  }

  if (suffix === "folder/create") {
    return {
      type: "create-folder" as const,
      parent: params.parent,
      name: params.name,
    };
  }

  if (suffix.startsWith("delete/")) {
    const id = decodeURIComponent(suffix.slice("delete/".length));
    return id ? { type: "delete" as const, id } : null;
  }

  if (suffix.startsWith("edit/")) {
    const id = decodeURIComponent(suffix.slice("edit/".length));
    return id
      ? {
          type: "edit" as const,
          id,
          title: params.title,
          url: params.url,
          folder: params.folder,
        }
      : null;
  }

  if (suffix.startsWith("move/")) {
    const id = decodeURIComponent(suffix.slice("move/".length));
    return id
      ? {
          type: "move" as const,
          id,
          folder: params.folder,
        }
      : null;
  }

  return null;
}

export function normalizeSettingsSection(
  value: string | undefined,
): SettingsSection {
  const normalized = (value ?? "").trim();
  return SETTINGS_SECTIONS.some((section) => section.id === normalized)
    ? (normalized as SettingsSection)
    : "browser";
}

export function getSettingsSectionFromUrl(url: string): SettingsSection | null {
  const normalizedUrl = normalizeInternalUrl(url);

  if (
    normalizedUrl === INTERNAL_SETTINGS_URL ||
    normalizedUrl === "about:settings"
  ) {
    return "browser";
  }

  if (!normalizedUrl.startsWith(`${INTERNAL_SETTINGS_URL}/`)) {
    return null;
  }

  return normalizeSettingsSection(
    normalizedUrl.slice(`${INTERNAL_SETTINGS_URL}/`.length),
  );
}

export function isSettingsUrl(url: string) {
  return getSettingsSectionFromUrl(url) !== null;
}

export function isDownloadsUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_DOWNLOADS_URL;
}

export function isExtensionsUrl(url: string) {
  const { pathname } = splitUrlAndQuery(url);
  return (
    pathname === INTERNAL_EXTENSIONS_URL ||
    pathname.startsWith(`${INTERNAL_EXTENSIONS_URL}/`)
  );
}

export type ExtensionsUrlAction =
  | { type: "load" }
  | { type: "remove"; id: string }
  | { type: "toggle"; id: string };

export function getExtensionsActionFromUrl(url: string) {
  const { pathname } = splitUrlAndQuery(url);

  if (pathname === `${INTERNAL_EXTENSIONS_URL}/load`) {
    return { type: "load" as const };
  }

  const removePrefix = `${INTERNAL_EXTENSIONS_URL}/remove/`;
  if (pathname.startsWith(removePrefix)) {
    const id = pathname.slice(removePrefix.length).trim();
    return id ? { type: "remove" as const, id } : null;
  }

  const togglePrefix = `${INTERNAL_EXTENSIONS_URL}/toggle/`;
  if (pathname.startsWith(togglePrefix)) {
    const id = decodeURIComponent(pathname.slice(togglePrefix.length).trim());
    return id ? { type: "toggle" as const, id } : null;
  }

  return null;
}

export function isFavoritesUrl(url: string) {
  const { pathname } = splitUrlAndQuery(url);
  return (
    pathname === INTERNAL_FAVORITES_URL ||
    pathname.startsWith(`${INTERNAL_FAVORITES_URL}/`)
  );
}

export function isHomeUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_HOME_URL;
}

export function isHistoryUrl(url: string) {
  const normalizedUrl = normalizeInternalUrl(url);
  return (
    normalizedUrl === INTERNAL_HISTORY_URL ||
    normalizedUrl === `${INTERNAL_HISTORY_URL}/clear` ||
    normalizedUrl.startsWith(`${INTERNAL_HISTORY_URL}/delete/`)
  );
}

export function isInternalPageUrl(url: string) {
  return (
    isHomeUrl(url) ||
    isSettingsUrl(url) ||
    isDownloadsUrl(url) ||
    isExtensionsUrl(url) ||
    isFavoritesUrl(url) ||
    isHistoryUrl(url)
  );
}

export function isInternalRenderedUrl(url: string) {
  return url.startsWith("data:text/html");
}

export function getInternalPageDisplayUrl(url: string) {
  if (isHomeUrl(url)) {
    return INTERNAL_HOME_URL;
  }

  const settingsSection = getSettingsSectionFromUrl(url);

  if (settingsSection) {
    return settingsSection === "browser"
      ? INTERNAL_SETTINGS_URL
      : `${INTERNAL_SETTINGS_URL}/${settingsSection}`;
  }

  if (isDownloadsUrl(url)) {
    return INTERNAL_DOWNLOADS_URL;
  }

  if (isExtensionsUrl(url)) {
    return INTERNAL_EXTENSIONS_URL;
  }

  if (isFavoritesUrl(url)) {
    return INTERNAL_FAVORITES_URL;
  }

  if (isHistoryUrl(url)) {
    return INTERNAL_HISTORY_URL;
  }

  return url;
}
