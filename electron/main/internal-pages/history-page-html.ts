import type { BrowserHistoryEntry, ThemeSnapshot } from "../model.js";
import {
  buildHistoryMonthGroups,
  getDefaultHistorySelectedDayKey,
  groupHistoryByDay,
  renderHistorySidebarMarkup,
  renderHistoryTimeGroupsMarkup,
} from "./history-page-helpers.js";

export function createHistoryPageHtml(
  theme: ThemeSnapshot,
  history: BrowserHistoryEntry[],
) {
  const isDark = theme.resolved === "dark";
  const historyEntries = history.slice(0, 200);
  const historyPayload = JSON.stringify(historyEntries)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const initialDayGroups = groupHistoryByDay(historyEntries);
  const initialMonthGroups = buildHistoryMonthGroups(initialDayGroups);
  const initialSelectedDayKey =
    getDefaultHistorySelectedDayKey(initialDayGroups);
  const initialVisibleDayGroups = initialSelectedDayKey
    ? initialDayGroups.filter((group) => group.key === initialSelectedDayKey)
    : initialDayGroups;
  const initialContentMarkup = historyEntries.length
    ? renderHistoryTimeGroupsMarkup(initialVisibleDayGroups)
    : '<div class="content-block empty">暂无历史记录。<br />先访问几个外部网页，再回来看看，这里就不再冷清了。</div>';
  const initialSidebarMarkup = renderHistorySidebarMarkup(
    initialMonthGroups,
    initialSelectedDayKey,
  );

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>历史记录</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${isDark ? "#121a23" : "#f7f9fc"};
        --sidebar-bg: ${isDark ? "#151f2a" : "#ffffff"};
        --content-bg: ${isDark ? "#121a23" : "#ffffff"};
        --panel: ${isDark ? "#1a2531" : "#ffffff"};
        --line: ${isDark ? "#233243" : "#e5eaf0"};
        --text: ${isDark ? "#edf3fb" : "#232a31"};
        --muted: ${isDark ? "#95a5b7" : "#7a8796"};
        --soft: ${isDark ? "#1a2531" : "#f7f9fc"};
        --accent: ${isDark ? "#5eb2ff" : "#3e8bff"};
        --accent-strong: ${isDark ? "#438feb" : "#2b72e5"};
        --accent-text: #ffffff;
        --button-bg: ${isDark ? "#192431" : "#ffffff"};
        --button-hover: ${isDark ? "#203041" : "#f2f6fb"};
        --input-bg: ${isDark ? "#101821" : "#fbfcfe"};
        --shadow: ${isDark ? "0 12px 30px rgba(0,0,0,0.22)" : "0 8px 24px rgba(31,45,61,0.06)"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--text); background: var(--bg); }
      .page { display: grid; grid-template-columns: 244px minmax(0, 1fr); min-height: 100vh; }
      .sidebar { padding: 18px 0 22px; background: var(--sidebar-bg); border-right: 1px solid var(--line); box-shadow: var(--shadow); }
      .sidebar-title { padding: 0 18px 14px; font-size: 34px; font-weight: 500; letter-spacing: 0.02em; color: ${isDark ? "#d6deea" : "#687789"}; }
      .sidebar-search,.sidebar-meta { padding: 0 18px 14px; }
      .sidebar-search input,.top-search input { width: 100%; height: 34px; padding: 0 12px; color: var(--text); background: var(--input-bg); border: 1px solid var(--line); border-radius: 6px; outline: none; }
      .sidebar-search input::placeholder,.top-search input::placeholder { color: var(--muted); }
      .sidebar-meta { color: var(--muted); font-size: 12px; line-height: 1.7; }
      .history-nav { display: flex; flex-direction: column; gap: 14px; max-height: calc(100vh - 160px); padding: 0 12px 0 18px; overflow: auto; }
      .history-nav-group { padding-right: 6px; }
      .history-nav-month { margin-bottom: 8px; color: var(--accent); font-size: 20px; font-weight: 600; }
      .history-nav-days { display: flex; flex-direction: column; gap: 4px; }
      .history-nav-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 9px 12px; color: var(--muted); cursor: pointer; text-align: left; background: transparent; border: 0; border-radius: 8px; font-size: 13px; }
      .history-nav-item:hover { background: var(--button-hover); }
      .history-nav-item.active { color: var(--accent-text); background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%); }
      .history-nav-count { opacity: 0.7; font-size: 12px; }
      .content { padding: 20px 30px 60px; background: var(--content-bg); }
      .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
      .top-search { width: 280px; }
      .toolbar-right,.sort-group { display: flex; align-items: center; gap: 12px; }
      .ghost-button,.pill { height: 34px; padding: 0 14px; color: var(--muted); background: var(--button-bg); border: 1px solid var(--line); border-radius: 6px; }
      .pill { display: inline-flex; align-items: center; }
      .ghost-button:hover,.pill:hover { background: var(--button-hover); }
      .section { max-width: 1040px; margin-bottom: 36px; }
      .section h2 { margin: 0; font-size: 18px; font-weight: 600; }
      .section-lead,.hint { margin: 8px 0 16px; color: var(--muted); font-size: 13px; line-height: 1.7; }
      .section-lead { margin-bottom: 18px; }
      .sort-group label { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 13px; cursor: pointer; }
      .sort-group input { accent-color: var(--accent-strong); }
      .content-block { max-width: 1040px; margin-bottom: 18px; padding: 18px 20px; background: var(--soft); border: 1px solid var(--line); border-radius: 14px; }
      .history-block { padding: 14px 16px 16px; }
      .block-heading { margin: 0 0 12px; color: var(--accent-strong); font-size: 16px; font-weight: 700; }
      .rows { background: var(--button-bg); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
      .history-row { display: grid; grid-template-columns: 24px 18px minmax(0, 1fr) 180px 54px; gap: 12px; align-items: center; padding: 8px 16px; border-top: 1px solid var(--line); cursor: pointer; }
      .history-row:first-of-type { border-top: 0; }
      .history-row:hover { background: var(--button-hover); }
      .row-action { width: 20px; height: 20px; color: var(--muted); cursor: pointer; background: transparent; border: 0; border-radius: 4px; opacity: 0; transition: opacity 120ms ease, background-color 120ms ease, color 120ms ease; }
      .history-row:hover .row-action,.row-action:focus-visible { opacity: 1; }
      .row-action:hover { background: ${isDark ? "rgba(255,255,255,0.06)" : "#ffffff"}; color: var(--text); }
      .row-delete-action { font-size: 16px; line-height: 1; }
      .row-search-action { width: 30px; height: 30px; opacity: 0.92; font-size: 16px; background: var(--button-bg); border: 1px solid var(--line); }
      .favicon { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; overflow: hidden; border-radius: 4px; background: ${isDark ? "rgba(94,178,255,0.14)" : "rgba(62,139,255,0.14)"}; font-size: 9px; font-weight: 700; color: var(--accent-strong); }
      .favicon img { display: block; width: 16px; height: 16px; object-fit: contain; }
      .title-line { overflow: hidden; color: var(--text); text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .domain-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; color: var(--muted); font-size: 12px; }
      .domain-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .time-cell { color: var(--muted); text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
      .empty { padding: 56px 18px; color: var(--muted); text-align: center; line-height: 1.9; }
      @media (width <= 980px) {
        .page { grid-template-columns: 1fr; }
        .sidebar { border-right: none; border-bottom: 1px solid var(--line); }
        .history-nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); max-height: none; padding-right: 18px; }
        .content { padding: 20px 18px 42px; }
        .topbar { flex-direction: column; align-items: stretch; }
        .top-search { width: 100%; }
        .toolbar-right { flex-direction: column; align-items: flex-start; }
        .history-row { grid-template-columns: 24px 18px minmax(0, 1fr); }
        .domain-cell,.time-cell { grid-column: 3; justify-content: flex-start; text-align: left; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">历史</div>
        <div class="sidebar-search"><input id="historySidebarSearchInput" type="text" placeholder="搜索历史" /></div>
        <div class="sidebar-meta">历史页与设置页现在共用同一套内置页外壳：左侧导航、右侧内容区、统一边框和留白，不再各搞各的。</div>
        <nav id="sidebar" class="history-nav">${initialSidebarMarkup}</nav>
      </aside>
      <section class="content">
        <div class="topbar">
          <div class="top-search"><input id="historySearchInput" type="text" placeholder="搜索历史记录" /></div>
          <div class="toolbar-right">
            <div class="pill">最近记录 ${historyEntries.length} 条</div>
            <button id="clearHistoryButton" class="ghost-button" type="button">清除所有历史</button>
            <button id="clearHistoryFilterButton" class="ghost-button" type="button">清空筛选</button>
          </div>
        </div>
        <section class="section">
          <h2>历史记录</h2>
          <p class="section-lead">这里展示当前 Electron Chrome 记录到的最近访问页面。信息结构继续参考 video-downloader，但视觉外壳已与设置页统一。</p>
          <div class="content-block">
            <div class="toolbar-right">
              <div class="sort-group">
                <label><input type="radio" name="history-sort" value="time" checked /> 按浏览时间排序</label>
                <label><input type="radio" name="history-sort" value="site" /> 按站点排序</label>
                <label><input type="radio" name="history-sort" value="closed" /> 最近关闭</label>
              </div>
              <div id="historyHint" class="hint">仅记录 http / https 页面；内置页与失败页不会写入。</div>
            </div>
          </div>
          <section id="historyContent">${initialContentMarkup}</section>
        </section>
      </section>
    </main>
    <script>
      (function () {
        const historyEntries = ${historyPayload};
        const sidebarEl = document.getElementById("sidebar");
        const contentEl = document.getElementById("historyContent");
        const searchInputEl = document.getElementById("historySearchInput");
        const sidebarSearchInputEl = document.getElementById("historySidebarSearchInput");
        const hintEl = document.getElementById("historyHint");
        const clearHistoryButton = document.getElementById("clearHistoryButton");
        const clearHistoryFilterButton = document.getElementById("clearHistoryFilterButton");
        const defaultSelectedDayKey = ${JSON.stringify(initialSelectedDayKey)};
        let keyword = "";
        let sortMode = "time";
        let selectedDayKey = defaultSelectedDayKey;

        function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
        function getDomain(url) { try { return new URL(url).hostname; } catch { return url; } }
        function getFaviconUrl(url) { try { return new URL("/favicon.ico", new URL(url).origin).toString(); } catch { return ""; } }
        function formatDayKey(visitedAt) { const date = new Date(visitedAt); return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate(); }
        function formatMonthKey(visitedAt) { const date = new Date(visitedAt); return date.getFullYear() + "-" + date.getMonth(); }
        function formatMonthSidebarLabel(key) { const parts = key.split("-").map(Number); return new Date(parts[0], parts[1], 1).toLocaleDateString("zh-CN", { month: "numeric" }).replace("月", "") + "月"; }
        function formatDayShortLabel(visitedAt) {
          const date = new Date(visitedAt); const today = new Date();
          const dayDiff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
          if (dayDiff === 0) return "今天"; if (dayDiff === 1) return "昨天"; return String(date.getDate());
        }
        function formatDayTitle(visitedAt) {
          const date = new Date(visitedAt); const shortLabel = formatDayShortLabel(visitedAt);
          const longLabel = date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
          return shortLabel === "今天" || shortLabel === "昨天" ? shortLabel + " - " + longLabel : longLabel;
        }
        function formatTime(visitedAt) { return new Date(visitedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
        function groupByDay(entries) {
          const groups = new Map();
          entries.forEach((entry) => {
            const key = formatDayKey(entry.visitedAt);
            if (!groups.has(key)) groups.set(key, { key, shortLabel: formatDayShortLabel(entry.visitedAt), title: formatDayTitle(entry.visitedAt), items: [] });
            groups.get(key).items.push(entry);
          });
          return Array.from(groups.values());
        }
        function buildMonthGroups(dayGroups) {
          const groups = new Map();
          dayGroups.forEach((dayGroup) => {
            const monthKey = formatMonthKey(dayGroup.items[0] ? dayGroup.items[0].visitedAt : new Date().toISOString());
            if (!groups.has(monthKey)) groups.set(monthKey, { key: monthKey, label: formatMonthSidebarLabel(monthKey), days: [] });
            groups.get(monthKey).days.push({ key: dayGroup.key, label: dayGroup.shortLabel, count: dayGroup.items.length });
          });
          return Array.from(groups.values());
        }
        function groupBySite(entries) {
          const groups = new Map();
          entries.forEach((entry) => {
            const domain = getDomain(entry.url); if (!groups.has(domain)) groups.set(domain, { domain, items: [] }); groups.get(domain).items.push(entry);
          });
          return Array.from(groups.values()).sort((left, right) => right.items.length - left.items.length);
        }
        function getRecentlyClosedEntries(entries) {
          return entries.filter((entry) => Boolean(entry.closedAt)).sort((left, right) => String(right.closedAt || '').localeCompare(String(left.closedAt || '')));
        }
        function renderFavicon(url) {
          const faviconUrl = getFaviconUrl(url); const domain = getDomain(url); const fallback = escapeHtml(domain.charAt(0).toUpperCase());
          if (faviconUrl) return '<span class="favicon" data-fallback="' + fallback + '"><img src="' + escapeHtml(faviconUrl) + '" alt="" /></span>';
          return '<span class="favicon">' + fallback + '</span>';
        }
        function attachFaviconFallbacks(root) {
          root.querySelectorAll('.favicon img').forEach(function (img) {
            if (!(img instanceof HTMLImageElement) || img.dataset.fallbackBound === '1') return;
            img.dataset.fallbackBound = '1';
            img.addEventListener('error', function () {
              const parent = img.parentElement; if (!parent) return; parent.textContent = parent.getAttribute('data-fallback') || '';
            }, { once: true });
          });
        }
        function renderRow(entry) {
          const id = escapeHtml(entry.id); const url = escapeHtml(entry.url); const title = escapeHtml(entry.title || getDomain(entry.url)); const domain = escapeHtml(getDomain(entry.url)); const time = escapeHtml(formatTime(entry.visitedAt));
          return '<div class="history-row" data-url="' + url + '" data-history-id="' + id + '"><button class="row-action row-delete-action" type="button" data-action="delete" data-history-id="' + id + '" title="删除此条历史记录">×</button>' + renderFavicon(entry.url) + '<div class="title-line">' + title + '</div><div class="domain-cell"><span class="domain-text">' + domain + '</span><button class="row-action row-search-action" type="button" data-domain="' + domain + '" title="搜索此网站的历史记录">⌕</button></div><div class="time-cell">' + time + '</div></div>';
        }
        function renderTimeView(groups) { return groups.map((group) => '<section class="content-block history-block"><h3 class="block-heading">' + escapeHtml(group.title) + '</h3><div class="rows">' + group.items.map(renderRow).join('') + '</div></section>').join(''); }
        function renderSiteView(groups) { return groups.map((group) => '<section class="content-block history-block"><h3 class="block-heading">' + escapeHtml(group.domain) + ' · ' + group.items.length + ' 条记录</h3><div class="rows">' + group.items.map(renderRow).join('') + '</div></section>').join(''); }
        function renderRecentlyClosed(entries) { return entries.length ? '<section class="content-block history-block"><div class="rows">' + entries.map(renderRow).join('') + '</div></section>' : '<div class="empty">' + (keyword ? '没有匹配的关闭记录' : '暂无最近关闭记录') + '</div>'; }
        function getFilteredEntries() { const normalizedKeyword = keyword.trim().toLowerCase(); return !normalizedKeyword ? historyEntries : historyEntries.filter((entry) => String(entry.title || '').toLowerCase().includes(normalizedKeyword) || String(entry.url || '').toLowerCase().includes(normalizedKeyword)); }
        function getDayScopedEntries(entries) { return !selectedDayKey ? entries : entries.filter((entry) => formatDayKey(entry.visitedAt) === selectedDayKey); }
        function renderSidebar(monthGroups) {
          sidebarEl.innerHTML = monthGroups.map((month) => '<section class="history-nav-group"><div class="history-nav-month">' + escapeHtml(month.label) + '</div><div class="history-nav-days">' + month.days.map((day) => { const activeClass = selectedDayKey === day.key ? ' active' : ''; return '<button class="history-nav-item' + activeClass + '" type="button" data-day-key="' + escapeHtml(day.key) + '"><span>' + escapeHtml(day.label) + '</span><span class="history-nav-count">' + day.count + '</span></button>'; }).join('') + '</div></section>').join('');
        }
        function render() {
          const filteredEntries = getFilteredEntries(); const dayScopedEntries = getDayScopedEntries(filteredEntries); const allDayGroups = groupByDay(historyEntries); const filteredDayGroups = groupByDay(dayScopedEntries); const monthGroups = buildMonthGroups(allDayGroups); const siteGroups = groupBySite(filteredEntries); const recentlyClosedEntries = getRecentlyClosedEntries(filteredEntries);
          renderSidebar(monthGroups);
          hintEl.textContent = '共 ' + historyEntries.length + ' 条记录 · 当前显示 ' + (sortMode === 'closed' ? recentlyClosedEntries.length : sortMode === 'site' ? filteredEntries.length : dayScopedEntries.length) + ' 条';
          clearHistoryFilterButton.disabled = !keyword && selectedDayKey === defaultSelectedDayKey;
          clearHistoryButton.disabled = historyEntries.length === 0;
          if (sortMode !== 'closed' && sortMode !== 'site' && dayScopedEntries.length === 0) { contentEl.innerHTML = '<div class="empty">' + (keyword ? '没有匹配的历史记录。<br />换个关键词试试。' : '暂无历史记录。<br />先访问几个外部网页，再回来看看，这里就不再冷清了。') + '</div>'; return; }
          if (sortMode === 'site') { contentEl.innerHTML = filteredEntries.length ? renderSiteView(siteGroups) : '<div class="empty">' + (keyword ? '没有匹配的历史记录。<br />换个关键词试试。' : '暂无浏览历史') + '</div>'; attachFaviconFallbacks(contentEl); return; }
          if (sortMode === 'closed') { contentEl.innerHTML = renderRecentlyClosed(recentlyClosedEntries); attachFaviconFallbacks(contentEl); return; }
          contentEl.innerHTML = filteredDayGroups.length ? renderTimeView(filteredDayGroups) : '<div class="empty">当前日期下没有匹配记录。<br />点左侧其他日期，或者清空筛选后再看看。</div>';
          attachFaviconFallbacks(contentEl);
        }
        function syncKeywordInputs(nextKeyword) { searchInputEl.value = nextKeyword; sidebarSearchInputEl.value = nextKeyword; }
        function updateKeyword(nextKeyword) { keyword = nextKeyword; syncKeywordInputs(nextKeyword); render(); }
        searchInputEl.addEventListener('input', function () { updateKeyword(searchInputEl.value || ''); });
        sidebarSearchInputEl.addEventListener('input', function () { updateKeyword(sidebarSearchInputEl.value || ''); });
        document.querySelectorAll('input[name="history-sort"]').forEach((input) => { input.addEventListener('change', function () { sortMode = input.value; render(); }); });
        sidebarEl.addEventListener('click', function (event) { const target = event.target; if (!(target instanceof HTMLElement)) return; const button = target.closest('[data-day-key]'); const dayKey = button instanceof HTMLElement ? button.getAttribute('data-day-key') : null; if (!dayKey) return; selectedDayKey = selectedDayKey === dayKey ? null : dayKey; render(); });
        contentEl.addEventListener('click', function (event) {
          const target = event.target; if (!(target instanceof HTMLElement)) return;
          const actionButton = target.closest('[data-action]'); const deleteId = actionButton instanceof HTMLElement ? actionButton.getAttribute('data-history-id') : null; const action = actionButton instanceof HTMLElement ? actionButton.getAttribute('data-action') : null;
          if (action === 'delete' && deleteId) { event.stopPropagation(); window.location.href = 'chrome://history/delete/' + deleteId; return; }
          const domainButton = target.closest('[data-domain]'); const actionDomain = domainButton instanceof HTMLElement ? domainButton.getAttribute('data-domain') : null;
          if (actionDomain) { event.stopPropagation(); updateKeyword(actionDomain); return; }
          const row = target.closest('.history-row'); if (!(row instanceof HTMLElement)) return; const url = row.getAttribute('data-url');
          if (url) { if (event.metaKey || event.ctrlKey || event.button === 1) window.open(url, '_blank'); else window.location.href = url; }
        });
        contentEl.addEventListener('auxclick', function (event) { if (!(event.target instanceof HTMLElement) || event.button !== 1) return; const row = event.target.closest('.history-row'); if (!(row instanceof HTMLElement)) return; const url = row.getAttribute('data-url'); if (url) { event.preventDefault(); window.open(url, '_blank'); } });
        clearHistoryButton.addEventListener('click', function () { window.location.href = 'chrome://history/clear'; });
        clearHistoryFilterButton.addEventListener('click', function () { selectedDayKey = defaultSelectedDayKey; updateKeyword(''); });
        render(); attachFaviconFallbacks(document);
      })();
    </script>
  </body>
</html>`;
}
