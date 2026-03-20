# 01-纯Chrome壳项目初始化

## 背景

当前 `video-downloader` 已经承载了下载器业务、浏览器壳、授权、任务中心等多类能力。为了避免浏览器基础能力验证与业务功能耦合，需要单独拆出一个前置项目，专门验证“纯 Chrome 风格 Electron 浏览器壳”的最小可行方案。

该前置项目命名为 `electron-chrome`，作为 `video-downloader` 的打头阵项目，重点验证浏览器基础能力与跨平台打包可行性。

## 用户故事

- 作为产品/开发者，我希望有一个纯净的浏览器壳实验场，便于验证标签切换、网页承载、DevTools 和菜单行为。
- 作为桌面端开发者，我希望该项目使用 TypeScript 与标准打包脚本，避免只停留在脚本 demo 水平。
- 作为后续 `video-downloader` 的维护者，我希望该项目的验证结论可直接迁移到主项目，降低试错成本。

## 功能范围

### 本次范围

- Electron + TypeScript 项目初始化
- 单窗口多标签浏览器壳
- 地址栏导航与 URL 规范化
- 原生菜单
- 页面右键菜单
- 停靠式 DevTools 容器
- Vite 开发模式
- electron-builder 打包脚本
- 文档、设计文档、原型页齐备

### 非目标

- 下载器业务
- 会员/授权能力
- 视频站点适配
- 下载任务中心
- 复杂主题系统
- 同步 `video-downloader` 全部 UI

## 模块清单

1. 主进程窗口与页面视图管理
2. 标签状态管理
3. 渲染层浏览器壳 UI
4. 菜单与快捷键
5. 停靠式 DevTools 面板
6. 项目构建与打包配置
7. 文档与原型体系

## 数据流 / 状态说明

- 主进程维护 tabs、activeTabId、dockPosition、devtoolsVisible 等核心状态。
- 预加载脚本暴露 `dockedShell` API 给渲染层。
- 渲染层负责展示 tabs、地址栏、导航按钮，并把用户操作通过 IPC 回传主进程。
- 主进程通过 `docked-shell:state` 广播状态快照，驱动渲染层刷新。

## API / IPC 约定

- `docked-shell:get-state`
- `docked-shell:new-tab`
- `docked-shell:activate-tab`
- `docked-shell:close-tab`
- `docked-shell:navigate`
- `docked-shell:go-back`
- `docked-shell:go-forward`
- `docked-shell:reload`

## 验收标准

- 项目目录为标准 TypeScript 结构，不再保留旧的 JS 双入口 demo 作为主路径。
- 运行 `pnpm dev` 可以启动浏览器壳。
- 运行 `pnpm type-check` 无类型错误。
- 运行 `pnpm build` 可以完成前端与 Electron 产物构建，并触发 electron-builder 打包流程。
- 存在 `app:dir`、`app:dist`、`app:win`、`app:win:portable`、`app:win:installer` 等脚本。
- 文档路径完整：`docs/requirements/`、`.easydesign/design_docs/`、`.easydesign/design_html/`。

## 与 video-downloader 的协作关系

- `electron-chrome` 负责先行验证 Chrome 风格壳层能力。
- `video-downloader` 负责承接业务化浏览器场景与下载器能力。
- 当 `electron-chrome` 验证某项机制稳定后，再向 `video-downloader` 回灌，不在主项目里盲目试验。
