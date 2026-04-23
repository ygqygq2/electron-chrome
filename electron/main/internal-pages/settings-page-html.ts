import {
  DEFAULT_URL,
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_SETTINGS_URL,
  SETTINGS_SECTIONS,
  type BrowserHistoryEntry,
  type RuntimeInfoSnapshot,
  type SettingsSection,
  type ThemeSnapshot,
  type ToolbarPreferences,
} from "../model.js";

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
            <article class="stat-card"><span>存储位置</span><strong>userData/browser-data.sqlite</strong></article>
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
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--text); background: var(--bg); }
      .page { display: grid; grid-template-columns: 244px minmax(0, 1fr); min-height: 100vh; }
      .sidebar { padding: 18px 0 22px; background: var(--sidebar-bg); border-right: 1px solid var(--line); box-shadow: var(--shadow); }
      .sidebar-title { padding: 0 18px 14px; font-size: 34px; font-weight: 500; letter-spacing: 0.02em; color: ${isDark ? "#d6deea" : "#687789"}; }
      .sidebar-search { padding: 0 18px 14px; }
      .sidebar-search input,.top-search input,.homepage-input,.select-field { width: 100%; height: 34px; padding: 0 12px; color: var(--text); background: var(--input-bg); border: 1px solid var(--line); border-radius: 6px; outline: none; }
      .sidebar-search input::placeholder,.top-search input::placeholder { color: var(--muted); }
      .nav { display: flex; flex-direction: column; gap: 2px; }
      .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; font-size: 14px; color: var(--muted); text-decoration: none; }
      .nav-item.active { color: var(--accent-text); background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%); }
      .nav-dot { display: inline-flex; width: 8px; height: 8px; background: currentcolor; border-radius: 999px; opacity: 0.78; }
      .content { padding: 20px 30px 60px; background: var(--content-bg); }
      .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
      .top-search { width: 190px; }
      .ghost-button,.inline-button { height: 34px; padding: 0 14px; color: var(--muted); background: var(--button-bg); border: 1px solid var(--line); border-radius: 6px; cursor: default; }
      .ghost-button:hover,.inline-button:hover { background: var(--button-hover); }
      .section { max-width: 920px; margin-bottom: 36px; }
      .section-lead { margin: 0 0 18px; color: var(--muted); line-height: 1.7; }
      .content-block { max-width: 920px; margin-bottom: 18px; padding: 18px 20px; background: var(--soft); border: 1px solid var(--line); border-radius: 14px; }
      .section h2,.content-block h2 { margin: 0; font-size: 18px; font-weight: 600; }
      .section-note,.block-note { margin: 8px 0 16px; color: var(--muted); font-size: 13px; line-height: 1.7; }
      .option-line,.checkbox-line,.radio-line { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; font-size: 14px; color: var(--text); }
      .radio-line input,.checkbox-line input { margin-top: 3px; }
      .field-stack { display: flex; flex-direction: column; gap: 10px; }
      .inline-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 10px 0 2px; }
      .compact-row { margin-top: 0; }
      .field-label { width: 84px; color: var(--muted); }
      .text-field { width: 180px; height: 34px; padding: 0 12px; color: var(--text); background: var(--input-bg); border: 1px solid var(--line); border-radius: 6px; }
      .text-field-wide { width: min(420px, 100%); }
      .stat-grid,.shortcut-grid { display: grid; gap: 12px; }
      .stat-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 12px; }
      .stat-card,.shortcut-row { padding: 14px 16px; background: var(--button-bg); border: 1px solid var(--line); border-radius: 10px; }
      .stat-card span { display: block; margin-bottom: 8px; color: var(--muted); font-size: 12px; }
      .stat-card strong,.shortcut-row strong { font-size: 14px; }
      .shortcut-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .shortcut-row span { color: var(--muted); text-align: right; }
      .callout { margin-top: 14px; padding: 12px 14px; color: var(--muted); background: var(--button-bg); border: 1px dashed var(--line); border-radius: 10px; line-height: 1.7; }
      .link-button { display: inline-flex; align-items: center; height: 34px; padding: 0 14px; color: var(--accent-text); text-decoration: none; background: linear-gradient(180deg, var(--accent) 0%, var(--accent-strong) 100%); border-radius: 8px; }
      .homepage-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
      .homepage-input { width: min(420px, 100%); }
      .placeholder-panel { width: min(620px, 100%); min-height: 58px; background: var(--soft); border: 1px solid var(--line); border-radius: 6px; }
      .muted { color: var(--muted); }
      .inline-note { color: var(--muted); font-size: 13px; }
      .theme-footnote { margin-top: 18px; color: var(--muted); font-size: 13px; }
      @media (width <= 960px) {
        .page { grid-template-columns: 1fr; }
        .sidebar { border-right: none; border-bottom: 1px solid var(--line); }
        .content { padding: 20px 18px 42px; }
        .topbar,.homepage-row { flex-direction: column; align-items: stretch; }
        .top-search { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <aside class="sidebar">
        <div class="sidebar-title">选项</div>
        <div class="sidebar-search"><input type="text" placeholder="搜索设置" /></div>
        <nav class="nav">${navMarkup}</nav>
      </aside>
      <section class="content">
        <div class="topbar">
          <div class="top-search"><input type="text" placeholder="搜索设置" /></div>
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
