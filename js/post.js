"use strict";

const SITE = window.BLOG_SITE || {};

const $ = (sel) => document.querySelector(sel);
const WALINE_CDN = SITE.walineCdn || "https://unpkg.com/@waline/client@v3/dist";

/* ============ 主题切换 ============ */
function initTheme() {
  const toggle = $("#themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.dataset.theme = saved;
  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
}

/* ============ 阅读量（Waline 独立 pageview 模块，带降级） ============ */
function initPageView() {
  const el = $(".waline-pageview-count");
  if (!el) return;
  if (SITE.statsEnabled === false) {
    el.textContent = "–";
    return;
  }
  if (SITE.walineServer) {
    import(`${WALINE_CDN}/pageview.js`)
      .then(({ pageviewCount }) => {
        pageviewCount({ serverURL: SITE.walineServer, path: window.location.pathname });
      })
      .catch(() => {});
  }
  setTimeout(() => {
    const v = el.textContent.trim();
    if (v === "--" || v === "") {
      el.textContent = "–";
    }
  }, 10000);
}

/* ============ Waline 评论 ============ */
function startWaline() {
  Waline.init({
    el: "#waline",
    serverURL: SITE.walineServer,
    lang: "zh-CN",
    pageSize: 10,
    meta: ["nick"],
    requiredMeta: ["nick"],
    dark: 'html[data-theme="dark"]',
  });
}

/* ============ 评论组件按需加载：滚近评论区才拉取 CSS/JS ============ */
function loadWalineAssets() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${WALINE_CDN}/waline.css`;
  document.head.appendChild(link);
  const script = document.createElement("script");
  script.type = "module";
  script.textContent = `import { init } from "${WALINE_CDN}/waline.js"; window.Waline = { init }; window.dispatchEvent(new Event("waline-ready"));`;
  document.body.appendChild(script);
}

function initWaline() {
  if (!SITE.walineServer) return;
  const el = $("#waline");
  if (!el) return;
  if (typeof Waline !== "undefined") {
    startWaline();
    return;
  }
  window.addEventListener("waline-ready", startWaline, { once: true });
  const trigger = () => {
    loadWalineAssets();
    setTimeout(() => {
      if (typeof Waline === "undefined") {
        const notice = document.querySelector(".comments__notice");
        if (notice) notice.textContent = "评论组件加载失败（可能是网络原因），请稍后刷新重试。";
      }
    }, 15000);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          trigger();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
  } else {
    trigger();
  }
}

/* ============ 代码高亮（highlight.js，加载失败则静默跳过） ============ */
function initHighlight() {
  if (window.hljs && typeof hljs.highlightAll === "function") {
    try {
      hljs.highlightAll();
    } catch (e) {}
  }
}

/* ============ 初始化 ============ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initPageView();
  initWaline();
  initHighlight();
});
