import type { BrowserHistoryEntry } from "../model.js";

export interface HistoryDayGroup {
  key: string;
  shortLabel: string;
  title: string;
  items: BrowserHistoryEntry[];
}

export interface HistoryMonthGroup {
  key: string;
  label: string;
  days: Array<{ key: string; label: string; count: number }>;
}

export function escapeHistoryHtml(value: string | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getHistoryDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getHistoryFaviconUrl(url: string) {
  try {
    return new URL("/favicon.ico", new URL(url).origin).toString();
  } catch {
    return "";
  }
}

function getHistoryDayKey(visitedAt: string) {
  const date = new Date(visitedAt);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getHistoryMonthKey(visitedAt: string) {
  const date = new Date(visitedAt);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function formatHistoryMonthSidebarLabel(key: string) {
  const [rawYear, rawMonth] = key.split("-").map(Number);
  const year = rawYear ?? new Date().getFullYear();
  const month = rawMonth ?? new Date().getMonth();
  return (
    new Date(year, month, 1)
      .toLocaleDateString("zh-CN", { month: "numeric" })
      .replace("月", "") + "月"
  );
}

function formatHistoryDayShortLabel(visitedAt: string) {
  const date = new Date(visitedAt);
  const today = new Date();
  const dayDiff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86400000,
  );

  if (dayDiff === 0) return "今天";
  if (dayDiff === 1) return "昨天";
  return String(date.getDate());
}

function formatHistoryDayTitle(visitedAt: string) {
  const date = new Date(visitedAt);
  const shortLabel = formatHistoryDayShortLabel(visitedAt);
  const longLabel = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return shortLabel === "今天" || shortLabel === "昨天"
    ? `${shortLabel} - ${longLabel}`
    : longLabel;
}

function formatHistoryClock(visitedAt: string) {
  return new Date(visitedAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function groupHistoryByDay(entries: BrowserHistoryEntry[]): HistoryDayGroup[] {
  const groups = new Map<string, HistoryDayGroup>();

  entries.forEach((entry) => {
    const key = getHistoryDayKey(entry.visitedAt);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        shortLabel: formatHistoryDayShortLabel(entry.visitedAt),
        title: formatHistoryDayTitle(entry.visitedAt),
        items: [],
      });
    }

    groups.get(key)?.items.push(entry);
  });

  return Array.from(groups.values());
}

export function buildHistoryMonthGroups(dayGroups: HistoryDayGroup[]): HistoryMonthGroup[] {
  const groups = new Map<string, HistoryMonthGroup>();

  dayGroups.forEach((dayGroup) => {
    const monthKey = getHistoryMonthKey(dayGroup.items[0]?.visitedAt ?? new Date().toISOString());

    if (!groups.has(monthKey)) {
      groups.set(monthKey, {
        key: monthKey,
        label: formatHistoryMonthSidebarLabel(monthKey),
        days: [],
      });
    }

    groups.get(monthKey)?.days.push({
      key: dayGroup.key,
      label: dayGroup.shortLabel,
      count: dayGroup.items.length,
    });
  });

  return Array.from(groups.values());
}

export function renderHistoryFaviconMarkup(url: string) {
  const faviconUrl = getHistoryFaviconUrl(url);
  const domain = getHistoryDomain(url);
  const initial = escapeHistoryHtml(domain.charAt(0).toUpperCase());

  if (faviconUrl) {
    return `<span class="favicon" data-fallback="${initial}"><img src="${escapeHistoryHtml(faviconUrl)}" alt="" /></span>`;
  }

  return `<span class="favicon">${initial}</span>`;
}

export function renderHistoryRowMarkup(entry: BrowserHistoryEntry) {
  const id = escapeHistoryHtml(entry.id);
  const url = escapeHistoryHtml(entry.url);
  const title = escapeHistoryHtml(entry.title || getHistoryDomain(entry.url));
  const domain = escapeHistoryHtml(getHistoryDomain(entry.url));
  const time = escapeHistoryHtml(formatHistoryClock(entry.visitedAt));

  return `
    <div class="history-row" data-url="${url}" data-history-id="${id}">
      <button class="row-action row-delete-action" type="button" data-action="delete" data-history-id="${id}" title="删除此条历史记录">×</button>
      ${renderHistoryFaviconMarkup(entry.url)}
      <div class="title-line">${title}</div>
      <div class="domain-cell"><span class="domain-text">${domain}</span><button class="row-action row-search-action" type="button" data-domain="${domain}" title="搜索此网站的历史记录">⌕</button></div>
      <div class="time-cell">${time}</div>
    </div>`;
}

export function renderHistoryTimeGroupsMarkup(groups: HistoryDayGroup[]) {
  return groups
    .map(
      (group) => `
        <section class="content-block history-block">
          <h3 class="block-heading">${escapeHistoryHtml(group.title)}</h3>
          <div class="rows">
            ${group.items.map((entry) => renderHistoryRowMarkup(entry)).join("")}
          </div>
        </section>`,
    )
    .join("");
}

export function getDefaultHistorySelectedDayKey(groups: HistoryDayGroup[]) {
  if (groups.length === 0) return null;
  return groups.find((group) => group.shortLabel === "今天")?.key ?? groups[0]?.key ?? null;
}

export function renderHistorySidebarMarkup(
  monthGroups: HistoryMonthGroup[],
  selectedDayKey: string | null,
) {
  return monthGroups
    .map(
      (month) => `
        <section class="history-nav-group">
          <div class="history-nav-month">${escapeHistoryHtml(month.label)}</div>
          <div class="history-nav-days">
            ${month.days
              .map((day) => {
                const activeClass = selectedDayKey === day.key ? " active" : "";
                return `<button class="history-nav-item${activeClass}" type="button" data-day-key="${escapeHistoryHtml(day.key)}"><span>${escapeHistoryHtml(day.label)}</span><span class="history-nav-count">${day.count}</span></button>`;
              })
              .join("")}
          </div>
        </section>`,
    )
    .join("");
}
