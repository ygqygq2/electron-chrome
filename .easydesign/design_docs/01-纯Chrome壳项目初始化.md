# 01-纯Chrome壳项目初始化设计

## 设计目标

为 `electron-chrome` 提供一个可持续演进的基础架构，而不是一次性 demo。

目标如下：

1. **结构清晰**：主进程、预加载、渲染层职责分离
2. **类型化**：统一使用 TypeScript
3. **可打包**：开发、构建、打包命令完整
4. **可验证**：聚焦标签切换、导航、DevTools、右键菜单等 Chrome 基础体验
5. **可迁移**：为 `video-downloader` 提供前置实验结论

## 信息架构

### 目录规划

- `docs/requirements/`：需求文档
- `.easydesign/design_docs/`：设计文档
- `.easydesign/design_html/`：高保真原型
- `electron/`：主进程与预加载脚本
- `src/renderer/`：渲染层页面与样式
- `public/`：静态资源（后续图标等）

## 模块设计

### 主进程

负责：

- 创建主窗口
- 创建 `WebContentsView` 页面实例
- 维护 tab 列表
- 维护停靠式 DevTools 容器
- 响应原生菜单、快捷键、IPC
- 广播状态快照给渲染层

### 预加载层

负责：

- 暴露受控 API 给渲染层
- 隔离 Electron/Node 能力
- 统一 IPC 调用接口

### 渲染层

负责：

- 顶部标签栏
- 地址栏与前进后退/刷新按钮
- 状态文案展示
- 与主进程状态快照同步

## 关键交互

### 标签切换

- 点击标签触发 `activate-tab`
- 主进程切换活动页面视图
- 同步更新标题、导航按钮状态、地址栏

### 地址导航

- 渲染层输入 URL 后进行规范化
- 发送 `navigate`
- 主进程驱动当前活动页加载
- 导航事件回写标签 URL / 标题 / 导航状态

### DevTools 停靠

- 主进程持有独立 `devtoolsView`
- 活动页 `webContents` 绑定到该 DevTools 容器
- 支持底部/左侧/右侧停靠

## 状态模型

```text
WindowState
├─ tabs[]
│  ├─ id
│  ├─ title
│  ├─ url
│  ├─ isLoading
│  ├─ canGoBack
│  └─ canGoForward
├─ activeTabId
├─ devtoolsVisible
└─ dockPosition
```

## 视觉设计原则

- 保持 Chrome 风格的顶部横向标签布局
- 工具栏保持一排完成主要操作
- 深色主题优先，突出“实验浏览器壳”定位
- 尽量减少装饰，优先体现功能与稳定性

## 验证重点

1. 标签切换是否顺畅
2. 页面加载与导航状态是否同步准确
3. DevTools 停靠切换是否稳定
4. 新标签页与右键检查元素是否可用
5. Windows 打包后行为是否与开发态一致
