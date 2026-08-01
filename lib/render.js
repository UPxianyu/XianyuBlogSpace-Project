"use strict";

/**
 * 公共渲染模块：frontmatter 解析 + Markdown → HTML + 工具函数
 * 供 build.js（静态生成）与 server.js（本地预览）共用。
 */

const path = require("path");
const fs = require("fs");

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/* ---------------- 基础工具 ---------------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function readingTime(md) {
  const clean = String(md || "").replace(/```[\s\S]*?```/g, " ");
  const cjk = (clean.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (clean.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + words) / 400));
}

/* ---------------- frontmatter ---------------- */

function parseFrontmatter(raw) {
  const m = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: String(raw) };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      meta[key] = val;
    }
  }
  return { meta, body: m[2] };
}

function parsePost(raw, fallbackId) {
  const { meta, body } = parseFrontmatter(raw);
  const tags = String(meta.tags || "")
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const excerpt =
    (meta.excerpt || "").trim() ||
    body.replace(/[#>*`\-_\[\]()!|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return {
    id: fallbackId,
    title: meta.title || fallbackId,
    date: meta.date || "1970-01-01",
    category: meta.category || "未分类",
    subcategory: meta.subcategory || "",
    tags,
    excerpt,
    cover: meta.cover || "",
    published: meta.published !== "false",
    pinned: meta.pinned === "true",
    content: body,
  };
}

/* ---------------- Markdown 渲染 ---------------- */

function renderInline(s, imgPrefix, imgInfo) {
  let t = escapeHtml(s);
  // 整体已转义一次；对再次转义的字段先还原 &amp;，避免 URL/alt 被二次转义
  const unescapeAmp = (x) => x.replace(/&amp;/g, "&");
  // 图片：images/ 开头的相对路径改写为 /media/<postId>/<同名>.webp，并带上处理后的宽高
  t = t.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&quot;]*&quot;)?\)/g,
    (m, alt, src) => {
      const rawSrc = unescapeAmp(src);
      const rawAlt = unescapeAmp(alt);
      if (imgPrefix && rawSrc.startsWith("images/")) {
        const file = rawSrc.slice(7);
        const info = imgInfo ? imgInfo[file.replace(IMAGE_EXT, "").toLowerCase()] : null;
        const dims = info ? ` width="${info.w}" height="${info.h}"` : "";
        const webp = file.replace(IMAGE_EXT, "") + ".webp";
        return `<img src="${escapeHtml(imgPrefix + encodeURIComponent(webp))}" alt="${escapeHtml(rawAlt)}" loading="lazy"${dims}>`;
      }
      return `<img src="${escapeHtml(rawSrc)}" alt="${escapeHtml(rawAlt)}" loading="lazy">`;
    }
  );
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // 链接：javascript:/data: 等危险协议一律降级为纯文本
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&quot;]*&quot;)?\)/g,
    (m, text, href) => {
      const rawHref = unescapeAmp(href);
      const safe = /^(https?:|mailto:)/i.test(rawHref);
      if (!safe) return `<strong>${text}</strong>（链接已拦截）`;
      return `<a href="${escapeHtml(rawHref)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  );
  return t;
}

function renderMarkdown(src, imgPrefix, imgInfo) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const inline = (s) => renderInline(s, imgPrefix, imgInfo);

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "text";
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(buf.join("\n"))}</code></pre>`
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push("<hr>");
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join("\n"), imgPrefix, imgInfo)}</blockquote>`);
      continue;
    }

    // 无序 / 有序列表
    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*+]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // 表格
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const parseRow = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = parseRow(line).map((c) => `<th>${inline(c)}</th>`).join("");
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
        rows.push(`<tr>${parseRow(lines[i]).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
        i++;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>`);
      continue;
    }

    // 段落
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^\|.*\|$/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

/* ---------------- 文件工具 ---------------- */

function listMdFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

module.exports = {
  escapeHtml,
  slugify,
  todayISO,
  readingTime,
  parseFrontmatter,
  parsePost,
  renderMarkdown,
  listMdFiles,
  copyDir,
};
