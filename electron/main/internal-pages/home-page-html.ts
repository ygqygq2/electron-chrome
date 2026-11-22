import {
  INTERNAL_DOWNLOADS_URL,
  INTERNAL_EXTENSIONS_URL,
  INTERNAL_FAVORITES_URL,
  INTERNAL_HISTORY_URL,
  INTERNAL_SETTINGS_URL,
  type ThemeSnapshot,
} from "../model.js";

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
    { label: "收藏", icon: "藏", url: INTERNAL_FAVORITES_URL },
  ];
  const chips = [
    { label: "历史记录", url: INTERNAL_HISTORY_URL },
    { label: "收藏夹", url: INTERNAL_FAVORITES_URL },
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
        grid-template-columns: repeat(6, minmax(0, 92px));
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
          ${chips.map((chip) => `<a class="chip" href="${chip.url}">${chip.label}</a>`).join("")}
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
