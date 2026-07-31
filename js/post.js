"use strict";

const SITE = window.BLOG_SITE || {};

const $ = (sel) => document.querySelector(sel);

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

/* ============ 阅读量（不蒜子，带降级） ============ */
function initPageView() {
  const el = $("#pagePv");
  if (!el) return;
  if (SITE.statsEnabled === false) {
    el.textContent = "—";
    return;
  }
  setTimeout(() => {
    if (el.textContent.trim() === "--" || el.textContent.trim() === "") {
      el.textContent = "—";
    }
  }, 4000);
}

/* ============ Waline 评论 ============ */
function initWaline() {
  if (!SITE.walineServer) return;
  const el = $("#waline");
  if (!el || typeof Waline === "undefined") {
    const notice = document.querySelector(".comments__notice");
    if (notice) notice.textContent = "评论组件加载失败（可能是网络原因），请稍后刷新重试。";
    return;
  }
  Waline.init({
    el: "#waline",
    serverURL: SITE.walineServer,
    lang: "zh-CN",
    pageSize: 10,
    requiredFields: ["nick"],
  });
}

/* ============ 初始化 ============ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initPageView();
  initWaline();
});
