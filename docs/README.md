# electron-chrome 文档目录

本目录用于沉淀 `electron-chrome` 的需求、设计、验证结论。

## 目录说明

- `requirements/`：需求文档，定义项目目标、范围、验收标准

## 项目定位

`electron-chrome` 是 `video-downloader` 的前置验证项目，用来优先验证 Chrome 风格浏览器壳的基础能力，包括：

- 多标签切换
- 地址栏导航
- 原生菜单
- 停靠式 DevTools
- 页面右键菜单与检查元素
- Windows 打包与分发链路

当这些基础能力在该项目中验证稳定后，再有选择地回灌到 `video-downloader`。
