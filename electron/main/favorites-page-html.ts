import type { FavoritesStateSnapshot, ThemeSnapshot } from "./model.js";

function escapeHtml(value: string | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createFavoritesPageHtml(
  theme: ThemeSnapshot,
  favoritesState: FavoritesStateSnapshot,
) {
  const isDark = theme.resolved === "dark";
  const favoritesPayload = JSON.stringify(favoritesState)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const initialFolder = favoritesState.folders[0] ?? "收藏栏";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>收藏夹</title>
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
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--text); background: var(--bg); }
      .page { display: grid; grid-template-columns: 252px minmax(0, 1fr); min-height: 100vh; }
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
      .sidebar-meta,
      .sidebar-actions {
        padding: 0 18px 14px;
      }
      .sidebar-search input,
      .top-search input {
        width: 100%;
        height: 36px;
        padding: 0 12px;
        color: var(--text);
        background: var(--input-bg);
        border: 1px solid var(--line);
        border-radius: 8px;
        outline: none;
      }
      .sidebar-meta {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.7;
      }
      .sidebar-actions {
        display: grid;
        gap: 8px;
      }
      .side-button,
      .toolbar-button,
      .row-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 36px;
        padding: 0 14px;
        color: var(--text);
        background: var(--button-bg);
        border: 1px solid var(--line);
        border-radius: 8px;
        cursor: pointer;
      }
      .side-button:hover,
      .toolbar-button:hover,
      .row-button:hover { background: var(--button-hover); }
      .toolbar-button.primary {
        color: var(--accent-text);
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
        border-color: transparent;
      }
      .folders {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: calc(100vh - 250px);
        padding: 0 12px 0 18px;
        overflow: auto;
      }
      .folder-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 9px 12px;
        color: var(--muted);
        background: transparent;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
      }
      .folder-item:hover { background: var(--button-hover); }
      .folder-item.active {
        color: var(--accent-text);
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%);
      }
      .folder-count { opacity: 0.74; font-size: 12px; }
      .content { padding: 20px 30px 60px; background: var(--content-bg); }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }
      .top-search { width: min(320px, 100%); }
      .toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .section { max-width: 1080px; }
      .title { margin: 0; font-size: 24px; }
      .lead { margin: 8px 0 0; color: var(--muted); line-height: 1.7; }
      .stats {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin: 18px 0;
        padding: 10px 14px;
        color: var(--muted);
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 10px;
      }
      .list {
        overflow: hidden;
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 14px;
      }
      .header,
      .row {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) 180px 260px;
        gap: 14px;
        align-items: center;
        padding: 14px 18px;
      }
      .header {
        color: var(--muted);
        background: var(--button-bg);
        border-bottom: 1px solid var(--line);
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .row { border-top: 1px solid var(--line); }
      .row:first-child { border-top: 0; }
      .row:hover { background: var(--button-hover); }
      .name-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .favicon,
      .favicon-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        overflow: hidden;
        border-radius: 6px;
        background: var(--button-bg);
        border: 1px solid var(--line);
        flex: 0 0 auto;
      }
      .favicon img { width: 18px; height: 18px; object-fit: contain; }
      .favicon-fallback { color: var(--muted); font-size: 11px; font-weight: 700; }
      .bookmark-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
      .subline { margin-top: 4px; color: var(--muted); font-size: 12px; }
      .url-cell,
      .folder-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 13px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .empty {
        padding: 56px 18px;
        color: var(--muted);
        text-align: center;
        line-height: 1.9;
      }
      @media (width <= 1100px) {
        .header,
        .row {
          grid-template-columns: minmax(0, 1fr);
        }
        .actions { justify-content: flex-start; }
      }
      @media (width <= 960px) {
        .page { grid-template-columns: 1fr; }
        .sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
        .content { padding: 20px 18px 42px; }
        .topbar { flex-direction: column; align-items: stretch; }
        .top-search { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">收藏夹</div>
        <div class="sidebar-search">
          <input id="sidebarSearchInput" type="text" placeholder="筛选收藏" />
        </div>
        <div class="sidebar-meta">这版先把真正可用的收藏链路补齐：收藏当前页、打开收藏、编辑、删除、轻量文件夹管理，先求顺手，再谈更重的同步体系。</div>
        <div class="sidebar-actions">
          <button id="addCurrentButton" class="side-button" type="button">收藏当前标签页</button>
          <button id="createFolderButton" class="side-button" type="button">新建文件夹</button>
        </div>
        <div id="folders" class="folders"></div>
      </aside>

      <section class="content">
        <div class="topbar">
          <div>
            <h1 id="title" class="title">${escapeHtml(initialFolder)}</h1>
            <p class="lead">轻量收藏管理页，支持当前页收藏、在新标签打开、编辑和删除。</p>
          </div>
          <div class="toolbar-actions">
            <div class="top-search">
              <input id="topSearchInput" type="text" placeholder="搜索标题或网址" />
            </div>
            <button id="createBookmarkButton" class="toolbar-button primary" type="button">新建收藏</button>
          </div>
        </div>

        <section class="section">
          <div id="stats" class="stats">准备中…</div>
          <div class="list">
            <div class="header">
              <span>名称</span>
              <span>网址</span>
              <span>文件夹</span>
              <span style="text-align:right;">操作</span>
            </div>
            <div id="list"></div>
          </div>
        </section>
      </section>
    </main>

    <script>
      (function () {
        const favoritesState = ${favoritesPayload};
        const foldersEl = document.getElementById("folders");
        const listEl = document.getElementById("list");
        const statsEl = document.getElementById("stats");
        const titleEl = document.getElementById("title");
        const topSearchInput = document.getElementById("topSearchInput");
        const sidebarSearchInput = document.getElementById("sidebarSearchInput");
        const addCurrentButton = document.getElementById("addCurrentButton");
        const createFolderButton = document.getElementById("createFolderButton");
        const createBookmarkButton = document.getElementById("createBookmarkButton");
        let selectedFolder = ${JSON.stringify(initialFolder)};
        let keyword = "";

        function escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function getDomain(url) {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        }

        function getFavicon(url) {
          try {
            return new URL("/favicon.ico", new URL(url).origin).toString();
          } catch {
            return "";
          }
        }

        function syncKeywordInputs(nextKeyword) {
          topSearchInput.value = nextKeyword;
          sidebarSearchInput.value = nextKeyword;
        }

        function getFilteredEntries() {
          const normalizedKeyword = keyword.trim().toLowerCase();
          return (favoritesState.entries || []).filter(function (entry) {
            const inFolder = !selectedFolder || entry.folder === selectedFolder;
            if (!inFolder) {
              return false;
            }
            if (!normalizedKeyword) {
              return true;
            }
            return String(entry.title || "").toLowerCase().includes(normalizedKeyword)
              || String(entry.url || "").toLowerCase().includes(normalizedKeyword);
          });
        }

        function getFolderCount(folder) {
          return (favoritesState.entries || []).filter(function (entry) {
            return entry.folder === folder;
          }).length;
        }

        function navigateToAction(path, params) {
          const search = new URLSearchParams(params || {});
          const query = search.toString();
          window.location.href = "chrome://favorites/" + path + (query ? "?" + query : "");
        }

        function renderFolders() {
          foldersEl.innerHTML = (favoritesState.folders || []).map(function (folder) {
            const activeClass = folder === selectedFolder ? " active" : "";
            return ''
              + '<button class="folder-item' + activeClass + '" type="button" data-folder="' + escapeHtml(folder) + '">'
              + '<span>' + escapeHtml(folder) + '</span>'
              + '<span class="folder-count">' + getFolderCount(folder) + '</span>'
              + '</button>';
          }).join('');
        }

        function renderList() {
          const entries = getFilteredEntries();
          titleEl.textContent = selectedFolder || "收藏夹";
          statsEl.textContent = "共 " + (favoritesState.entries || []).length + " 条收藏 · 当前文件夹 " + getFolderCount(selectedFolder) + " 条 · 当前显示 " + entries.length + " 条";

          if (!entries.length) {
            listEl.innerHTML = '<div class="empty">' + (keyword
              ? '没有匹配的收藏。<br />换个关键词试试。'
              : '当前文件夹还没有收藏。<br />可以先收藏当前标签页，或者手动新建一条。') + '</div>';
            return;
          }

          listEl.innerHTML = entries.map(function (entry) {
            const favicon = getFavicon(entry.url);
            const faviconMarkup = favicon
              ? '<span class="favicon"><img src="' + escapeHtml(favicon) + '" alt="" /></span>'
              : '<span class="favicon-fallback">' + escapeHtml((getDomain(entry.url) || '网').slice(0, 1).toUpperCase()) + '</span>';
            return ''
              + '<article class="row">'
              + '  <div class="name-wrap">'
              + faviconMarkup
              + '    <div style="min-width:0;">'
              + '      <div class="bookmark-title">' + escapeHtml(entry.title || entry.url) + '</div>'
              + '      <div class="subline">' + escapeHtml(getDomain(entry.url)) + '</div>'
              + '    </div>'
              + '  </div>'
              + '  <div class="url-cell">' + escapeHtml(entry.url) + '</div>'
              + '  <div class="folder-cell">' + escapeHtml(entry.folder) + '</div>'
              + '  <div class="actions">'
              + '    <button class="row-button" type="button" data-action="open" data-url="' + escapeHtml(entry.url) + '">打开</button>'
              + '    <button class="row-button" type="button" data-action="open-new" data-url="' + escapeHtml(entry.url) + '">新标签</button>'
              + '    <button class="row-button" type="button" data-action="edit" data-id="' + escapeHtml(entry.id) + '">编辑</button>'
              + '    <button class="row-button" type="button" data-action="delete" data-id="' + escapeHtml(entry.id) + '">删除</button>'
              + '  </div>'
              + '</article>';
          }).join('');
        }

        function createBookmark() {
          const title = window.prompt("请输入收藏名称", "新收藏");
          if (title === null) return;
          const url = window.prompt("请输入网址", "https://");
          if (url === null) return;
          navigateToAction("create", {
            title,
            url,
            folder: selectedFolder || "收藏栏",
          });
        }

        function createFolder() {
          const name = window.prompt("请输入文件夹名称", "新建文件夹");
          if (!name) return;
          navigateToAction("folder/create", {
            parent: selectedFolder || "",
            name,
          });
        }

        function editBookmark(entry) {
          const title = window.prompt("编辑收藏名称", entry.title || entry.url);
          if (title === null) return;
          const url = window.prompt("编辑收藏网址", entry.url || "https://");
          if (url === null) return;
          const folder = window.prompt("编辑所属文件夹", entry.folder || selectedFolder || "收藏栏");
          if (folder === null) return;
          navigateToAction("edit/" + encodeURIComponent(entry.id), {
            title,
            url,
            folder,
          });
        }

        function removeBookmark(entry) {
          if (!window.confirm('确定删除「' + (entry.title || entry.url) + '」吗？')) {
            return;
          }
          navigateToAction("delete/" + encodeURIComponent(entry.id));
        }

        foldersEl.addEventListener("click", function (event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const button = target.closest("[data-folder]");
          const folder = button instanceof HTMLElement ? button.getAttribute("data-folder") : null;
          if (!folder) return;
          selectedFolder = folder;
          renderFolders();
          renderList();
        });

        listEl.addEventListener("click", function (event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const action = target.getAttribute("data-action");
          if (!action) return;

          const id = target.getAttribute("data-id");
          const url = target.getAttribute("data-url");
          const entry = (favoritesState.entries || []).find(function (item) {
            return item.id === id;
          });

          if (action === "open" && url) {
            window.location.href = url;
            return;
          }

          if (action === "open-new" && url) {
            window.open(url, "_blank");
            return;
          }

          if (action === "edit" && entry) {
            editBookmark(entry);
            return;
          }

          if (action === "delete" && entry) {
            removeBookmark(entry);
          }
        });

        topSearchInput.addEventListener("input", function () {
          keyword = topSearchInput.value || "";
          syncKeywordInputs(keyword);
          renderList();
        });

        sidebarSearchInput.addEventListener("input", function () {
          keyword = sidebarSearchInput.value || "";
          syncKeywordInputs(keyword);
          renderList();
        });

        addCurrentButton.addEventListener("click", function () {
          navigateToAction("add-current");
        });

        createFolderButton.addEventListener("click", createFolder);
        createBookmarkButton.addEventListener("click", createBookmark);

        renderFolders();
        renderList();
      })();
    </script>
  </body>
</html>`;
}
