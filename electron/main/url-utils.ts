import {
  INTERNAL_HOME_URL,
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_SETTINGS_URL,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./model.js";

function normalizeInternalUrl(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export function normalizeSettingsSection(value: string | undefined): SettingsSection {
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
  return normalizeInternalUrl(url) === INTERNAL_EXTENSIONS_URL;
}

export function isHomeUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_HOME_URL;
}

export function isHistoryUrl(url: string) {
  return normalizeInternalUrl(url) === INTERNAL_HISTORY_URL;
}

export function isInternalPageUrl(url: string) {
  return (
    isHomeUrl(url) ||
    isSettingsUrl(url) ||
    isDownloadsUrl(url) ||
    isExtensionsUrl(url) ||
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

  if (isHistoryUrl(url)) {
    return INTERNAL_HISTORY_URL;
  }

  return url;
}

