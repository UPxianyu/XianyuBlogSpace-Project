"use strict";

/* ============ 数据 ============ */
const POSTS = window.BLOG_POSTS || [];
const SITE = window.BLOG_SITE || {};
const THEMES = SITE.themes || [];
const BASE = String(SITE.base || "/").replace(/\/?$/, "/");

const $ = (sel, root = document) => root.querySelector(sel);

function url(p) {
  return BASE + String(p).replace(/^\//, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ============ 筛选状态 ============ */
let activeCat = "全部";
let activeSub = null;
let query = "";

function filteredPosts() {
  const q = query.trim().toLowerCase();
  return POSTS.filter((p) => {
    if (activeCat !== "全部" && p.category !== activeCat) return false;
    if (activeCat === "游戏" && activeSub && p.subcategory !== activeSub) return false;
    if (q) {
      const hay = [p.title, p.category, p.subcategory, p.excerpt, (p.tags || []).join(" ")]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ============ 分类筛选 ============ */
function renderFilters() {
  const wrap = $("#filters");
  const cats = [{ name: "全部" }, ...THEMES.map((t) => ({ name: t.name }))];
  const chips = cats
    .map(
      (c) => `
      <button class="chip ${c.name === activeCat ? "chip--active" : ""}" data-cat="${escapeHtml(c.name)}">
        ${escapeHtml(c.name)}
      </button>`
    )
    .join("");

  let subChips = "";
  const gameTheme = THEMES.find((t) => t.name === "游戏");
  if (activeCat === "游戏" && gameTheme && gameTheme.subs) {
    subChips = `
      <button class="chip ${!activeSub ? "chip--active" : ""}" data-sub="">全部</button>
      ${gameTheme.subs
        .map(
          (s) => `
          <button class="chip ${s === activeSub ? "chip--active" : ""}" data-sub="${escapeHtml(s)}">
            ${escapeHtml(s)}
          </button>`
        )
        .join("")}`;
  }
  wrap.innerHTML = chips + subChips;
}

function onFilterClick(e) {
  const cat = e.target.closest("[data-cat]");
  const sub = e.target.closest("[data-sub]");
  if (cat) {
    activeCat = cat.dataset.cat;
    activeSub = null;
  }
  if (sub) {
    activeSub = sub.dataset.sub || null;
  }
  if (!cat && !sub) return;
  applyView();
}

/* ============ 渲染 ============ */
function cardHtml(p) {
  const cover = p.cover
    ? `<img class="post-card__cover" src="${p.cover}" alt="" loading="lazy">`
    : `<div class="post-card__cover post-card__cover--${p.category === "游戏" ? "game" : "default"}"></div>`;
  const sub = p.subcategory
    ? `<span class="post-card__tag post-card__tag--sub">${escapeHtml(p.subcategory)}</span>`
    : "";
  const pin = p.pinned ? `<span class="post-card__pin">📌 置顶</span>` : "";
  return `
    <a class="post-card reveal" href="${url(`post/${encodeURIComponent(p.id)}.html`)}">
      ${cover}
      <div class="post-card__body">
        <div class="post-card__meta">
          <span>${escapeHtml(p.date.replace(/-/g, "."))}</span>
          <span class="post-card__tag">${escapeHtml(p.category)}</span>${sub}
          ${pin}
        </div>
        <h3 class="post-card__title">${escapeHtml(p.title)}</h3>
        <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
        <span class="post-card__more">阅读全文 →</span>
      </div>
    </a>`;
}

function renderPosts() {
  const list = filteredPosts();
  const wrap = $("#postList");
  const empty = $("#postEmpty");
  wrap.innerHTML = list.map(cardHtml).join("");
  empty.hidden = list.length > 0;
  observeReveals();
}

function renderArchive() {
  const list = filteredPosts();
  $("#archiveList").innerHTML = list
    .map(
      (p) => `
      <a class="archive__item reveal" href="${url(`post/${encodeURIComponent(p.id)}.html`)}">
        <span class="archive__date">${escapeHtml(p.date.replace(/-/g, "."))}</span>
        <span class="archive__title">${escapeHtml(p.title)}</span>
        <span class="archive__cat">${escapeHtml(p.category)}${p.subcategory ? "·" + escapeHtml(p.subcategory) : ""}</span>
      </a>`
    )
    .join("");
  observeReveals();
}

function applyView() {
  renderFilters();
  renderPosts();
  renderArchive();
}

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

/* ============ 顶部时钟 ============ */
function initClock() {
  const el = $("#clock");
  if (!el) return;
  const tick = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    el.textContent = `SYS.TIME ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ============ 打字机 ============ */
function initTypewriter() {
  const el = $("#typewriter");
  if (!el) return;
  const phrases = [
    SITE.subtitle || "writing about games, code & daily life.",
    "记录计算机学习、日常与游戏生活 🎮",
    "GTNH 进度：蒸汽时代 🏭",
    "MC 生存 · FPS 突突 · GALGAME 推剧情",
    "今天也在努力学习与摸鱼 🐟",
    "写代码一时爽，一直写一直爽 ⌨️",
    "写完这篇就去打游戏 🎮",
  ];
  let phraseIdx = 0;
  let charIdx = 0;
  let deleting = false;

  const type = () => {
    const current = phrases[phraseIdx];
    el.textContent = current.slice(0, charIdx);
    if (!deleting) {
      charIdx++;
      if (charIdx > current.length) {
        deleting = true;
        return setTimeout(type, 1800);
      }
      return setTimeout(type, 55);
    }
    charIdx--;
    if (charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      return setTimeout(type, 350);
    }
    return setTimeout(type, 28);
  };
  type();
}

/* ============ 滚动效果 ============ */
function initScrollEffects() {
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

let revealObserver;
function observeReveals() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
  }
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => revealObserver.observe(el));
}

/* ============ 初始化 ============ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initClock();
  initTypewriter();
  initScrollEffects();

  $("#filters").addEventListener("click", onFilterClick);
  $("#searchInput").addEventListener("input", (e) => {
    query = e.target.value;
    renderPosts();
    renderArchive();
  });

  applyView();
});
