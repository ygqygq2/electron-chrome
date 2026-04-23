import type { ThemeSnapshot } from "../model.js";

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

      .actions {
        gap: 12px;
      }

      .theme-toggle {
        position: relative;
      }

      .theme-toggle-button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        color: var(--muted);
        cursor: pointer;
        background: var(--panel-strong);
        border: 1px solid var(--line);
        border-radius: 10px;
        transition: background 140ms ease, color 140ms ease, border-color 140ms ease, transform 140ms ease;
      }

      .theme-toggle-button:hover,
      .theme-toggle-button[data-open="true"] {
        color: var(--text);
        background: color-mix(in srgb, var(--panel-strong) 82%, var(--accent) 8%);
      }

      .theme-toggle-button:active {
        transform: translateY(1px);
      }

      .theme-icon {
        position: absolute;
        width: 18px;
        height: 18px;
        transition: transform 180ms ease, opacity 180ms ease;
      }

      .theme-icon.sun {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      .theme-icon.moon {
        opacity: 0;
        transform: rotate(90deg) scale(0.4);
      }

      html[data-theme="dark"] .theme-icon.sun {
        opacity: 0;
        transform: rotate(-90deg) scale(0.4);
      }

      html[data-theme="dark"] .theme-icon.moon {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      .theme-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 144px;
        padding: 6px;
        background: color-mix(in srgb, var(--panel-strong) 94%, transparent);
        border: 1px solid var(--line);
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
        backdrop-filter: blur(16px);
        z-index: 20;
      }

      .theme-menu.hidden {
        display: none !important;
      }

      .theme-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 36px;
        padding: 0 10px;
        color: var(--text);
        cursor: pointer;
        background: transparent;
        border: 0;
        border-radius: 8px;
        font-size: 14px;
        text-align: left;
      }

      .theme-menu-item:hover,
      .theme-menu-item[data-active="true"] {
        background: color-mix(in srgb, var(--accent) 12%, var(--panel-strong));
      }

      .theme-menu-item[data-active="true"] {
        color: var(--accent);
        font-weight: 600;
      }

      .theme-menu-check {
        font-size: 12px;
        opacity: 0;
      }

      .theme-menu-item[data-active="true"] .theme-menu-check {
        opacity: 1;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
          <div class="theme-toggle">
            <button id="themeToggleButton" class="theme-toggle-button" type="button" aria-haspopup="menu" aria-expanded="false" title="切换主题">
              <svg class="theme-icon sun" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" fill="currentColor"></circle>
                <path d="M12 2.6v2.2M12 19.2v2.2M4.6 12H2.4M21.6 12h-2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              </svg>
              <svg class="theme-icon moon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.2 14.1a8.4 8.4 0 1 1-10.3-10.3 7.1 7.1 0 0 0 10.3 10.3Z" fill="currentColor"></path>
              </svg>
              <span class="sr-only">切换主题</span>
            </button>
            <div id="themeMenu" class="theme-menu hidden" role="menu" aria-label="切换主题">
              <button class="theme-menu-item" type="button" data-theme-source="light" role="menuitem"><span>浅色</span><span class="theme-menu-check">✓</span></button>
              <button class="theme-menu-item" type="button" data-theme-source="dark" role="menuitem"><span>深色</span><span class="theme-menu-check">✓</span></button>
              <button class="theme-menu-item" type="button" data-theme-source="system" role="menuitem"><span>跟随系统</span><span class="theme-menu-check">✓</span></button>
            </div>
          </div>
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
        <div style="color: var(--muted); font-size: 13px;">可在这里查看下载进度、打开文件、定位目录或重新下载。</div>
      </footer>
    </main>

    <script>
      (function () {
        const listEl = document.getElementById("list");
        const emptyEl = document.getElementById("empty");
        const statsEl = document.getElementById("stats");
        const searchInput = document.getElementById("searchInput");
        const themeToggleButton = document.getElementById("themeToggleButton");
        const themeMenu = document.getElementById("themeMenu");
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
          if (item.state === "completed" && item.existsOnDisk) return { text: "已完成 · 文件安全可打开", className: "success" };
          if (item.state === "completed" && !item.existsOnDisk) return { text: "文件已删除 · 可重新下载", className: "warning" };
          if (item.state === "interrupted") return { text: "下载中断 · 可尝试重新下载", className: "danger" };
          if (item.state === "cancelled") return { text: "已取消 · 可重新下载", className: "warning" };
          if (item.state === "paused") return { text: "已暂停", className: "warning" };
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
          const theme = currentState.theme || { source: "system", resolved: "light" };
          document.documentElement.dataset.theme = theme.resolved || "light";
          document.documentElement.dataset.themeSource = theme.source || "system";
          if (themeMenu instanceof HTMLElement) {
            themeMenu.querySelectorAll("[data-theme-source]").forEach(function (element) {
              if (element instanceof HTMLElement) {
                element.dataset.active = element.getAttribute("data-theme-source") === theme.source ? "true" : "false";
              }
            });
          }
        }

        function isThemeMenuOpen() {
          return themeMenu instanceof HTMLElement && !themeMenu.classList.contains("hidden");
        }

        function setThemeMenuOpen(open) {
          if (!(themeMenu instanceof HTMLElement) || !(themeToggleButton instanceof HTMLElement)) return;
          themeMenu.classList.toggle("hidden", !open);
          themeToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
          themeToggleButton.dataset.open = open ? "true" : "false";
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
          const completedCount = items.filter((item) => item.state === "completed").length;
          const activeCount = items.filter((item) => item.state === "progressing" || item.state === "paused").length;
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
            emptyEl.innerHTML = searchKeyword ? "没有找到匹配的下载项。<br />换个关键词试试。" : "暂无下载记录。<br />去网页里下载一个文件，再回来看看，这里就不会空着了。";
            return;
          }

          emptyEl.classList.add("hidden");
          listEl.innerHTML = items.map(function (item) {
            const status = formatStatus(item);
            const meta = formatBytes(item.totalBytes || item.receivedBytes) + " · " + escapeHtml(item.sourceUrl || "");
            const openActions = item.existsOnDisk && item.state === "completed"
              ? '<button class="link" data-action="open" data-id="' + escapeHtml(item.id) + '">打开</button><button class="link" data-action="folder" data-id="' + escapeHtml(item.id) + '">打开文件夹</button>'
              : '<button class="link" data-action="retry" data-id="' + escapeHtml(item.id) + '">重新下载</button>';
            const removable = item.state !== "progressing" && item.state !== "paused"
              ? '<button class="muted-link" data-action="remove" data-id="' + escapeHtml(item.id) + '">×</button>'
              : '';
            return '<article class="row"><div class="file-icon">' + escapeHtml(resolveFileTag(item)) + '</div><div class="main"><div class="name">' + escapeHtml(item.fileName || "未命名文件") + '</div><div class="meta">' + meta + '</div><div class="status ' + escapeHtml(status.className) + '">' + escapeHtml(status.text) + '</div></div><div class="row-actions">' + openActions + removable + '</div></article>';
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

        if (themeToggleButton instanceof HTMLElement) {
          themeToggleButton.addEventListener("click", function (event) {
            event.stopPropagation();
            setThemeMenuOpen(!isThemeMenuOpen());
          });
        }

        if (themeMenu instanceof HTMLElement) {
          themeMenu.addEventListener("click", function (event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const item = target.closest("[data-theme-source]");
            const themeSource = item instanceof HTMLElement ? item.getAttribute("data-theme-source") : null;
            if (!themeSource) return;
            window.downloadsPopup.setThemeSource(themeSource);
            setThemeMenuOpen(false);
          });
        }

        document.addEventListener("click", function (event) {
          const target = event.target;
          if (!(target instanceof Node)) return;
          if (themeMenu instanceof HTMLElement && themeMenu.contains(target)) return;
          if (themeToggleButton instanceof HTMLElement && themeToggleButton.contains(target)) return;
          setThemeMenuOpen(false);
        });

        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape") setThemeMenuOpen(false);
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
