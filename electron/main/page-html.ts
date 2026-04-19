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

import { formatHistoryTime } from "./local-persistence.js";

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

export function createHistoryPageHtml(theme: ThemeSnapshot, history: BrowserHistoryEntry[]) {
  const isDark = theme.resolved === "dark";
  const historyRows = history
    .slice(0, 80)
    .map(
      (entry, index) => `
        <article class="history-row">
          <div class="history-index">${index + 1}</div>
          <div class="history-main">
            <a class="history-title" href="${entry.url}">${entry.title}</a>
            <div class="history-url">${entry.url}</div>
          </div>
          <time class="history-time">${formatHistoryTime(entry.visitedAt)}</time>
        </article>`,
    )
    .join("");

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
        --bg: ${isDark ? "#0f151d" : "#f5f8fc"};
        --panel: ${isDark ? "#141d28" : "#ffffff"};
        --line: ${isDark ? "#233242" : "#e2e9f1"};
        --text: ${isDark ? "#edf3fb" : "#1f2730"};
        --muted: ${isDark ? "#74889f" : "#748396"};
        --accent: ${isDark ? "#7fb5ff" : "#2d7ff3"};
        --soft: ${isDark ? "#182330" : "#f7fbff"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 28px; color: var(--text); background: linear-gradient(180deg, var(--bg), ${isDark ? "#111923" : "#f8fbff"}); }
      .shell { max-width: 1040px; margin: 0 auto; }
      .hero { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
      .hero h1 { margin: 0; font-size: 30px; font-weight: 700; }
      .hero-note { margin-top: 8px; color: var(--muted); line-height: 1.7; }
      .pill { display: inline-flex; align-items: center; height: 34px; padding: 0 14px; color: var(--accent); background: var(--soft); border: 1px solid var(--line); border-radius: 999px; }
      .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
      .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; background: ${isDark ? "rgba(255,255,255,0.02)" : "#fbfdff"}; border-bottom: 1px solid var(--line); }
      .panel-head strong { font-size: 15px; }
      .panel-head span { color: var(--muted); font-size: 13px; }
      .history-row { display: grid; grid-template-columns: 52px minmax(0, 1fr) 166px; gap: 16px; align-items: center; padding: 16px 18px; border-top: 1px solid var(--line); }
      .history-row:first-of-type { border-top: 0; }
      .history-index { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: var(--muted); background: var(--soft); border-radius: 12px; font-size: 13px; }
      .history-main { min-width: 0; }
      .history-title { color: var(--text); font-weight: 600; text-decoration: none; }
      .history-title:hover { color: var(--accent); }
      .history-url { margin-top: 6px; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .history-time { color: var(--muted); font-size: 13px; text-align: right; }
      .empty { padding: 42px 18px; color: var(--muted); text-align: center; line-height: 1.8; }
      @media (width <= 820px) {
        body { padding: 18px; }
        .hero,
        .panel-head,
        .history-row { display: flex; flex-direction: column; align-items: flex-start; }
        .history-time { text-align: left; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div>
          <h1>历史记录</h1>
          <div class="hero-note">这里展示当前 Electron Chrome 记录到的最近访问页面。参考的是浏览器常见信息架构，但视觉细节做了独立整理，避免直接照抄第三方产品。</div>
        </div>
        <div class="pill">最近记录 ${history.length} 条</div>
      </section>
      <section class="panel">
        <header class="panel-head">
          <div>
            <strong>最近访问</strong>
            <span>仅记录 http / https 页面；内置页与失败页不会写入。</span>
          </div>
          <span>地址栏输入 chrome://history 可再次打开本页</span>
        </header>
        ${historyRows || '<div class="empty">暂无历史记录。<br />先访问几个外部网页，再回来看看，这里就不再冷清了。</div>'}
      </section>
    </main>
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
          <label class="option-line"><input type="checkbox" ${toolbarPreferences.restoreClosedTab.visible ? "checked" : ""} /> <span>恢复关闭标签按钮 · ${toolbarPreferences.restoreClosedTab.placement === "left" ? "左侧" : "右侧"}</span></label>
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
