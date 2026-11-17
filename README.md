# SilverBu11et

B1n_ 的营地：技术文章与个人感悟。基于 [Astro](https://astro.build) 的静态博客，像素风主题。

## 本地运行

```bash
pnpm install
pnpm dev        # http://localhost:4321 ，草稿可见
pnpm build      # 构建到 dist/，并用 Pagefind 生成搜索索引
pnpm preview    # 预览构建结果（搜索只在这里能用）
```

## 写一篇文章

在 `src/content/posts/` 新建一个 `.md` 文件，**文件名就是网址**：`hello-world.md` → `/posts/hello-world/`。
可以直接复制 `template-musing.md`（感悟）或 `template-tech.md`（技术）。

```yaml
---
title: 标题
date: 2026-11-17
description: 列表和 RSS 里显示的一句话摘要
kind: 感悟            # 主标签，只能是「感悟」或「技术」
tags: [生活, 读书]     # 自由标签
series: pixel-camp    # 可选，对应 src/content/series.json 里的 id
seriesOrder: 1        # 可选，在系列中的顺序
updated: 2026-11-18   # 可选，修订日期
draft: true           # true 时只在 pnpm dev 里可见，不会发布
---
```

正文支持 Markdown / MDX、代码高亮、`$行内公式$` 和 `$$独立公式$$`。
写完把 `draft` 改成 `false`，`git push` 后自动发布。

以下划线开头的文件（如 `_notes.md`）不会被当作文章。

## 改个人信息

- 站名、称呼、签名、GitHub：`src/consts.ts`
- 关于页的自我介绍和「角色面板」：`src/components/AboutBlock.astro`（搜索【待填写】）
- 系列列表：`src/content/series.json`

## 目录

```
src/
  content/posts/      文章
  content/series.json 系列
  components/         页面组件（Hero 场景、文章列表、搜索…）
  scripts/scene.ts    首页像素场景（代码绘制，黄昏/夜晚随主题切换）
  lib/sprites.ts      像素小图（旅人、灯笼、锤子…）
  styles/             全局样式与正文排版
```

## 部署（Cloudflare Pages）

Cloudflare Pages 连接本仓库，构建设置：

| 项         | 值           |
| ---------- | ------------ |
| 框架预设   | Astro        |
| 构建命令   | `pnpm build` |
| 输出目录   | `dist`       |
| 环境变量   | `NODE_VERSION=24` |

之后每次推送到 `main` 都会自动构建发布。

## 字体

- 像素字：[Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font)（OFL）
- 正文：[霞鹜文楷屏幕版](https://github.com/lxgw/LxgwWenKai-Screen)（OFL）
- 代码：[JetBrains Mono](https://www.jetbrains.com/lp/mono/)（OFL）
