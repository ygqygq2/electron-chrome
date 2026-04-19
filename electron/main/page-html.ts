import {
  INTERNAL_SETTINGS_URL,
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_HISTORY_URL,
  DEFAULT_URL,
  SETTINGS_SECTIONS,
  type ThemeSnapshot,
  type BrowserShellState,
  type SettingsSection,
  type ToolbarPreferences,
  type RuntimeInfoSnapshot,
  type BrowserHistoryEntry,
} from "./model.js";

import {
  isDownloadsUrl,
  isExtensionsUrl,
  isHomeUrl,
  isHistoryUrl,
  getSettingsSectionFromUrl,
} from "./url-utils.js";

export function createHomePageHtml(theme: ThemeSnapshot) {
  const isDark = theme.resolved === "dark";
  const shortcuts = [
    { label: "GitHub", icon: "G", url: "https://github.com/" },
    { label: "百度", icon: "百", url: "https://www.baidu.com/" },
    { label: "Bilibili", icon: "B", url: "https://www.bilibili.com/" },
    { label: "知乎", icon: "知", url: "https://www.zhihu.com/" },
    { label: "Electron", icon: "电", url: "https://www.electronjs.org/" },
    { label: "Gmail", icon: "邮", url: "https://mail.google.com/" },
    { label: "掘金", icon: "掘", url: "https://juejin.cn/" },
    { label: "少数派", icon: "少", url: "https://sspai.com/" },
    { label: "设置", icon: "设", url: INTERNAL_SETTINGS_URL },
    { label: "历史", icon: "史", url: INTERNAL_HISTORY_URL },
  ];
  const chips = [
    { label: "历史记录", url: INTERNAL_HISTORY_URL },
    { label: "下载中心", url: INTERNAL_DOWNLOADS_URL },
    { label: "设置", url: INTERNAL_SETTINGS_URL },
    { label: "扩展", url: INTERNAL_EXTENSIONS_URL },
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>新标签页</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --text: ${isDark ? "#eef5fd" : "#f7fbff"};
        --text-soft: ${isDark ? "rgba(238,245,253,0.76)" : "rgba(247,251,255,0.82)"};
        --glass: ${isDark ? "rgba(8, 24, 49, 0.34)" : "rgba(14, 60, 123, 0.26)"};
        --glass-strong: ${isDark ? "rgba(10, 28, 54, 0.48)" : "rgba(10, 54, 112, 0.36)"};
        --card: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)"};
        --card-hover: ${isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)"};
        --search-bg: ${isDark ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.96)"};
        --search-text: #1c2530;
      }
      * { box-sizing: border-box; }
      html, body { min-height: 100%; }
      body {
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(circle at 50% 18%, rgba(110, 213, 255, 0.32), transparent 20%),
          radial-gradient(circle at 22% 60%, rgba(255, 255, 255, 0.18), transparent 18%),
          radial-gradient(circle at 78% 64%, rgba(142, 191, 255, 0.22), transparent 20%),
          linear-gradient(180deg, ${isDark ? "#0a5ca8" : "#0c63b7"} 0%, ${isDark ? "#2571c6" : "#2f82d8"} 34%, ${isDark ? "#428ad7" : "#4e9ce7"} 62%, ${isDark ? "#75b0ea" : "#89c2f5"} 100%);
        overflow: hidden;
      }
      body::before {
        position: fixed;
        inset: auto 0 0;
        height: 34vh;
        content: "";
        background:
          radial-gradient(circle at 50% 20%, rgba(255,255,255,0.34), transparent 26%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(9, 33, 62, 0.18));
        opacity: 0.95;
      }
      body::after {
        position: fixed;
        inset: auto 0 0;
        height: 16vh;
        content: "";
        background: linear-gradient(180deg, rgba(8, 23, 44, 0), rgba(7, 26, 51, 0.28));
      }
      .page {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        padding: 24px 28px;
      }
      .topbar {
        display: flex;
        justify-content: flex-end;
      }
      .capsule {
        display: inline-flex;
        gap: 10px;
        align-items: center;
        height: 36px;
        padding: 0 14px;
        color: var(--text-soft);
        background: var(--glass);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        backdrop-filter: blur(14px);
      }
      .capsule a {
        color: inherit;
        text-decoration: none;
      }
      .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 88px);
        text-align: center;
      }
      .search-form {
        display: flex;
        align-items: center;
        gap: 12px;
        width: min(620px, 92vw);
        height: 54px;
        padding: 0 16px 0 18px;
        background: var(--search-bg);
        border-radius: 999px;
        box-shadow: 0 18px 44px rgba(0,0,0,0.16);
      }
      .search-icon,
      .search-action {
        flex: 0 0 auto;
        color: #6c7b8d;
        font-size: 17px;
      }
      .search-form input {
        flex: 1;
        min-width: 0;
        height: 100%;
        color: var(--search-text);
        background: transparent;
        border: 0;
        outline: none;
        font-size: 15px;
      }
      .search-form button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        color: #56708a;
        cursor: pointer;
        background: transparent;
        border: 0;
        border-radius: 999px;
      }
      .search-form button:hover {
        background: rgba(41, 112, 206, 0.1);
      }
      .chips {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        margin: 20px 0 28px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        height: 31px;
        padding: 0 12px;
        color: var(--text);
        text-decoration: none;
        background: var(--glass);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        backdrop-filter: blur(10px);
      }
      .chip:hover {
        background: var(--glass-strong);
      }
      .sites {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 92px));
        gap: 18px 24px;
      }
      .site {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: var(--text);
        text-decoration: none;
      }
      .site:hover .site-icon {
        transform: translateY(-2px);
        background: var(--card-hover);
      }
      .site-icon {
        display: grid;
        place-items: center;
        width: 60px;
        height: 60px;
        font-size: 25px;
        font-weight: 700;
        background: var(--card);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        transition: transform 140ms ease, background-color 140ms ease;
      }
      .site-label {
        font-size: 12px;
        color: var(--text);
      }
      .logo-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-bottom: 28px;
      }
      .logo-wrap svg {
        width: 80px;
        height: 80px;
        filter: drop-shadow(0 6px 18px rgba(0,0,0,0.22));
      }
      .logo-name {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--text);
        opacity: 0.92;
      }
      @media (width <= 860px) {
        .page { padding: 18px; }
        .sites { grid-template-columns: repeat(4, minmax(0, 92px)); gap: 16px; }
      }
      @media (width <= 640px) {
        .hero { justify-content: flex-start; padding-top: 56px; }
        .sites { grid-template-columns: repeat(3, minmax(0, 92px)); }
        .search-form { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="topbar">
        <div class="capsule">
          <span>🌓 当前主题：${theme.resolved}</span>
          <a href="${INTERNAL_SETTINGS_URL}/uiStyle">调整外观</a>
        </div>
      </div>
      <section class="hero">
        <div class="logo-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="27" stroke="rgba(255,255,255,0.9)" stroke-width="2.5"/>
            <ellipse cx="32" cy="32" rx="27" ry="10.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.8" transform="rotate(-38 32 32)"/>
            <circle cx="32" cy="32" r="7.5" fill="rgba(255,255,255,0.95)"/>
            <circle cx="53" cy="15" r="3" fill="rgba(255,255,255,0.85)"/>
          </svg>
          <span class="logo-name">electron-chrome</span>
        </div>
        <form class="search-form" action="https://www.baidu.com/s" method="get">
          <span class="search-icon">⌕</span>
          <input name="wd" type="text" placeholder="搜索或输入网址" autocomplete="off" />
          <button type="submit" aria-label="搜索"><span class="search-action">↗</span></button>
        </form>
        <div class="chips">
          ${chips
            .map(
              (chip) => `<a class="chip" href="${chip.url}">${chip.label}</a>`,
            )
            .join("")}
        </div>
        <div class="sites">
          ${shortcuts
            .map(
              (site) => `
                <a class="site" href="${site.url}">
                  <div class="site-icon">${site.icon}</div>
                  <div class="site-label">${site.label}</div>
                </a>`,
            )
            .join("")}
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function createDownloadsPageHtml(theme: ThemeSnapshot) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>下载</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${theme.resolved === "dark" ? "#101821" : "#f3f7fb"};
        --panel: ${theme.resolved === "dark" ? "#18212c" : "#ffffff"};
        --line: ${theme.resolved === "dark" ? "#324255" : "#d6dee8"};
        --text: ${theme.resolved === "dark" ? "#edf2f7" : "#1f2328"};
        --muted: ${theme.resolved === "dark" ? "#93a1b1" : "#617283"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 36px 28px; color: var(--text); background: var(--bg); }
      .card { max-width: 880px; margin: 0 auto; padding: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      ul { margin: 18px 0 0; color: var(--muted); line-height: 1.8; }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>下载</h1>
      <p>这里是第一版下载页占位。后续可接入真实下载任务列表、进度、失败重试和打开文件夹能力。</p>
      <ul>
        <li>顶部按钮已经可以直接打开本页</li>
        <li>下载弹出菜单也会把用户带到这里</li>
        <li>当前版本优先打通浏览器式入口路径</li>
      </ul>
    </section>
  </body>
</html>`;
}

export function createDownloadsPopupHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>下载</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: #eef2f7;
        --panel: rgba(255, 255, 255, 0.9);
        --panel-strong: #ffffff;
        --line: #dbe3ec;
        --text: #1f2937;
        --muted: #728196;
        --accent: #2563eb;
        --success: #16a34a;
        --warning: #d97706;
        --danger: #dc2626;
        --row-hover: #f8fbff;
        --empty-bg: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.92));
      }

      html[data-theme="dark"] {
        color-scheme: dark;
        --bg: #11161d;
        --panel: rgba(28, 34, 44, 0.9);
        --panel-strong: #1a212b;
        --line: #2a3542;
        --text: #e8eef6;
        --muted: #92a1b3;
        --accent: #72a7ff;
        --success: #58d68d;
        --warning: #f3b454;
        --danger: #ff7b72;
        --row-hover: #202833;
        --empty-bg: linear-gradient(180deg, rgba(26,33,43,0.82), rgba(20,26,34,0.94));
      }

      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 24%),
          linear-gradient(180deg, var(--bg), color-mix(in srgb, var(--bg) 86%, #ffffff));
      }

      .window {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .toolbar,
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
        background: var(--panel-strong);
        border-bottom: 1px solid var(--line);
      }

      .footer {
        margin-top: auto;
        border-top: 1px solid var(--line);
        border-bottom: 0;
      }

      .title h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }

      .title p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 14px;
      }

      .stats {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: var(--muted);
        font-size: 13px;
      }

      .actions,
      .footer-actions,
      .row-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .button,
      .ghost-link,
      .search {
        height: 40px;
        border-radius: 10px;
        border: 1px solid var(--line);
      }

      .button {
        padding: 0 16px;
        color: var(--text);
        cursor: pointer;
        background: var(--panel-strong);
      }

      .button.primary {
        color: #fff;
        background: var(--accent);
        border-color: var(--accent);
      }

      .button:hover,
      .ghost-link:hover {
        background: color-mix(in srgb, var(--panel-strong) 82%, var(--accent) 8%);
      }

      .button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .search {
        width: 320px;
        padding: 0 14px;
        color: var(--text);
        background: var(--panel-strong);
      }

      .search::placeholder {
        color: var(--muted);
      }

      .list {
        padding: 10px 0 0;
      }

      .row {
        display: grid;
        grid-template-columns: 64px minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
        padding: 18px 20px;
        border-top: 1px solid var(--line);
        background: color-mix(in srgb, var(--panel) 92%, transparent);
      }

      .row:first-child {
        border-top: 0;
      }

      .row:hover {
        background: var(--row-hover);
      }

      .file-icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 54px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        background: color-mix(in srgb, var(--accent) 10%, var(--panel-strong));
        border-radius: 12px;
      }

      .main {
        min-width: 0;
      }

      .name {
        overflow: hidden;
        font-size: 18px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meta,
      .status {
        margin-top: 6px;
        color: var(--muted);
        font-size: 14px;
      }

      .status.success { color: var(--success); }
      .status.warning { color: var(--warning); }
      .status.danger { color: var(--danger); }

      .link {
        padding: 0;
        color: var(--accent);
        cursor: pointer;
        background: transparent;
        border: 0;
        font-size: 15px;
      }

      .muted-link {
        width: 28px;
        height: 28px;
        color: color-mix(in srgb, var(--muted) 82%, transparent);
        cursor: pointer;
        background: transparent;
        border: 0;
        font-size: 24px;
        line-height: 1;
      }

      .empty {
        margin: 18px 20px 0;
        padding: 48px 22px;
        color: var(--muted);
        text-align: center;
        line-height: 1.9;
        background: var(--empty-bg);
        border: 1px solid var(--line);
        border-radius: 18px;
      }

      .hidden { display: none !important; }

      @media (width <= 960px) {
        .toolbar,
        .footer,
        .row {
          grid-template-columns: 1fr;
          flex-direction: column;
          align-items: flex-start;
        }

        .actions,
        .footer-actions,
        .row-actions {
          flex-wrap: wrap;
        }

        .search {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class="window">
      <header class="toolbar">
        <div class="title">
          <h1>下载</h1>
          <p>这里展示当前会话内的下载任务与高频操作，整体参考桌面浏览器下载管理窗口。</p>
        </div>
        <div class="actions">
          <div id="stats" class="stats">准备中…</div>
          <input id="searchInput" class="search" placeholder="搜索下载内容" />
        </div>
      </header>

      <section id="list" class="list"></section>
      <section id="empty" class="empty hidden">暂无下载记录。<br />去网页里下载一个文件，再回来看看，这里就不会空着了。</section>

      <footer class="footer">
        <div class="footer-actions">
          <button id="clearCompletedButton" class="button">清空已完成</button>
          <button id="openDownloadsPageButton" class="button">打开下载页</button>
          <button id="openDownloadsSettingsButton" class="button primary">下载设置</button>
        </div>
        <div style="color: var(--muted); font-size: 13px;">下载按钮现在默认直接打开此窗口，而不是继续弹下拉菜单。</div>
      </footer>
    </main>

    <script>
      (function () {
        const listEl = document.getElementById("list");
        const emptyEl = document.getElementById("empty");
        const statsEl = document.getElementById("stats");
        const searchInput = document.getElementById("searchInput");
        const clearCompletedButton = document.getElementById("clearCompletedButton");
        const openDownloadsPageButton = document.getElementById("openDownloadsPageButton");
        const openDownloadsSettingsButton = document.getElementById("openDownloadsSettingsButton");

        let currentState = { theme: { source: "system", resolved: "light" }, items: [] };
        let searchKeyword = "";

        function escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function formatBytes(value) {
          const size = Number(value || 0);
          if (!size) return "未知大小";
          const units = ["B", "KB", "MB", "GB"];
          let current = size;
          let unitIndex = 0;
          while (current >= 1024 && unitIndex < units.length - 1) {
            current /= 1024;
            unitIndex += 1;
          }
          return (current >= 100 || unitIndex === 0 ? current.toFixed(0) : current.toFixed(1)) + " " + units[unitIndex];
        }

        function formatStatus(item) {
          if (item.state === "completed" && item.existsOnDisk) {
            return { text: "已完成 · 文件安全可打开", className: "success" };
          }
          if (item.state === "completed" && !item.existsOnDisk) {
            return { text: "文件已删除 · 可重新下载", className: "warning" };
          }
          if (item.state === "interrupted") {
            return { text: "下载中断 · 可尝试重新下载", className: "danger" };
          }
          if (item.state === "cancelled") {
            return { text: "已取消 · 可重新下载", className: "warning" };
          }
          if (item.state === "paused") {
            return { text: "已暂停", className: "warning" };
          }
          const total = item.totalBytes > 0 ? " / " + formatBytes(item.totalBytes) : "";
          return { text: "下载中 · " + formatBytes(item.receivedBytes) + total, className: "" };
        }

        function resolveFileTag(item) {
          const name = String(item.fileName || "文件");
          const dotIndex = name.lastIndexOf(".");
          if (dotIndex < 0) return "文件";
          return name.slice(dotIndex + 1).toUpperCase().slice(0, 4) || "文件";
        }

        function updateTheme() {
          document.documentElement.dataset.theme = currentState.theme && currentState.theme.resolved || "light";
        }

        function getFilteredItems() {
          const keyword = searchKeyword.trim().toLowerCase();
          if (!keyword) return currentState.items || [];
          return (currentState.items || []).filter(function (item) {
            return String(item.fileName || "").toLowerCase().includes(keyword)
              || String(item.sourceUrl || "").toLowerCase().includes(keyword);
          });
        }

        function renderStats(items) {
          const completedCount = items.filter(function (item) { return item.state === "completed"; }).length;
          const activeCount = items.filter(function (item) { return item.state === "progressing" || item.state === "paused"; }).length;
          statsEl.textContent = "共 " + items.length + " 项 · 进行中 " + activeCount + " · 已完成 " + completedCount;
          clearCompletedButton.disabled = completedCount === 0;
        }

        function renderList() {
          updateTheme();
          const items = getFilteredItems();
          renderStats(currentState.items || []);

          if (!items.length) {
            listEl.innerHTML = "";
            emptyEl.classList.remove("hidden");
            emptyEl.innerHTML = searchKeyword
              ? "没有找到匹配的下载项。<br />换个关键词试试。"
              : "暂无下载记录。<br />去网页里下载一个文件，再回来看看，这里就不会空着了。";
            return;
          }

          emptyEl.classList.add("hidden");
          listEl.innerHTML = items.map(function (item) {
            const status = formatStatus(item);
            const meta = formatBytes(item.totalBytes || item.receivedBytes) + " · " + escapeHtml(item.sourceUrl || "");
            const openActions = item.existsOnDisk && item.state === "completed"
              ? '<button class="link" data-action="open" data-id="' + escapeHtml(item.id) + '">打开</button>'
                + '<button class="link" data-action="folder" data-id="' + escapeHtml(item.id) + '">打开文件夹</button>'
              : '<button class="link" data-action="retry" data-id="' + escapeHtml(item.id) + '">重新下载</button>';
            const removable = item.state !== "progressing" && item.state !== "paused"
              ? '<button class="muted-link" data-action="remove" data-id="' + escapeHtml(item.id) + '">×</button>'
              : '';
            return ''
              + '<article class="row">'
              + '  <div class="file-icon">' + escapeHtml(resolveFileTag(item)) + '</div>'
              + '  <div class="main">'
              + '    <div class="name">' + escapeHtml(item.fileName || "未命名文件") + '</div>'
              + '    <div class="meta">' + meta + '</div>'
              + '    <div class="status ' + escapeHtml(status.className) + '">' + escapeHtml(status.text) + '</div>'
              + '  </div>'
              + '  <div class="row-actions">' + openActions + removable + '</div>'
              + '</article>';
          }).join('');
        }

        listEl.addEventListener("click", function (event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const action = target.getAttribute("data-action");
          const id = target.getAttribute("data-id");
          if (!action || !id) return;
          if (action === "open") window.downloadsPopup.openItem(id);
          if (action === "folder") window.downloadsPopup.showItemInFolder(id);
          if (action === "retry") window.downloadsPopup.retryDownload(id);
          if (action === "remove") window.downloadsPopup.removeItem(id);
        });

        searchInput.addEventListener("input", function () {
          searchKeyword = searchInput.value || "";
          renderList();
        });

        clearCompletedButton.addEventListener("click", function () {
          window.downloadsPopup.clearCompleted();
        });

        openDownloadsPageButton.addEventListener("click", function () {
          window.downloadsPopup.openDownloadsPage();
        });

        openDownloadsSettingsButton.addEventListener("click", function () {
          window.downloadsPopup.openDownloadsSettings();
        });

        window.downloadsPopup.onStateChanged(function (nextState) {
          currentState = nextState;
          renderList();
        });

        window.downloadsPopup.getState().then(function (nextState) {
          currentState = nextState;
          renderList();
        });
      })();
    </script>
  </body>
</html>`;
}

export function createDownloadsPopupDataUrl() {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createDownloadsPopupHtml())}`;
}

export function createExtensionsPageHtml(theme: ThemeSnapshot) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>扩展</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${theme.resolved === "dark" ? "#101821" : "#f3f7fb"};
        --panel: ${theme.resolved === "dark" ? "#18212c" : "#ffffff"};
        --line: ${theme.resolved === "dark" ? "#324255" : "#d6dee8"};
        --text: ${theme.resolved === "dark" ? "#edf2f7" : "#1f2328"};
        --muted: ${theme.resolved === "dark" ? "#93a1b1" : "#617283"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 36px 28px; color: var(--text); background: var(--bg); }
      .card { max-width: 880px; margin: 0 auto; padding: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      ul { margin: 18px 0 0; color: var(--muted); line-height: 1.8; }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>扩展</h1>
      <p>这里是扩展页占位。当前版本先把入口与浏览器壳打通，后续可继续接入扩展管理与安装能力。</p>
      <ul>
        <li>顶部扩展按钮会直接打开本页</li>
        <li>主题会跟随当前壳层同步</li>
        <li>后续可扩展为真正的扩展管理面板</li>
      </ul>
    </section>
  </body>
</html>`;
}

function escapeHistoryHtml(value: string | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getHistoryDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getHistoryFaviconUrl(url: string) {
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

  if (dayDiff === 0) {
    return "今天";
  }

  if (dayDiff === 1) {
    return "昨天";
  }

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

interface HistoryDayGroup {
  key: string;
  shortLabel: string;
  title: string;
  items: BrowserHistoryEntry[];
}

interface HistoryMonthGroup {
  key: string;
  label: string;
  days: Array<{ key: string; label: string; count: number }>;
}

function groupHistoryByDay(entries: BrowserHistoryEntry[]): HistoryDayGroup[] {
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

function buildHistoryMonthGroups(dayGroups: HistoryDayGroup[]): HistoryMonthGroup[] {
  const groups = new Map<string, HistoryMonthGroup>();

  dayGroups.forEach((dayGroup) => {
    const monthKey = getHistoryMonthKey(
      dayGroup.items[0]?.visitedAt ?? new Date().toISOString(),
    );

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

function renderHistoryFaviconMarkup(url: string) {
  const faviconUrl = getHistoryFaviconUrl(url);
  const domain = getHistoryDomain(url);
  const initial = escapeHistoryHtml(domain.charAt(0).toUpperCase());

  if (faviconUrl) {
    return `<span class="favicon"><img src="${escapeHistoryHtml(faviconUrl)}" alt="" onerror="this.parentElement.innerHTML='${initial}'" /></span>`;
  }

  return `<span class="favicon">${initial}</span>`;
}

function renderHistoryRowMarkup(entry: BrowserHistoryEntry) {
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

function renderHistoryTimeGroupsMarkup(groups: HistoryDayGroup[]) {
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

function renderHistorySidebarMarkup(monthGroups: HistoryMonthGroup[], selectedDayKey: string | null) {
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

export function createHistoryPageHtml(theme: ThemeSnapshot, history: BrowserHistoryEntry[]) {
  const isDark = theme.resolved === "dark";
  const historyEntries = history.slice(0, 200);
  const historyPayload = JSON.stringify(historyEntries).replace(/</g, "\\u003c");
  const initialDayGroups = groupHistoryByDay(historyEntries);
  const initialMonthGroups = buildHistoryMonthGroups(initialDayGroups);
  const initialContentMarkup = historyEntries.length
    ? renderHistoryTimeGroupsMarkup(initialDayGroups)
    : '<div class="content-block empty">暂无历史记录。<br />先访问几个外部网页，再回来看看，这里就不再冷清了。</div>';
  const initialSidebarMarkup = renderHistorySidebarMarkup(initialMonthGroups, null);

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
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        color: var(--text);
        background: var(--bg);
      }
      .page {
        display: grid;
        grid-template-columns: 244px minmax(0, 1fr);
        min-height: 100vh;
      }
      .sidebar {
        padding: 18px 0 22px;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--line);
        box-shadow: var(--shadow);
      }
      .sidebar-title {
        padding: 0 18px 14px;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: ${isDark ? "#d6deea" : "#687789"};
      }
      .sidebar-search,
      .sidebar-meta {
        padding: 0 18px 14px;
      }
      .sidebar-search input,
      .top-search input {
        width: 100%;
        height: 34px;
        padding: 0 12px;
        color: var(--text);
        background: var(--input-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
        outline: none;
      }
      .sidebar-search input::placeholder,
      .top-search input::placeholder {
        color: var(--muted);
      }
      .sidebar-meta {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.7;
      }
      .history-nav {
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: calc(100vh - 160px);
        padding: 0 12px 0 18px;
        overflow: auto;
      }
      .history-nav-group {
        padding-right: 6px;
      }
      .history-nav-month {
        margin-bottom: 8px;
        color: var(--accent);
        font-size: 20px;
        font-weight: 600;
      }
      .history-nav-days {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .history-nav-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 9px 12px;
        color: var(--muted);
        cursor: pointer;
        text-align: left;
        background: transparent;
        border: 0;
        border-radius: 8px;
        font-size: 13px;
      }
      .history-nav-item:hover {
        background: var(--button-hover);
      }
      .history-nav-item.active {
        color: var(--accent-text);
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
      }
      .history-nav-count {
        opacity: 0.7;
        font-size: 12px;
      }
      .content {
        padding: 20px 30px 60px;
        background: var(--content-bg);
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
      }
      .top-search {
        width: 280px;
      }
      .toolbar-right,
      .sort-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ghost-button,
      .pill {
        height: 34px;
        padding: 0 14px;
        color: var(--muted);
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
      }
      .ghost-button:hover,
      .pill:hover {
        background: var(--button-hover);
      }
      .section {
        max-width: 1040px;
        margin-bottom: 36px;
      }
      .section h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      .section-lead,
      .hint {
        margin: 8px 0 16px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }
      .section-lead {
        margin-bottom: 18px;
      }
      .sort-group label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text);
        font-size: 13px;
        cursor: pointer;
      }
      .sort-group input {
        accent-color: var(--accent-strong);
      }
      .content-block {
        max-width: 1040px;
        margin-bottom: 18px;
        padding: 18px 20px;
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 14px;
      }
      .history-block {
        padding: 14px 16px 16px;
      }
      .block-heading {
        margin: 0 0 12px;
        color: var(--accent-strong);
        font-size: 16px;
        font-weight: 700;
      }
      .rows {
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 10px;
        overflow: hidden;
      }
      .history-row {
        display: grid;
        grid-template-columns: 24px 18px minmax(0, 1fr) 180px 54px;
        gap: 12px;
        align-items: center;
        padding: 8px 16px;
        border-top: 1px solid var(--line);
        cursor: pointer;
      }
      .history-row:first-of-type {
        border-top: 0;
      }
      .history-row:hover {
        background: var(--button-hover);
      }
      .row-action {
        width: 20px;
        height: 20px;
        color: var(--muted);
        cursor: pointer;
        background: transparent;
        border: 0;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 120ms ease, background-color 120ms ease, color 120ms ease;
      }
      .history-row:hover .row-action,
      .row-action:focus-visible {
        opacity: 1;
      }
      .row-action:hover {
        background: ${isDark ? "rgba(255,255,255,0.06)" : "#ffffff"};
        color: var(--text);
      }
      .row-delete-action {
        font-size: 16px;
        line-height: 1;
      }
      .row-search-action {
        font-size: 13px;
      }
      .favicon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        overflow: hidden;
        border-radius: 4px;
        background: ${isDark ? "rgba(94,178,255,0.14)" : "rgba(62,139,255,0.14)"};
        font-size: 9px;
        font-weight: 700;
        color: var(--accent-strong);
      }
      .favicon img {
        display: block;
        width: 16px;
        height: 16px;
        object-fit: contain;
      }
      .title-line {
        overflow: hidden;
        color: var(--text);
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
      }
      .domain-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-width: 0;
        color: var(--muted);
        font-size: 12px;
      }
      .domain-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .time-cell {
        color: var(--muted);
        text-align: right;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .empty {
        padding: 56px 18px;
        color: var(--muted);
        text-align: center;
        line-height: 1.9;
      }
      @media (width <= 980px) {
        .page {
          grid-template-columns: 1fr;
        }
        .sidebar {
          border-right: none;
          border-bottom: 1px solid var(--line);
        }
        .history-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          max-height: none;
          padding-right: 18px;
        }
        .content {
          padding: 20px 18px 42px;
        }
        .topbar {
          flex-direction: column;
          align-items: stretch;
        }
        .top-search {
          width: 100%;
        }
        .toolbar-right {
          flex-direction: column;
          align-items: flex-start;
        }
        .history-row {
          grid-template-columns: 24px 18px minmax(0, 1fr);
        }
        .domain-cell,
        .time-cell {
          grid-column: 3;
          justify-content: flex-start;
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">历史</div>
        <div class="sidebar-search">
          <input id="historySidebarSearchInput" type="text" placeholder="搜索历史" />
        </div>
        <div class="sidebar-meta">历史页与设置页现在共用同一套内置页外壳：左侧导航、右侧内容区、统一边框和留白，不再各搞各的。</div>
        <nav id="sidebar" class="history-nav">${initialSidebarMarkup}</nav>
      </aside>

      <section class="content">
        <div class="topbar">
          <div class="top-search">
            <input id="historySearchInput" type="text" placeholder="搜索历史记录" />
          </div>
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
        let keyword = "";
        let sortMode = "time";
        let selectedDayKey = null;

        function escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function getDomain(url) {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        }

        function getFaviconUrl(url) {
          try {
            return new URL("/favicon.ico", new URL(url).origin).toString();
          } catch {
            return "";
          }
        }

        function formatDayKey(visitedAt) {
          const date = new Date(visitedAt);
          return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
        }

        function formatMonthKey(visitedAt) {
          const date = new Date(visitedAt);
          return date.getFullYear() + "-" + date.getMonth();
        }

        function formatMonthSidebarLabel(key) {
          const parts = key.split("-").map(Number);
          return new Date(parts[0], parts[1], 1)
            .toLocaleDateString("zh-CN", { month: "numeric" })
            .replace("月", "") + "月";
        }

        function formatDayShortLabel(visitedAt) {
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

        function formatDayTitle(visitedAt) {
          const date = new Date(visitedAt);
          const shortLabel = formatDayShortLabel(visitedAt);
          const longLabel = date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          });
          return shortLabel === "今天" || shortLabel === "昨天"
            ? shortLabel + " - " + longLabel
            : longLabel;
        }

        function formatTime(visitedAt) {
          return new Date(visitedAt).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }

        function groupByDay(entries) {
          const groups = new Map();
          entries.forEach((entry) => {
            const key = formatDayKey(entry.visitedAt);
            if (!groups.has(key)) {
              groups.set(key, {
                key,
                shortLabel: formatDayShortLabel(entry.visitedAt),
                title: formatDayTitle(entry.visitedAt),
                items: [],
              });
            }
            groups.get(key).items.push(entry);
          });
          return Array.from(groups.values());
        }

        function buildMonthGroups(dayGroups) {
          const groups = new Map();
          dayGroups.forEach((dayGroup) => {
            const monthKey = formatMonthKey(dayGroup.items[0] ? dayGroup.items[0].visitedAt : new Date().toISOString());
            if (!groups.has(monthKey)) {
              groups.set(monthKey, {
                key: monthKey,
                label: formatMonthSidebarLabel(monthKey),
                days: [],
              });
            }
            groups.get(monthKey).days.push({
              key: dayGroup.key,
              label: dayGroup.shortLabel,
              count: dayGroup.items.length,
            });
          });
          return Array.from(groups.values());
        }

        function groupBySite(entries) {
          const groups = new Map();
          entries.forEach((entry) => {
            const domain = getDomain(entry.url);
            if (!groups.has(domain)) {
              groups.set(domain, { domain, items: [] });
            }
            groups.get(domain).items.push(entry);
          });
          return Array.from(groups.values()).sort((left, right) => right.items.length - left.items.length);
        }

        function renderFavicon(url) {
          const faviconUrl = getFaviconUrl(url);
          const domain = getDomain(url);
          if (faviconUrl) {
            return '<span class="favicon"><img src="' + escapeHtml(faviconUrl) + '" alt="" onerror="this.parentElement.innerHTML=\'' + escapeHtml(domain.charAt(0).toUpperCase()) + '\'" /></span>';
          }
          return '<span class="favicon">' + escapeHtml(domain.charAt(0).toUpperCase()) + '</span>';
        }

        function renderRow(entry) {
          const id = escapeHtml(entry.id);
          const url = escapeHtml(entry.url);
          const title = escapeHtml(entry.title || getDomain(entry.url));
          const domain = escapeHtml(getDomain(entry.url));
          const time = escapeHtml(formatTime(entry.visitedAt));
          return ''
            + '<div class="history-row" data-url="' + url + '" data-history-id="' + id + '">'
            + '  <button class="row-action row-delete-action" type="button" data-action="delete" data-history-id="' + id + '" title="删除此条历史记录">×</button>'
            + renderFavicon(entry.url)
            + '  <div class="title-line">' + title + '</div>'
            + '  <div class="domain-cell"><span class="domain-text">' + domain + '</span><button class="row-action row-search-action" type="button" data-domain="' + domain + '" title="搜索此网站的历史记录">⌕</button></div>'
            + '  <div class="time-cell">' + time + '</div>'
            + '</div>';
        }

        function renderTimeView(groups) {
          return groups.map((group) => {
            return ''
              + '<section class="content-block history-block">'
              + '  <h3 class="block-heading">' + escapeHtml(group.title) + '</h3>'
              + '  <div class="rows">' + group.items.map(renderRow).join('') + '</div>'
              + '</section>';
          }).join('');
        }

        function renderSiteView(groups) {
          return groups.map((group) => {
            return ''
              + '<section class="content-block history-block">'
              + '  <h3 class="block-heading">' + escapeHtml(group.domain) + ' · ' + group.items.length + ' 条记录</h3>'
              + '  <div class="rows">' + group.items.map(renderRow).join('') + '</div>'
              + '</section>';
          }).join('');
        }

        function getFilteredEntries() {
          const normalizedKeyword = keyword.trim().toLowerCase();
          if (!normalizedKeyword) {
            return historyEntries;
          }
          return historyEntries.filter((entry) => {
            const title = String(entry.title || '').toLowerCase();
            const url = String(entry.url || '').toLowerCase();
            return title.includes(normalizedKeyword) || url.includes(normalizedKeyword);
          });
        }

        function renderSidebar(monthGroups) {
          sidebarEl.innerHTML = monthGroups.map((month) => {
            return ''
              + '<section class="history-nav-group">'
              + '  <div class="history-nav-month">' + escapeHtml(month.label) + '</div>'
              + '  <div class="history-nav-days">'
              + month.days.map((day) => {
                  const activeClass = selectedDayKey === day.key ? ' active' : '';
                  return '<button class="history-nav-item' + activeClass + '" type="button" data-day-key="' + escapeHtml(day.key) + '"><span>' + escapeHtml(day.label) + '</span><span class="history-nav-count">' + day.count + '</span></button>';
                }).join('')
              + '  </div>'
              + '</section>';
          }).join('');
        }

        function render() {
          const filteredEntries = getFilteredEntries();
          const allDayGroups = groupByDay(historyEntries);
          const filteredDayGroups = groupByDay(filteredEntries);
          const monthGroups = buildMonthGroups(allDayGroups);
          const visibleDayGroups = selectedDayKey
            ? filteredDayGroups.filter((group) => group.key === selectedDayKey)
            : filteredDayGroups;
          const siteGroups = groupBySite(filteredEntries);

          renderSidebar(monthGroups);
          hintEl.textContent = '共 ' + historyEntries.length + ' 条记录 · 当前显示 ' + filteredEntries.length + ' 条';
          clearHistoryFilterButton.disabled = !keyword && !selectedDayKey;
          clearHistoryButton.disabled = historyEntries.length === 0;

          if (filteredEntries.length === 0) {
            contentEl.innerHTML = '<div class="empty">' + (keyword ? '没有匹配的历史记录。<br />换个关键词试试。' : '暂无历史记录。<br />先访问几个外部网页，再回来看看，这里就不再冷清了。') + '</div>';
            return;
          }

          if (sortMode === 'site') {
            contentEl.innerHTML = renderSiteView(siteGroups);
            return;
          }

          contentEl.innerHTML = visibleDayGroups.length
            ? renderTimeView(visibleDayGroups)
            : '<div class="empty">当前日期下没有匹配记录。<br />点左侧其他日期，或者清空筛选后再看看。</div>';
        }

        function syncKeywordInputs(nextKeyword) {
          searchInputEl.value = nextKeyword;
          sidebarSearchInputEl.value = nextKeyword;
        }

        function updateKeyword(nextKeyword) {
          keyword = nextKeyword;
          syncKeywordInputs(nextKeyword);
          render();
        }

        searchInputEl.addEventListener('input', function () {
          updateKeyword(searchInputEl.value || '');
        });

        sidebarSearchInputEl.addEventListener('input', function () {
          updateKeyword(sidebarSearchInputEl.value || '');
        });

        document.querySelectorAll('input[name="history-sort"]').forEach((input) => {
          input.addEventListener('change', function () {
            sortMode = input.value;
            render();
          });
        });

        sidebarEl.addEventListener('click', function (event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const dayKey = target.getAttribute('data-day-key');
          if (!dayKey) return;
          selectedDayKey = selectedDayKey === dayKey ? null : dayKey;
          render();
        });

        contentEl.addEventListener('click', function (event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const deleteId = target.getAttribute('data-history-id');
          const action = target.getAttribute('data-action');
          if (action === 'delete' && deleteId) {
            event.stopPropagation();
            window.location.href = 'chrome://history/delete/' + deleteId;
            return;
          }
          const actionDomain = target.getAttribute('data-domain');
          if (actionDomain) {
            event.stopPropagation();
            updateKeyword(actionDomain);
            return;
          }

          const row = target.closest('.history-row');
          if (!(row instanceof HTMLElement)) return;
          const url = row.getAttribute('data-url');
          if (url) {
            if (event.metaKey || event.ctrlKey || event.button === 1) {
              window.open(url, '_blank');
            } else {
              window.location.href = url;
            }
          }
        });

        contentEl.addEventListener('auxclick', function (event) {
          if (!(event.target instanceof HTMLElement) || event.button !== 1) return;
          const row = event.target.closest('.history-row');
          if (!(row instanceof HTMLElement)) return;
          const url = row.getAttribute('data-url');
          if (url) {
            event.preventDefault();
            window.open(url, '_blank');
          }
        });

        clearHistoryButton.addEventListener('click', function () {
          window.location.href = 'chrome://history/clear';
        });

        clearHistoryFilterButton.addEventListener('click', function () {
          selectedDayKey = null;
          updateKeyword('');
        });

        render();
      })();
    </script>
  </body>
</html>`;
}

export function createSettingsPageHtml(
  theme: ThemeSnapshot,
  currentSection: SettingsSection,
  toolbarPreferences: ToolbarPreferences,
  runtimeInfoSnapshot: RuntimeInfoSnapshot,
  history: BrowserHistoryEntry[],
) {
  const isDark = theme.resolved === "dark";
  const currentMeta =
    SETTINGS_SECTIONS.find((section) => section.id === currentSection) ??
    SETTINGS_SECTIONS[0]!;
  const navMarkup = SETTINGS_SECTIONS.map(
    (section) => `
          <a class="nav-item${section.id === currentSection ? " active" : ""}" href="${INTERNAL_SETTINGS_URL}${section.id === "browser" ? "" : `/${section.id}`}">
            <span class="nav-dot"></span>
            <span>${section.label}</span>
          </a>`,
  ).join("");

  const sectionContent =
    currentSection === "browser"
      ? `
        <section class="content-block">
          <h2>启动与首页</h2>
          <p class="block-note">这一页参考了“浏览器设置中心”的结构感，但没有逐像素复刻任何具体产品界面。</p>
          <label class="option-line"><input type="radio" checked /> <span>启动时打开主页</span></label>
          <div class="inline-row">
            <input class="text-field text-field-wide" type="text" value="${DEFAULT_URL}" />
            <button class="ghost-button" type="button">当前首页</button>
          </div>
          <label class="option-line muted"><input type="radio" /> <span>继续浏览上次未关闭的网页</span></label>
          <label class="option-line muted"><input type="radio" /> <span>打开以下网页列表</span></label>
          <div class="placeholder-panel"></div>
        </section>
        <section class="content-block">
          <h2>搜索与默认浏览器</h2>
          <div class="inline-row compact-row">
            <span class="field-label">搜索入口</span>
            <input class="text-field" type="text" value="默认搜索" />
            <input class="text-field" type="text" value="管理搜索项" />
          </div>
          <label class="option-line"><input type="checkbox" checked /> <span>地址栏可直接搜索</span></label>
          <label class="option-line"><input type="checkbox" checked /> <span>关闭异常后下次启动提示恢复标签页</span></label>
          <label class="option-line"><input type="checkbox" /> <span>启动时检查是否为默认浏览器（占位）</span></label>
        </section>`
      : currentSection === "uiStyle"
        ? `
        <section class="content-block">
          <h2>主题与壳层观感</h2>
          <div class="stat-grid">
            <article class="stat-card"><span>主题来源</span><strong>${theme.source}</strong></article>
            <article class="stat-card"><span>当前生效</span><strong>${theme.resolved}</strong></article>
            <article class="stat-card"><span>GPU 模式</span><strong>${runtimeInfoSnapshot.gpuLabel}</strong></article>
          </div>
        </section>
        <section class="content-block">
          <h2>工具栏按钮显隐</h2>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.home.visible ? "checked" : ""} /> <span>主页按钮</span></label>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.restoreClosedTab.visible ? "checked" : ""} /> <span>历史记录按钮 · ${toolbarPreferences.restoreClosedTab.placement === "left" ? "左侧" : "右侧"}</span></label>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.favorites.visible ? "checked" : ""} /> <span>收藏夹按钮 · ${toolbarPreferences.favorites.placement === "left" ? "左侧" : "右侧"}</span></label>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.downloads.visible ? "checked" : ""} /> <span>下载按钮</span></label>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.extensions.visible ? "checked" : ""} /> <span>扩展按钮</span></label>
        </section>`
        : currentSection === "tabOptions"
          ? `
        <section class="content-block">
          <h2>标签页体验</h2>
          <label class="option-line"><input type="checkbox" checked /> <span>标签条保持紧凑贴边显示</span></label>
          <label class="option-line"><input type="checkbox" checked /> <span>允许恢复刚关闭的标签页</span></label>
          <label class="option-line"><input type="checkbox" /> <span>关闭标签时优先回到左侧邻近标签</span></label>
          <div class="callout">当前实现更强调无白屏切换与承载稳定性，而不是先叠激进冻结策略。</div>
        </section>`
          : currentSection === "downloadSetting"
            ? `
        <section class="content-block">
          <h2>下载中心现状</h2>
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.downloads.visible ? "checked" : ""} /> <span>顶部显示下载入口按钮</span></label>
          <div class="callout">当前已打通下载页入口；真实下载任务列表、进度和失败重试会在后续版本补齐。</div>
          <div class="inline-row"><a class="link-button" href="${INTERNAL_DOWNLOADS_URL}">打开下载页</a></div>
        </section>`
            : currentSection === "tpMoreMouseGesture"
              ? `
        <section class="content-block">
          <h2>手势与高频操作</h2>
          <div class="callout">这一页只保留信息架构，不堆假开关。当前项目更适合优先完善快捷键、菜单和内部页链路。</div>
          <label class="option-line muted"><input type="checkbox" /> <span>预留鼠标手势扩展位</span></label>
          <label class="option-line muted"><input type="checkbox" /> <span>预留触控板手势扩展位</span></label>
        </section>`
              : currentSection === "shortcut"
                ? `
        <section class="content-block">
          <h2>当前可用快捷键</h2>
          <div class="shortcut-grid">
            <div class="shortcut-row"><strong>Ctrl/Cmd + T</strong><span>新建标签页</span></div>
            <div class="shortcut-row"><strong>Ctrl/Cmd + W</strong><span>关闭当前标签页</span></div>
            <div class="shortcut-row"><strong>Ctrl/Cmd + ,</strong><span>打开设置页</span></div>
            <div class="shortcut-row"><strong>Ctrl/Cmd + H</strong><span>打开历史记录页</span></div>
            <div class="shortcut-row"><strong>F5</strong><span>刷新当前页面</span></div>
            <div class="shortcut-row"><strong>F12</strong><span>打开 / 关闭停靠式 DevTools</span></div>
          </div>
        </section>`
                : currentSection === "advanced"
                  ? `
        <section class="content-block">
          <h2>运行时与兼容策略</h2>
          <div class="stat-grid">
            <article class="stat-card"><span>运行环境</span><strong>${runtimeInfoSnapshot.environmentLabel}</strong></article>
            <article class="stat-card"><span>GPU 标签</span><strong>${runtimeInfoSnapshot.gpuLabel}</strong></article>
            <article class="stat-card"><span>DBus 噪声抑制</span><strong>${runtimeInfoSnapshot.dbusNoiseSuppressed ? "已启用" : "未启用"}</strong></article>
          </div>
          <div class="callout">${runtimeInfoSnapshot.gpuReason}</div>
        </section>`
                  : currentSection === "lab"
                    ? `
        <section class="content-block">
          <h2>实验功能</h2>
          <label class="option-line muted"><input type="checkbox" /> <span>预留实验性页面承载模式</span></label>
          <label class="option-line muted"><input type="checkbox" /> <span>预留更多内部工具页</span></label>
          <div class="callout">实验区默认只做说明位，不影响当前基础浏览链路。</div>
        </section>`
                    : `
        <section class="content-block">
          <h2>隐私与数据范围</h2>
          <div class="stat-grid">
            <article class="stat-card"><span>历史记录条数</span><strong>${history.length}</strong></article>
            <article class="stat-card"><span>存储位置</span><strong>userData/browser-history.json</strong></article>
            <article class="stat-card"><span>记录范围</span><strong>仅 http / https</strong></article>
          </div>
          <div class="callout">内置页、data 页和失败页不会进入历史。减少噪音，也避免把壳内部跳转当成真实浏览轨迹。</div>
          <div class="inline-row"><a class="link-button" href="${INTERNAL_HISTORY_URL}">查看历史记录</a></div>
        </section>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>设置</title>
    <style>
      :root {
        color-scheme: ${theme.resolved};
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        --bg: ${isDark ? "#121a23" : "#f7f9fc"};
        --sidebar-bg: ${isDark ? "#151f2a" : "#ffffff"};
        --content-bg: ${isDark ? "#121a23" : "#ffffff"};
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

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--text);
        background: var(--bg);
      }

      .page {
        display: grid;
        grid-template-columns: 244px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar {
        padding: 18px 0 22px;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .sidebar-title {
        padding: 0 18px 14px;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: ${isDark ? "#d6deea" : "#687789"};
      }

      .sidebar-search {
        padding: 0 18px 14px;
      }

      .sidebar-search input,
      .top-search input,
      .homepage-input,
      .select-field {
        width: 100%;
        height: 34px;
        padding: 0 12px;
        color: var(--text);
        background: var(--input-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
        outline: none;
      }

      .sidebar-search input::placeholder,
      .top-search input::placeholder {
        color: var(--muted);
      }

      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 18px;
        font-size: 14px;
        color: var(--muted);
        text-decoration: none;
      }

      .nav-item.active {
        color: var(--accent-text);
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
      }

      .nav-dot {
        display: inline-flex;
        width: 8px;
        height: 8px;
        background: currentcolor;
        border-radius: 999px;
        opacity: 0.78;
      }

      .content {
        padding: 20px 30px 60px;
        background: var(--content-bg);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
      }

      .top-search {
        width: 190px;
      }

      .ghost-button,
      .inline-button {
        height: 34px;
        padding: 0 14px;
        color: var(--muted);
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
        cursor: default;
      }

      .ghost-button:hover,
      .inline-button:hover {
        background: var(--button-hover);
      }

      .section {
        max-width: 920px;
        margin-bottom: 36px;
      }

      .section-lead {
        margin: 0 0 18px;
        color: var(--muted);
        line-height: 1.7;
      }

      .content-block {
        max-width: 920px;
        margin-bottom: 18px;
        padding: 18px 20px;
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 14px;
      }

      .section h2,
      .content-block h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .section-note,
      .block-note {
        margin: 8px 0 16px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }

      .option-line,
      .checkbox-line,
      .radio-line {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 12px;
        font-size: 14px;
        color: var(--text);
      }

      .radio-line input,
      .checkbox-line input {
        margin-top: 3px;
      }

      .field-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .inline-row {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        margin: 10px 0 2px;
      }

      .compact-row {
        margin-top: 0;
      }

      .field-label {
        width: 84px;
        color: var(--muted);
      }

      .text-field {
        width: 180px;
        height: 34px;
        padding: 0 12px;
        color: var(--text);
        background: var(--input-bg);
        border: 1px solid var(--line);
        border-radius: 6px;
      }

      .text-field-wide {
        width: min(420px, 100%);
      }

      .stat-grid,
      .shortcut-grid {
        display: grid;
        gap: 12px;
      }

      .stat-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-top: 12px;
      }

      .stat-card,
      .shortcut-row {
        padding: 14px 16px;
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 10px;
      }

      .stat-card span {
        display: block;
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 12px;
      }

      .stat-card strong,
      .shortcut-row strong {
        font-size: 14px;
      }

      .shortcut-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .shortcut-row span {
        color: var(--muted);
        text-align: right;
      }

      .callout {
        margin-top: 14px;
        padding: 12px 14px;
        color: var(--muted);
        background: var(--button-bg);
        border: 1px dashed var(--line);
        border-radius: 10px;
        line-height: 1.7;
      }

      .link-button {
        display: inline-flex;
        align-items: center;
        height: 34px;
        padding: 0 14px;
        color: var(--accent-text);
        text-decoration: none;
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
        border-radius: 8px;
      }

      .homepage-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 4px;
      }

      .homepage-input {
        width: min(420px, 100%);
      }

      .placeholder-panel {
        width: min(620px, 100%);
        min-height: 58px;
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 6px;
      }

      .muted {
        color: var(--muted);
      }

      .inline-note {
        color: var(--muted);
        font-size: 13px;
      }

      .theme-footnote {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media (width <= 960px) {
        .page {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: none;
          border-bottom: 1px solid var(--line);
        }

        .content {
          padding: 20px 18px 42px;
        }

        .topbar,
        .homepage-row {
          flex-direction: column;
          align-items: stretch;
        }

        .top-search {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">选项</div>
        <div class="sidebar-search">
          <input type="text" placeholder="搜索设置" />
        </div>
        <nav class="nav">
          ${navMarkup}
        </nav>
      </aside>

      <section class="content">
        <div class="topbar">
          <div class="top-search">
            <input type="text" placeholder="搜索设置" />
          </div>
          <button class="ghost-button" type="button">恢复默认设置</button>
        </div>

        <section class="section">
          <h2>${currentMeta.label}</h2>
          <p class="section-lead">${currentMeta.summary}</p>
          ${sectionContent}
          <div class="theme-footnote">当前主题来源：${theme.source} · 实际生效：${theme.resolved}。如果使用 <strong>system</strong>，页面会跟随系统主题自动刷新。</div>
        </section>
      </section>
    </main>
  </body>
</html>`;
}

export function createInternalPageHtml(
  url: string,
  theme: ThemeSnapshot,
  state: BrowserShellState,
  history: BrowserHistoryEntry[],
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
    return createExtensionsPageHtml(theme);
  }

  if (isHistoryUrl(url)) {
    return createHistoryPageHtml(theme, history);
  }

  return `<!doctype html><html><head><meta charset="UTF-8" /><title>内部页面</title></head><body></body></html>`;
}

export function createInternalPageDataUrl(
  url: string,
  theme: ThemeSnapshot,
  state: BrowserShellState,
  history: BrowserHistoryEntry[],
) {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createInternalPageHtml(url, theme, state, history))}`;
}
