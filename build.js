"use strict";

/**
 * 静态站点生成器（零依赖）
 * 用法：
 *   node build.js           # 只构建正式帖子 content/posts/ → dist/
 *   node build.js --examples # 额外加入示例帖 content/examples/（仅本地预览用）
 * 输出：dist/ 目录，直接部署到 GitHub Pages 等。
 */

const fs = require("fs");
const path = require("path");
const R = require("./lib/render");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "content", "posts");
const EXAMPLES_DIR = path.join(ROOT, "content", "examples");
const CONFIG_FILE = path.join(ROOT, "config", "site.json");
const DIST = path.join(ROOT, "dist");
const WITH_EXAMPLES = process.argv.includes("--examples");

function loadSite() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return { siteName: "my.blog", heroName: "Me", description: "", footerText: "", themes: [], base: "/" };
  }
}

const site = loadSite();
const BASE = String(site.base || "/").replace(/\/?$/, "/");
const SITE_URL = String(site.siteUrl || "").replace(/\/?$/, "");

function url(p) {
  return BASE + String(p).replace(/^\//, "");
}

function absoluteUrl(p) {
  return SITE_URL ? `${SITE_URL}/${String(p).replace(/^\//, "")}` : url(p);
}

function clean(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function coverUrl(post) {
  return post.cover ? url(`media/${post.id}/${path.basename(post.cover)}`) : "";
}

function toData(post) {
  return {
    id: post.id,
    title: post.title,
    date: post.date,
    category: post.category,
    subcategory: post.subcategory,
    tags: post.tags,
    excerpt: post.excerpt,
    cover: coverUrl(post),
    readingTime: R.readingTime(post.content),
    pinned: post.pinned,
  };
}

function cardHtml(p) {
  const cover = p.cover
    ? `<img class="post-card__cover" src="${p.cover}" alt="" loading="lazy">`
    : `<div class="post-card__cover post-card__cover--${p.category === "游戏" ? "game" : "default"}"></div>`;
  const sub = p.subcategory
    ? `<span class="post-card__tag post-card__tag--sub">${R.escapeHtml(p.subcategory)}</span>`
    : "";
  const pin = p.pinned ? `<span class="post-card__pin">📌 置顶</span>` : "";
  return `
    <a class="post-card reveal" href="${url(`post/${encodeURIComponent(p.id)}.html`)}">
      ${cover}
      <div class="post-card__body">
        <div class="post-card__meta">
          <span>${R.escapeHtml(p.date.replace(/-/g, "."))}</span>
          <span class="post-card__tag">${R.escapeHtml(p.category)}</span>${sub}
          ${pin}
        </div>
        <h3 class="post-card__title">${R.escapeHtml(p.title)}</h3>
        <p class="post-card__excerpt">${R.escapeHtml(p.excerpt)}</p>
        <span class="post-card__more">阅读全文 →</span>
      </div>
    </a>`;
}

function archiveItemHtml(p) {
  return `
    <a class="archive__item reveal" href="${url(`post/${encodeURIComponent(p.id)}.html`)}">
      <span class="archive__date">${R.escapeHtml(p.date.replace(/-/g, "."))}</span>
      <span class="archive__title">${R.escapeHtml(p.title)}</span>
      <span class="archive__cat">${R.escapeHtml(p.category)}${p.subcategory ? "·" + R.escapeHtml(p.subcategory) : ""}</span>
    </a>`;
}

function themeCardHtml(t) {
  return `
    <div class="theme-card">
      <span class="theme-card__icon">${t.icon || "✦"}</span>
      <h3 class="theme-card__name">${R.escapeHtml(t.name)}</h3>
      <p class="theme-card__desc">${R.escapeHtml(t.desc || "")}</p>
      ${t.subs ? `<div class="theme-card__subs">${t.subs.map((s) => `<span>${R.escapeHtml(s)}</span>`).join("")}</div>` : ""}
    </div>`;
}

function navHtml(s) {
  return `
  <header class="nav" id="nav">
    <div class="nav__inner">
      <a class="nav__logo" href="${url("")}">
        <span class="nav__logo-mark">&gt;_</span>
        <span>${R.escapeHtml(s.siteName || "my.blog")}</span>
      </a>
      <nav class="nav__links" aria-label="主导航">
        <a href="${url("#themes")}">主题</a>
        <a href="${url("#posts")}">文章</a>
        <a href="${url("#archive")}">归档</a>
        <a href="${url("#about")}">关于</a>
        <a href="${url("#links")}">友链</a>
      </nav>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="切换主题">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="4.5"></circle>
          <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"></path>
        </svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
        </svg>
      </button>
    </div>
  </header>`;
}

function footerHtml(s) {
  return `
  <footer class="footer">
    <p class="footer__line">
      <span class="footer__status"><i></i> ALL SYSTEMS NOMINAL</span>
    </p>
    <p class="footer__copy">${R.escapeHtml(s.footerText || "")}</p>
  </footer>`;
}

/* ---------------- 首页右侧个人卡片 ---------------- */

function profileSideHtml(aboutHref) {
  const socials = [
    {
      name: "Bilibili",
      href: "https://space.bilibili.com/270770541",
      path: "M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z",
    },
    {
      name: "GitHub",
      href: "https://github.com/UPxianyu",
      path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    },
    {
      name: "Steam",
      href: "https://steamcommunity.com/profiles/76561199051196288/",
      path: "M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z",
    },
  ];
  const socialHtml = socials
    .map(
      (s) => `
      <a class="social social--${s.name.toLowerCase()}" href="${R.escapeHtml(s.href)}" target="_blank" rel="noopener" aria-label="${s.name}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${s.path}"></path></svg>
      </a>`
    )
    .join("");
  const avatarHtml = aboutHref
    ? `<a class="profile-card__avatar-link" href="${aboutHref}" aria-label="自我介绍">
        <img class="profile-card__avatar" src="${url("assets/og.jpg")}" alt="${R.escapeHtml(site.heroName || "avatar")}">
      </a>`
    : `<img class="profile-card__avatar" src="${url("assets/og.jpg")}" alt="${R.escapeHtml(site.heroName || "avatar")}">`;
  return `
    <aside class="home-side">
      <div class="profile-card">
        ${avatarHtml}
        <div class="profile-card__socials">${socialHtml}</div>
        <img class="profile-card__sign" src="${url("assets/signature-2.png")}" alt="不变的歌声">
      </div>
    </aside>`;
}

/* ---------------- 首页 ---------------- */

function renderIndex(posts) {
  const themeCards = (site.themes || []).map(themeCardHtml).join("");
  const cards = posts.map(cardHtml).join("");
  const archive = posts.map(archiveItemHtml).join("");
  const aboutHref = url("#about");
  const linkCards = (site.links || [])
    .map(
      (l) => `
      <a class="link-card" href="${R.escapeHtml(l.url)}" target="_blank" rel="noopener">
        <span class="link-card__name">${R.escapeHtml(l.name)}</span>
        <span class="link-card__desc">${R.escapeHtml(l.desc || "")}</span>
      </a>`
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${R.escapeHtml(site.description || "")}">
  <title>${R.escapeHtml(site.siteName || "博客")}</title>
  <meta property="og:title" content="${R.escapeHtml(site.siteName || "博客")}">
  <meta property="og:type" content="website">
  <meta property="og:description" content="${R.escapeHtml(site.description || "")}">
  <meta property="og:image" content="${absoluteUrl("assets/og.jpg")}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="${url("assets/favicon.png")}">
  <link rel="apple-touch-icon" href="${url("assets/apple-touch-icon.png")}">
  <link rel="stylesheet" href="${url("css/style.css")}">
  <script src="${url("js/bg.js")}"></script>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--a" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--b" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--c" aria-hidden="true"></div>
  ${navHtml(site)}
  <main id="top">
  <div class="home">
    <div class="home__main">
    <section class="hero">
      <p class="hero__kicker" id="clock">SYS.TIME --:--:--</p>
      <h1 class="hero__title">
        <span class="hero__line">这是<em>${R.escapeHtml(site.heroName || "Me")}</em>的小站</span>
        <span class="hero__type" id="typewriter"></span><span class="hero__cursor" aria-hidden="true"></span>
      </h1>
      <p class="hero__desc">${R.escapeHtml(site.description || "")}</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="${url("#posts")}">浏览文章 ↓</a>
        <a class="btn btn--ghost" href="${url("#themes")}">查看主题</a>
      </div>
      <div class="hero__meta">
        <span><b>ID</b> ${R.escapeHtml(site.uid || site.heroName || "")}</span>
        <span class="hero__meta-dot">·</span>
        <span><b>EST</b> 2026</span>
        <span class="hero__meta-dot">·</span>
        <span><b>LOC</b> ${R.escapeHtml(site.location || "")}</span>
      </div>
    </section>

    <section class="section" id="themes">
      <div class="section__head">
        <h2><span class="section__tag">01</span> 主题</h2>
      </div>
      <div class="theme-cards">${themeCards}</div>
    </section>

    <section class="section" id="posts">
      <div class="section__head">
        <h2><span class="section__tag">02</span> 文章</h2>
      </div>
      <div class="search">
        <input type="search" id="searchInput" placeholder="搜索文章标题…" autocomplete="off">
      </div>
      <div class="filters" id="filters" aria-label="分类筛选"></div>
      <div class="posts" id="postList">${cards}</div>
      <p class="empty" id="postEmpty" hidden>没有找到匹配的文章。</p>
    </section>

    <section class="section" id="archive">
      <div class="section__head">
        <h2><span class="section__tag">03</span> 归档</h2>
      </div>
      <div class="archive" id="archiveList">${archive}</div>
    </section>

    <section class="section" id="about">
      <div class="section__head">
        <h2><span class="section__tag">04</span> 关于</h2>
      </div>
      <div class="about-card">${R.escapeHtml(site.about || "")}</div>
    </section>

    <section class="section" id="links">
      <div class="section__head">
        <h2><span class="section__tag">05</span> 友链</h2>
      </div>
      <div class="links">${linkCards}</div>
    </section>
    </div>
    ${profileSideHtml(aboutHref)}
  </div>
  </main>
  ${footerHtml(site)}
  <script>window.BLOG_SITE = ${clean(site)}; window.BLOG_POSTS = ${clean(posts)};</script>
  <script src="${url("js/main.js")}"></script>
</body>
</html>`;
}

/* ---------------- 文章页 ---------------- */

function renderPostPage(p) {
  const cover = coverUrl(p);
  const coverHtml = cover ? `<img class="post-article__cover" src="${cover}" alt="">` : "";
  const sub = p.subcategory ? `<span class="post-card__tag">${R.escapeHtml(p.subcategory)}</span>` : "";
  const walineCdn = site.walineCdn || "https://unpkg.com/@waline/client@v3/dist";
  const walineHtml = site.walineServer
    ? `
    <link rel="stylesheet" href="${walineCdn}/waline.css">
    <div id="waline"></div>
    <script type="module">
      import { init } from "${walineCdn}/waline.js";
      window.Waline = { init };
      window.dispatchEvent(new Event("waline-ready"));
    </script>`
    : `<p class="comments__notice">评论功能尚未配置（在 config/site.json 填写 walineServer 后重新构建即可）。</p>`;
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${R.escapeHtml(p.excerpt)}">
  <title>${R.escapeHtml(p.title)} · ${R.escapeHtml(site.siteName || "博客")}</title>
  <meta property="og:title" content="${R.escapeHtml(p.title)}">
  <meta property="og:type" content="article">
  <meta property="og:description" content="${R.escapeHtml(p.excerpt)}">
  <meta property="og:image" content="${absoluteUrl("assets/og.jpg")}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="${url("assets/favicon.png")}">
  <link rel="apple-touch-icon" href="${url("assets/apple-touch-icon.png")}">
  <link rel="stylesheet" href="${url("css/style.css")}">
  <script src="${url("js/bg.js")}"></script>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--a" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--b" aria-hidden="true"></div>
  <div class="bg-glow bg-glow--c" aria-hidden="true"></div>
  ${navHtml(site)}
  <main class="post-page">
    <a class="post-page__back" href="${url("#posts")}">← 返回首页</a>
    <article class="post-article">
      ${coverHtml}
      <header class="post-article__header">
        <h1 class="post-article__title">${R.escapeHtml(p.title)}</h1>
        <div class="post-article__meta">
          <span>${R.escapeHtml(p.date.replace(/-/g, "."))}</span>
          <span class="post-card__tag">${R.escapeHtml(p.category)}</span>${sub}
          <span>约 ${p.readingTime} 分钟读完</span>
          ${site.statsEnabled !== false ? `<span class="post-article__pv">阅读 <b id="busuanzi_value_page_pv">--</b></span>` : ""}
        </div>
        ${p.tags.length ? `<div class="post-article__tags">${p.tags.map((t) => `<span class="post-article__tag"># ${R.escapeHtml(t)}</span>`).join("")}</div>` : ""}
      </header>
      <div class="post-content">${p.html}</div>
      <div class="post-article__foot"><span>END</span></div>
    </article>
    <section class="comments" id="comments">
      <h2 class="comments__title">评论</h2>
      ${walineHtml}
    </section>
  </main>
  ${footerHtml(site)}
  <script>window.BLOG_SITE = ${clean(site)}; window.BLOG_POST = ${clean(p.data)};</script>
  ${site.statsEnabled !== false ? `<script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>` : ""}
  <script src="${url("js/post.js")}"></script>
</body>
</html>`;
}

/* ---------------- 构建 ---------------- */

function loadPostsFrom(dir) {
  if (!fs.existsSync(dir)) return [];
  return R.listMdFiles(dir).map((file) => ({
    ...R.parsePost(fs.readFileSync(file, "utf8"), path.basename(file, ".md")),
    file,
  }));
}

function main() {
  let rawPosts = loadPostsFrom(POSTS_DIR);
  if (WITH_EXAMPLES) {
    const examples = loadPostsFrom(EXAMPLES_DIR);
    rawPosts = rawPosts.concat(examples);
    console.log(`已包含 ${examples.length} 篇示例帖（仅本地模式）`);
  }
  rawPosts = rawPosts
    .filter((p) => p.published)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.date.localeCompare(a.date);
    });

  const data = rawPosts.map(toData);
  const posts = rawPosts.map((p) => ({
    ...p,
    html: R.renderMarkdown(p.content, url(`media/${p.id}/`)),
    readingTime: R.readingTime(p.content),
    data: toData(p),
  }));

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, "post"), { recursive: true });
  fs.mkdirSync(path.join(DIST, "css"), { recursive: true });
  fs.mkdirSync(path.join(DIST, "js"), { recursive: true });
  fs.mkdirSync(path.join(DIST, "assets"), { recursive: true });

  R.copyDir(path.join(ROOT, "css"), path.join(DIST, "css"));
  R.copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
  for (const f of ["main.js", "bg.js", "post.js"]) {
    fs.copyFileSync(path.join(ROOT, "js", f), path.join(DIST, "js", f));
  }

  // 帖子图片：优先复制帖子专属 images/ 目录，再补齐公共 content/posts/images/ 里被引用的文件
  for (const p of rawPosts) {
    const postDir = path.join(path.dirname(p.file), p.id);
    const perPostImages = path.join(postDir, "images");
    const sharedImages = path.join(path.dirname(p.file), "images");

    if (fs.existsSync(perPostImages)) {
      R.copyDir(perPostImages, path.join(DIST, "media", p.id));
    }

    // 收集这篇帖子引用的所有 images/ 文件（头图 + 正文插图）
    const refs = new Set();
    if (p.cover && p.cover.startsWith("images/")) {
      refs.add(p.cover.slice("images/".length));
    }
    const imgRe = /!\[[^\]]*\]\(images\/([^)\s]+)\)/g;
    let m;
    while ((m = imgRe.exec(p.content))) refs.add(m[1]);

    for (const name of refs) {
      const dest = path.join(DIST, "media", p.id, name);
      if (fs.existsSync(dest)) continue;
      const fromShared = path.join(sharedImages, name);
      if (fs.existsSync(fromShared)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(fromShared, dest);
      }
    }
  }

  fs.writeFileSync(path.join(DIST, "index.html"), renderIndex(data), "utf8");
  for (const p of posts) {
    fs.writeFileSync(path.join(DIST, "post", `${p.id}.html`), renderPostPage(p), "utf8");
  }

  fs.writeFileSync(
    path.join(DIST, "404.html"),
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=${url("")}"></head><body><p>页面不存在，正在返回首页…</p></body></html>`,
    "utf8"
  );

  console.log(`构建完成：${data.length} 篇文章 → dist/`);
  console.log(`站点 base：${BASE}`);
  console.log("本地预览：node server.js 后访问 http://localhost:3000");
}

main();
