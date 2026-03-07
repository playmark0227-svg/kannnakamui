'use strict';

const _Posts      = window.KK.Posts;
const _formatDate = window.KK.formatDate;

/* HTMLかどうか判定（Quill保存データはHTMLタグを含む） */
function isHtml(str) {
  return str && /<[a-z][\s\S]*>/i.test(str);
}

/* ── ヘッダースクロール ── */
window.addEventListener('scroll', () => {
  document.getElementById('site-header')
    ?.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ────────────────────────────────────────────
   ページ判定
──────────────────────────────────────────── */
const isList = !!document.getElementById('blog-grid');
const isPost = !!document.getElementById('post-article');

if (isList) initList();
if (isPost) initPost();

/* ════════════════════════════════════════════
   一覧ページ
════════════════════════════════════════════ */
function initList() {
  _Posts.seed();

  let currentCat = 'all';

  // カテゴリピル生成
  const cats = _Posts.getCategories();
  const pillsWrap = document.getElementById('cat-pills');
  pillsWrap.innerHTML = cats.map(cat =>
    `<button class="filter-pill" data-cat="${esc(cat)}">${esc(cat)}</button>`
  ).join('');

  // フィルターイベント
  document.querySelector('.blog-filter').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentCat = pill.dataset.cat;
    render();
  });

  render();

  function render() {
    const posts = _Posts.getPublished();
    const filtered = currentCat === 'all'
      ? posts
      : posts.filter(p => p.category === currentCat);

    const grid  = document.getElementById('blog-grid');
    const empty = document.getElementById('blog-empty');

    if (filtered.length === 0) {
      grid.style.display  = 'none';
      empty.style.display = 'flex';
      return;
    }
    grid.style.display  = '';
    empty.style.display = 'none';

    grid.innerHTML = filtered.map(post => `
      <a class="blog-card" href="post.html?id=${post.id}">
        <div class="blog-card-thumb">
          ${post.coverImage
            ? `<img src="${post.coverImage}" alt="${esc(post.title)}" loading="lazy" />`
            : `<div class="blog-card-thumb-placeholder">
                 <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="8" width="40" height="32" rx="3"/><circle cx="16" cy="20" r="4"/><path d="M4 32l10-8 8 6 8-8 10 10"/></svg>
               </div>`
          }
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <span class="blog-card-cat">${esc(post.category)}</span>
            <span class="blog-card-date">${_formatDate(post.createdAt)}</span>
          </div>
          <h2 class="blog-card-title">${esc(post.title)}</h2>
          ${post.excerpt
            ? `<p class="blog-card-excerpt">${esc(post.excerpt)}</p>`
            : ''
          }
          <span class="blog-card-link">
            続きを読む
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </div>
      </a>
    `).join('');
  }
}

/* ════════════════════════════════════════════
   詳細ページ
════════════════════════════════════════════ */
function initPost() {
  _Posts.seed();

  const params = new URLSearchParams(location.search);
  const id     = params.get('id');

  const articleEl  = document.getElementById('post-article');
  const notFoundEl = document.getElementById('post-not-found');

  if (!id) {
    show(notFoundEl); return;
  }

  const post = _Posts.getById(id);
  if (!post || post.status !== 'published') {
    show(notFoundEl); return;
  }

  // メタ
  document.getElementById('meta-title').textContent  = `${post.title} — KANNA KAMUY`;
  document.getElementById('meta-desc').content       = post.excerpt || post.title;
  document.getElementById('breadcrumb-title').textContent = post.title;

  // ヘッダー
  document.getElementById('post-category').textContent = post.category;
  document.getElementById('post-date').textContent     = _formatDate(post.createdAt);
  document.getElementById('post-title').textContent    = post.title;

  // タグ
  const tagsEl = document.getElementById('post-tags');
  if (post.tags?.length) {
    tagsEl.innerHTML = post.tags.map(t => `<span class="post-tag">#${esc(t)}</span>`).join('');
  }

  // カバー画像
  if (post.coverImage) {
    const wrap = document.getElementById('post-cover-wrap');
    document.getElementById('post-cover').src = post.coverImage;
    document.getElementById('post-cover').alt = post.title;
    wrap.style.display = 'block';
  }

  // 本文
  // 本文：HTML（Quill保存）またはMarkdownの両方に対応
  const bodyHtml = isHtml(post.body)
    ? post.body
    : window.KK.markdownToHtml(post.body);
  document.getElementById('post-body').innerHTML = bodyHtml;

  // 前後ナビ
  const allPosts = _Posts.getPublished();
  const idx      = allPosts.findIndex(p => p.id === id);
  const prev     = allPosts[idx + 1] || null; // 古い記事
  const next     = allPosts[idx - 1] || null; // 新しい記事
  const navEl    = document.getElementById('post-nav');
  let navHtml    = '';
  if (prev) {
    navHtml += `
      <a class="post-nav-item prev" href="post.html?id=${prev.id}">
        <p class="post-nav-dir">← 前の記事</p>
        <p class="post-nav-title">${esc(prev.title)}</p>
      </a>`;
  } else {
    navHtml += '<div></div>';
  }
  if (next) {
    navHtml += `
      <a class="post-nav-item next" href="post.html?id=${next.id}">
        <p class="post-nav-dir">次の記事 →</p>
        <p class="post-nav-title">${esc(next.title)}</p>
      </a>`;
  }
  navEl.innerHTML = navHtml;

  show(articleEl);
}

/* ── helpers ── */
function show(el) { el.style.display = 'block'; }

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
