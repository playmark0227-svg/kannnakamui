'use strict';

// window.KK 経由でアクセス（store.js でグローバル変数として定義済み）
const _Auth          = window.KK.Auth;
const _Posts         = window.KK.Posts;
const _formatDate    = window.KK.formatDate;
const _fileToBase64  = window.KK.fileToBase64;
const _markdownToHtml = window.KK.markdownToHtml;

/* ══════════════════════════════════════════
   Quill エディタ初期化
══════════════════════════════════════════ */
let quill = null;

function initQuill() {
  if (quill) return; // 二重初期化防止

  const toolbarOptions = [
    // 見出し
    [{ 'header': [2, 3, false] }],
    // 太字・斜体・下線・取り消し線
    ['bold', 'italic', 'underline', 'strike'],
    // リスト
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    // インデント
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    // リンク・画像
    ['link', 'image'],
    // 引用・コード
    ['blockquote', 'code-block'],
    // クリア
    ['clean'],
  ];

  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: '本文を入力してください。\n\nツールバーで見出し・太字・リストなどを設定できます。',
    modules: {
      toolbar: toolbarOptions,
    },
  });
}

/* ─── Quill の内容を hidden input に同期 ─── */
function syncQuillToInput() {
  const html = quill ? quill.root.innerHTML : '';
  // 空のエディタの場合はブランク
  const clean = html === '<p><br></p>' ? '' : html;
  document.getElementById('f-body').value = clean;
}

/* ─── テキストがHTMLかどうか判定 ─── */
function isHtml(str) {
  return str && /<[a-z][\s\S]*>/i.test(str);
}

/* ─── hidden input の HTML / Markdown を Quill に反映 ─── */
function setQuillContent(content) {
  if (!quill) return;
  if (!content) {
    quill.setContents([]);
    return;
  }
  // Markdown形式の場合はHTMLに変換してからセット
  const html = isHtml(content) ? content : _markdownToHtml(content);
  quill.root.innerHTML = html;
}

/* ══════════════════════════════════════════
   Toast
══════════════════════════════════════════ */
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `toast${type === 'error' ? ' error' : ''} show`;
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

/* ─── View switcher ─── */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ─── Panel switcher ─── */
const PANEL_TITLES = {
  'panel-posts':    '実績・ブログ記事',
  'panel-products': '出品・商品管理（古物マーケット 準備中）',
  'panel-orders':   '取引・注文管理（古物マーケット 準備中）',
};

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = PANEL_TITLES[id] || '';

  // ボトムナビのアクティブ状態も同期
  document.querySelectorAll('.bottom-nav-btn[data-panel]').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === id);
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function init() {
  _Posts.seed();

  if (_Auth.isLoggedIn()) {
    showView('view-dashboard');
    renderPostsList();
  } else {
    showView('view-login');
  }
  bindEvents();
}

/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */
function bindLoginForm() {
  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('l-user').value.trim();
    const pass = document.getElementById('l-pass').value;
    const result = _Auth.login(user, pass);
    if (result.ok) {
      showView('view-dashboard');
      renderPostsList();
    } else {
      errEl.textContent = result.error;
      setTimeout(() => errEl.textContent = '', 3000);
    }
  });
}

/* ══════════════════════════════════════════
   POSTS LIST
══════════════════════════════════════════ */
let currentFilter = 'all';

function renderPostsList(filter) {
  if (filter !== undefined) currentFilter = filter;

  const allPosts = _Posts.getAll();
  const filtered = currentFilter === 'all'
    ? allPosts
    : allPosts.filter(p => p.status === currentFilter);

  const countEl = document.getElementById('posts-count');
  const pub = allPosts.filter(p => p.status === 'published').length;
  const dft = allPosts.filter(p => p.status === 'draft').length;
  countEl.textContent = `全 ${allPosts.length} 件（公開 ${pub} ／ 下書き ${dft}）`;

  const tbody = document.getElementById('posts-tbody');
  const emptyMsg = document.getElementById('posts-empty');
  const tableWrap = document.querySelector('.table-wrap');

  if (filtered.length === 0) {
    tableWrap.style.display = 'none';
    emptyMsg.style.display = 'flex';
    return;
  }
  tableWrap.style.display = '';
  emptyMsg.style.display = 'none';

  tbody.innerHTML = filtered.map(post => `
    <tr>
      <td class="post-title-cell" title="${esc(post.title)}">${esc(post.title)}</td>
      <td>${esc(post.category)}</td>
      <td>
        <span class="status-badge status-${post.status}">
          ${post.status === 'published' ? '公開' : '下書き'}
        </span>
      </td>
      <td style="white-space:nowrap">${_formatDate(post.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" data-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            編集
          </button>
          <a class="btn-preview" href="../blog/post.html?id=${post.id}" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            表示
          </a>
          <button class="btn-delete" data-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════
   POST FORM
══════════════════════════════════════════ */
let editingId = null;

function showEditView(id) {
  editingId = id || null;

  const editView = document.getElementById('posts-edit-view');
  const listView = document.getElementById('posts-list-view');
  listView.style.display = 'none';
  editView.style.display = 'block';

  document.getElementById('edit-view-title').textContent = id ? '記事を編集' : '新規投稿';

  // Quill 初期化（初回のみ）
  initQuill();

  // フォームリセット
  resetForm();

  if (id) {
    const post = _Posts.getById(id);
    if (!post) return;
    document.getElementById('edit-id').value    = post.id;
    document.getElementById('f-title').value    = post.title;
    document.getElementById('f-excerpt').value  = post.excerpt;
    document.getElementById('f-status').value   = post.status;
    document.getElementById('f-category').value = post.category;
    document.getElementById('f-tags').value     = (post.tags || []).join(', ');

    // Quill に本文をセット（Markdown→HTMLの変換も含む）
    setQuillContent(post.body || '');
    // hidden inputには変換後HTMLをセット
    document.getElementById('f-body').value = isHtml(post.body)
      ? post.body
      : _markdownToHtml(post.body || '');

    if (post.coverImage) {
      const img = document.getElementById('cover-preview-img');
      img.src = post.coverImage;
      img.style.display = 'block';
      document.getElementById('cover-placeholder').style.display = 'none';
      document.getElementById('btn-cover-clear').style.display = 'flex';
    }
  }
}

function resetForm() {
  document.getElementById('post-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('cover-preview-img').style.display = 'none';
  document.getElementById('cover-preview-img').src = '';
  document.getElementById('cover-placeholder').style.display = 'flex';
  document.getElementById('btn-cover-clear').style.display = 'none';
  // Quill をクリア
  if (quill) {
    quill.setContents([]);
    document.getElementById('f-body').value = '';
  }
}

function showListView() {
  document.getElementById('posts-edit-view').style.display = 'none';
  document.getElementById('posts-list-view').style.display = 'block';
  renderPostsList();
}

function getFormData(status) {
  // 保存前に Quill の内容を sync
  syncQuillToInput();

  const tagsRaw = document.getElementById('f-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const coverImg = document.getElementById('cover-preview-img');
  return {
    title:      document.getElementById('f-title').value.trim(),
    excerpt:    document.getElementById('f-excerpt').value.trim(),
    body:       document.getElementById('f-body').value,
    category:   document.getElementById('f-category').value,
    tags,
    coverImage: (coverImg.style.display !== 'none') ? coverImg.src : '',
    status:     status || document.getElementById('f-status').value,
  };
}

function savePost(statusOverride) {
  const data = getFormData(statusOverride);
  if (!data.title) {
    document.getElementById('f-title').classList.add('error');
    document.getElementById('f-title').focus();
    showToast('タイトルを入力してください', 'error');
    return;
  }
  document.getElementById('f-title').classList.remove('error');

  if (editingId) {
    _Posts.update(editingId, data);
    showToast('記事を更新しました');
  } else {
    _Posts.create(data);
    showToast('記事を作成しました');
  }
  showListView();
}

/* ── Cover image ── */
function bindCoverUpload() {
  const area     = document.getElementById('cover-upload-area');
  const fileIn   = document.getElementById('f-cover');
  const img      = document.getElementById('cover-preview-img');
  const placeholder = document.getElementById('cover-placeholder');
  const clearBtn = document.getElementById('btn-cover-clear');

  area.addEventListener('click', e => {
    if (e.target === clearBtn || clearBtn.contains(e.target)) return;
    fileIn.click();
  });

  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('画像は3MB以内にしてください', 'error');
      return;
    }
    const b64 = await _fileToBase64(file);
    img.src = b64;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    clearBtn.style.display = 'flex';
  });

  clearBtn.addEventListener('click', () => {
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
    clearBtn.style.display = 'none';
    fileIn.value = '';
  });
}

/* ══════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════ */
let deleteTargetId = null;

function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('modal-delete').style.display = 'flex';
}
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('modal-delete').style.display = 'none';
}

/* ══════════════════════════════════════════
   EVENT BINDING
══════════════════════════════════════════ */
function bindEvents() {
  bindLoginForm();

  document.getElementById('btn-logout').addEventListener('click', () => {
    _Auth.logout();
    showView('view-login');
  });

  document.querySelectorAll('[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel));
  });

  document.getElementById('btn-new-post').addEventListener('click', () => showEditView(null));
  document.getElementById('btn-back-list').addEventListener('click', showListView);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPostsList(btn.dataset.filter);
    });
  });

  document.getElementById('posts-tbody').addEventListener('click', e => {
    const editBtn   = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (editBtn)   showEditView(editBtn.dataset.id);
    if (deleteBtn) openDeleteModal(deleteBtn.dataset.id);
  });

  document.getElementById('post-form').addEventListener('submit', e => {
    e.preventDefault();
    savePost('published');
  });

  document.getElementById('btn-save-draft').addEventListener('click', () => savePost('draft'));

  bindCoverUpload();

  document.getElementById('btn-delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-confirm').addEventListener('click', () => {
    if (deleteTargetId) {
      _Posts.delete(deleteTargetId);
      showToast('記事を削除しました');
      closeDeleteModal();
      renderPostsList();
    }
  });
  document.getElementById('modal-delete').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-delete')) closeDeleteModal();
  });
}

/* ── Start ── */
init();

/* ══════════════════════════════════════════
   スマホ用サイドバー開閉
══════════════════════════════════════════ */
(function setupMobileNav() {
  const hamburger = document.getElementById('topbar-hamburger');
  const overlay   = document.getElementById('sidebar-overlay');
  const sidebar   = document.getElementById('sidebar');

  if (!hamburger || !overlay || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  // サイドバー内のボタンをタップしたら自動で閉じる（スマホのみ）
  sidebar.addEventListener('click', e => {
    if (window.innerWidth <= 768 && e.target.closest('.sidebar-btn')) {
      setTimeout(closeSidebar, 200);
    }
  });

  /* ── ボトムナビ ── */
  document.querySelectorAll('.bottom-nav-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      showPanel(btn.dataset.panel);
      // ボトムナビのアクティブ切替
      document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ボトムナビのログアウト
  const bottomLogout = document.getElementById('bottom-nav-logout');
  if (bottomLogout) {
    bottomLogout.addEventListener('click', () => {
      _Auth.logout();
      showView('view-login');
    });
  }
})();
