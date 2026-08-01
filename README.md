# P1-Blog · 咸鱼的博客

静态个人博客：兴趣与学习随笔（计算机学习 / 日常分享 / 游戏）。
只需要 Node.js（≥18.17），依赖仅用于构建时图片压缩（sharp）。

## 快速开始

```bash
npm install            # 首次安装依赖（含图片压缩用的 sharp）
node build.js            # 生成 dist/（仅正式帖子）
node server.js           # 本地预览 http://localhost:3000
```

想看示例帖效果（本地专用，不会出现在正式构建里）：

```bash
node build.js --examples
node server.js
```

## 本地上传帖子

1. 在 `content/posts/` 新建 Markdown 文件（格式见下）
2. 运行 `node build.js`
3. 把 `dist/` 部署到 GitHub Pages / Cloudflare Pages

帖子格式（frontmatter + Markdown 正文）：

```markdown
---
title: 文章标题
date: 2026-08-01
category: 游戏              # 计算机学习 / 日常分享 / 游戏
subcategory: GTNH           # 可选：MC原版、GTNH、FPS、GALGAME、二游
tags: Minecraft, GTNH
excerpt: 一句话摘要（留空自动截取）
cover: images/cover.png     # 头图，可选
published: true
---

正文支持：**加粗**、*斜体*、`代码`、emoji 🎮、小标题（## 三级标题）、
列表、表格、引用、代码块，以及文间图 `![](images/xxx.png)`。
```

图片放在与文章同级的 `images/` 文件夹（构建时自动压缩为 WebP，
最长边 1600px，正文图自动带上宽高属性防止布局抖动）：

```text
content/posts/2026-08-01-gtnh-first-month/
├── 2026-08-01-gtnh-first-month.md
└── images/
    ├── cover.png
    └── screenshot.png
```

> `content/examples/` 里的示例帖只在本机用 `--examples` 预览，
> 正式构建和托管永远不包含它们。

## 部署到 GitHub Pages

仓库里已包含自动部署工作流（`.github/workflows/deploy.yml`），
你只需要把代码推到 GitHub，剩下的自动完成。

### 第一步：新建 GitHub 仓库

1. 打开 https://github.com/new
2. 仓库名建议 `blog`（或你喜欢的名字），**必须选 Public**
3. 不要勾选 "Add a README"（避免和本地文件冲突），直接创建

### 第二步：本地推送到 GitHub

在项目根目录打开终端，执行：

```bash
git init
git add .
git commit -m "init: 咸鱼的博客"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

（如果 GitHub 要求登录，Windows 上推荐先安装
[GitHub CLI](https://cli.github.com/) 然后执行 `gh auth login`，
或用 [GitHub Desktop](https://desktop.github.com/) 图形化操作。）

### 第三步：开启 Pages

1. 仓库页面 → Settings → Pages
2. Source 选择 **GitHub Actions**
3. 等几分钟，Actions 跑完后访问：
   - 仓库名是 `<用户名>.github.io`：`https://<用户名>.github.io/`
   - 其他仓库名：`https://<用户名>.github.io/<仓库名>/`

### 子路径（重要）

如果仓库名不是 `<用户名>.github.io`，网站会部署在 `/仓库名/` 子路径下。
请把 `config/site.json` 里的 `base` 改成 `/仓库名/`，再重新构建推送：

```json
{
  "base": "/blog/"
}
```

仓库名是 `<用户名>.github.io` 时保持 `"base": "/"` 即可。

### 以后更新

```bash
node build.js        # 本地确认效果
git add .
git commit -m "新文章：xxx"
git push             # 推送后自动重新构建并上线
```

## 功能

- 首页：ID 咸鱼、"这是咸鱼的小站" Hero + 主题打字机、三大主题卡（游戏含 5 个子类）、标题搜索、分类筛选、封面卡片、归档、关于（占位）、友链（GitHub / DeepSeek）
- 文章页：头图、正文（中英/emoji/小标题/表格/代码块/文间图）、阅读量、Waline 评论
- 随机背景：6 款（grid / aurora / dots / circuit / nebula / diagonal），`?bg=名字` 固定预览
- 阅读量：Waline 浏览量统计（pageview），与评论共用后端，加载失败自动降级
- 图片：构建时自动压缩为 WebP，单张相机原图（数 MB）可降到几百 KB

## 游客评论（Waline）

评论用 [Waline](https://waline.js.org) 实现：游客自定义昵称、免登录，
删除/审核评论在 Waline 管理后台完成。完整图文步骤见
[docs/评论配置指南.md](docs/评论配置指南.md)。

1. 按官方文档部署后端（推荐 **Vercel + Neon**）：
   <https://waline.js.org/guide/deploy/vercel.html>
2. 把服务地址填入 `config/site.json`（可选填 `walineCdn` 切换国内 CDN）：

```json
{
  "walineServer": "https://xianyu-waline.vercel.app"
}
```

3. 建议在 Vercel 配置 `SECURE_DOMAINS` 环境变量，防止接口被盗用
4. 重新 `node build.js` 并推送
5. 评论管理入口：`https://xianyu-waline.vercel.app/ui`

## 背景预览

```text
http://localhost:3000/?bg=aurora
http://localhost:3000/?bg=circuit
```

## 目录结构

```text
content/posts/    # 正式帖子（Markdown）
content/examples/ # 示例帖（仅 --examples 本地预览）
config/site.json  # 站点信息、base、Waline 配置
lib/render.js     # Markdown 渲染公共模块
build.js          # 静态生成器 → dist/
server.js         # 本地预览服务器
.github/workflows/deploy.yml  # GitHub Pages 自动部署
```
