import { Buffer } from "node:buffer";

import { BrowserWindow } from "electron";

import {
  buildDesktopChromeUserAgent,
  type BrowserShellState,
  type BrowserTab,
} from "./model.js";

const DESKTOP_CHROME_USER_AGENT = buildDesktopChromeUserAgent();
const FAVICON_ACCEPT_HEADER =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

export function queueTabFaviconUpdate(
  win: BrowserWindow,
  state: BrowserShellState,
  tab: BrowserTab,
  pageUrl: string,
  notifyStateChanged: (win: BrowserWindow, state: BrowserShellState) => void,
  iconUrls: string[] = [],
) {
  const faviconCandidates = resolveFaviconCandidates(pageUrl, iconUrls);
  const requestVersion = ++tab.iconRequestVersion;

  if (faviconCandidates.length === 0) {
    tab.iconUrl = undefined;
    notifyStateChanged(win, state);
    return;
  }

  void (async () => {
    for (const faviconUrl of faviconCandidates) {
      const faviconDataUrl = await fetchFaviconAsDataUrl(faviconUrl);

      if (tab.iconRequestVersion !== requestVersion) {
        return;
      }

      if (!faviconDataUrl) {
        continue;
      }

      tab.iconUrl = faviconDataUrl;
      notifyStateChanged(win, state);
      return;
    }

    if (tab.iconRequestVersion !== requestVersion) {
      return;
    }

    tab.iconUrl = undefined;
    notifyStateChanged(win, state);
  })();
}

function resolveFaviconByUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (!/^https?:$/i.test(parsedUrl.protocol)) {
      return undefined;
    }

    return new URL("/favicon.ico", parsedUrl.origin).toString();
  } catch {
    return undefined;
  }
}

function resolveAbsoluteFaviconUrl(iconUrl: string, pageUrl: string) {
  try {
    const resolvedUrl = new URL(iconUrl, pageUrl);

    return /^https?:$/i.test(resolvedUrl.protocol)
      ? resolvedUrl.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveFaviconCandidates(pageUrl: string, iconUrls: string[] = []) {
  const candidates = [
    ...iconUrls
      .map((iconUrl) => resolveAbsoluteFaviconUrl(iconUrl, pageUrl))
      .filter((iconUrl): iconUrl is string => Boolean(iconUrl)),
    resolveFaviconByUrl(pageUrl),
  ];

  return candidates.filter(
    (iconUrl, index): iconUrl is string =>
      Boolean(iconUrl) && candidates.indexOf(iconUrl) === index,
  );
}

async function fetchFaviconAsDataUrl(iconUrl: string) {
  try {
    const response = await fetch(iconUrl, {
      headers: {
        Accept: FAVICON_ACCEPT_HEADER,
        "User-Agent": DESKTOP_CHROME_USER_AGENT,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const contentTypeHeader = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();
    const contentType = contentTypeHeader?.startsWith("image/")
      ? contentTypeHeader
      : "image/x-icon";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      return undefined;
    }

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}
