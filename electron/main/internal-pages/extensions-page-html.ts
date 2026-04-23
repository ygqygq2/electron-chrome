import type { ThemeSnapshot } from "../model.js";

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
