"use strict";

/**
 * 随机博客背景
 * - 每次打开页面随机选一款背景
 * - 支持 ?bg=grid|aurora|dots|circuit|nebula|diagonal 强制指定（用于预览）
 */
(function () {
  var variants = ["grid", "aurora", "dots", "circuit", "nebula", "diagonal"];
  var bg = new URLSearchParams(location.search).get("bg");
  if (variants.indexOf(bg) === -1) {
    bg = variants[Math.floor(Math.random() * variants.length)];
  }
  document.documentElement.setAttribute("data-bg", bg);
})();
