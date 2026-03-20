# electron-chrome

`electron-chrome` 是一个纯 Chrome 风格的 Electron 浏览器壳项目。

它专注于浏览器基础能力本身，目标是提供一个清晰、可打包、可持续演进的 Electron Chrome 风格桌面壳实现。

## 项目目标

- 验证多标签浏览器壳的基础能力
- 验证原生菜单与快捷键行为
- 验证停靠式 DevTools 与检查元素链路
- 验证 Windows 打包产物与开发态的一致性
- 沉淀一个独立、可开源演进的浏览器壳基础项目

## 当前技术栈

- Electron 40
- TypeScript
- Vite
- electron-builder

## 目录结构

- `docs/requirements/`：需求文档
- `.easydesign/design_docs/`：设计文档
- `.easydesign/design_html/`：原型页面
- `electron/`：主进程与预加载脚本
- `src/renderer/`：渲染层页面与样式

## 常用命令

- `pnpm dev`：启动开发模式
- `pnpm type-check`：类型检查
- `pnpm lint`：代码检查
- `pnpm build`：构建并打包
- `pnpm app:dir`：输出目录包
- `pnpm app:win`：Windows nsis + portable
- `pnpm app:win:portable`：Windows portable
- `pnpm app:win:installer`：Windows 安装包

## 核心能力

- 多标签页管理
- 地址栏输入与 URL 规范化
- 原生菜单栏与快捷键
- 页面右键菜单
- 检查元素
- 停靠式 DevTools（底部 / 左侧 / 右侧）
- Linux / WSL 运行时自适应
- GPU 自动检测与兼容模式切换
- 更完整但更克制的深色浏览器壳 UI

## 项目方向

`electron-chrome` 聚焦这些浏览器壳基础问题：

- Tab 切换是否顺滑
- 页面承载方案是否稳定
- DevTools 绑定是否准确
- Windows 打包后行为是否正常
- Linux / WSL 下 GPU 与运行时噪声是否可控
- 菜单与壳层 UI 是否达到可展示水准

后续会围绕“更像 Chrome、但又保持 Electron 可控性”的方向持续演进。
