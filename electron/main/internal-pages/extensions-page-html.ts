import type { ExtensionSnapshot } from "../extensions-controller.js";
import type { ThemeSnapshot } from "../model.js";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createExtensionsPageHtml(
  theme: ThemeSnapshot,
  extensions: ExtensionSnapshot[],
) {
  const isDark = theme.resolved === "dark";
  const cards = extensions
    .map((extension) => {
      const initial = (extension.name || "?").trim().charAt(0).toUpperCase();
      const statusLabel = extension.enabled ? "已启用" : "已停用";
      const toggleLabel = extension.enabled ? "停用" : "启用";

      return `
        <li class="extension-card${extension.enabled ? "" : " disabled"}">
          <span class="extension-icon">${escapeHtml(initial)}</span>
          <div class="extension-meta">
            <div class="extension-name">${escapeHtml(extension.name)}</div>
            <div class="extension-sub">v${escapeHtml(extension.version)} · Manifest V${extension.manifestVersion} · ${statusLabel}</div>
            <div class="extension-id" title="${escapeHtml(extension.path)}">ID: ${escapeHtml(extension.id)}</div>
          </div>
          <div class="extension-actions">
            <a class="action-button" href="chrome://extensions/toggle/${encodeURIComponent(extension.id)}">${toggleLabel}</a>
            <a class="action-button danger" href="chrome://extensions/remove/${encodeURIComponent(extension.id)}">卸载</a>
          </div>
        </li>`;
    })
    .join("");

  const emptyState = `
    <li class="empty-state">
      <p>还没有安装任何扩展。</p>
      <p>点击上方「加载未打包扩展」，选择包含 manifest.json 的扩展目录即可。扩展会在浏览器启动时自动恢复。</p>
    </li>`;

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
        --bg: ${isDark ? "#101821" : "#f3f7fb"};
        --panel: ${isDark ? "#18212c" : "#ffffff"};
        --line: ${isDark ? "#324255" : "#d6dee8"};
        --text: ${isDark ? "#edf2f7" : "#1f2328"};
        --muted: ${isDark ? "#93a1b1" : "#617283"};
        --accent: ${isDark ? "#8ab4f8" : "#1a73e8"};
        --danger: ${isDark ? "#f28b82" : "#d93025"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 36px 28px; color: var(--text); background: var(--bg); }
      .wrap { max-width: 880px; margin: 0 auto; }
      .card { padding: 24px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; }
      h1 { margin: 0; font-size: 26px; }
      .summary { margin: 8px 0 0; color: var(--muted); line-height: 1.7; }
      .toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin: 20px 0 6px; }
      .load-button {
        display: inline-flex;
        align-items: center;
        height: 36px;
        padding: 0 16px;
        color: #fff;
        text-decoration: none;
        font-size: 14px;
        background: var(--accent);
        border-radius: 9px;
      }
      .load-button:hover { filter: brightness(1.08); }
      .extensions { display: flex; flex-direction: column; gap: 12px; margin: 16px 0 0; padding: 0; list-style: none; }
      .extension-card {
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 14px;
      }
      .extension-card.disabled .extension-icon,
      .extension-card.disabled .extension-name { opacity: 0.55; }
      .extension-icon {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 44px;
        height: 44px;
        font-size: 19px;
        font-weight: 700;
        color: #fff;
        background: var(--accent);
        border-radius: 12px;
      }
      .extension-meta { flex: 1; min-width: 0; }
      .extension-name { font-size: 15px; font-weight: 600; }
      .extension-sub { margin-top: 3px; font-size: 12px; color: var(--muted); }
      .extension-id { margin-top: 2px; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .extension-actions { display: flex; flex: 0 0 auto; gap: 8px; }
      .action-button {
        display: inline-flex;
        align-items: center;
        height: 30px;
        padding: 0 12px;
        color: var(--accent);
        text-decoration: none;
        font-size: 13px;
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      .action-button:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
      .action-button.danger { color: var(--danger); }
      .action-button.danger:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
      .empty-state { padding: 32px 16px; color: var(--muted); text-align: center; list-style: none; }
      .empty-state p { margin: 6px 0; line-height: 1.7; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>扩展</h1>
        <p class="summary">已安装 ${extensions.length} 个扩展 · 扩展会注入网页内容脚本，浏览器启动时自动恢复。</p>
        <div class="toolbar">
          <span class="summary">支持 Manifest V2 / V3（未打包目录加载）</span>
          <a class="load-button" href="chrome://extensions/load">加载未打包扩展</a>
        </div>
        <ul class="extensions">
          ${extensions.length > 0 ? cards : emptyState}
        </ul>
      </section>
    </main>
  </body>
</html>`;
}
