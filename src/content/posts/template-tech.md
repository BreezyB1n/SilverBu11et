---
# 「技术」模板：复制这个文件，改文件名（= 网址），再把 draft 改成 false 即可发布。
title: 用 Astro 搭一座像素营地
date: 2026-11-16
updated: 2026-11-17
description: 技术文章模板，演示代码高亮、公式、表格和系列。
kind: 技术
tags: [Astro, 前端, 模板]
series: pixel-camp # 可选：对应 src/content/series.json 里的 id
seriesOrder: 1 # 在系列中的顺序（第几关）
draft: true
---

这是一篇**技术**模板，只在本地 `pnpm dev` 时可见。

## 代码块

代码块右上角会显示语言名，明暗主题各有一套配色：

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
});

export const collections = { posts };
```

行内代码长这样：`pnpm dev`。

## 数学公式

行内公式 $E = mc^2$，独立公式：

$$
\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{n} e^{x_j}}
$$

## 表格

| 命令         | 作用                     |
| ------------ | ------------------------ |
| `pnpm dev`   | 本地预览（含草稿）       |
| `pnpm build` | 构建站点并生成搜索索引   |

### 三级标题

1. 有序列表的序号是像素字
2. 第二步
3. 第三步
