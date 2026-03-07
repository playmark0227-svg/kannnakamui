/**
 * KANNA KAMUY — Store (共通データ管理層)
 * LocalStorage ベース。将来 API/DB に差し替え可能な設計。
 *
 * 拡張予定:
 *   - posts   : ブログ記事
 *   - products: EC商品 (将来)
 *   - orders  : EC注文 (将来)
 */

'use strict';

/* ─────────────────────────────────────────────
   定数
───────────────────────────────────────────── */
const STORE_KEYS = {
  posts:    'kk_posts',
  products: 'kk_products',   // EC用 (将来)
  orders:   'kk_orders',     // EC用 (将来)
  auth:     'kk_auth_token',
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'kannakamuy2025', // 本番時は環境変数等に移行
};

/* ─────────────────────────────────────────────
   ユーティリティ
───────────────────────────────────────────── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function now() {
  return new Date().toISOString();
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ─────────────────────────────────────────────
   認証
───────────────────────────────────────────── */
const Auth = {
  login(username, password) {
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      const token = btoa(`${username}:${now()}`);
      save(STORE_KEYS.auth, token);
      return { ok: true, token };
    }
    return { ok: false, error: 'ユーザー名またはパスワードが正しくありません' };
  },

  logout() {
    localStorage.removeItem(STORE_KEYS.auth);
  },

  isLoggedIn() {
    return !!load(STORE_KEYS.auth);
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = '/admin/index.html';
      return false;
    }
    return true;
  },
};

/* ─────────────────────────────────────────────
   ブログ投稿 CRUD
───────────────────────────────────────────── */
const Posts = {
  /** 全件取得（新しい順） */
  getAll() {
    return (load(STORE_KEYS.posts) || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  /** 公開済みのみ取得 */
  getPublished() {
    return this.getAll().filter(p => p.status === 'published');
  },

  /** ID で1件取得 */
  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  /** カテゴリ一覧取得 */
  getCategories() {
    const cats = this.getAll().map(p => p.category).filter(Boolean);
    return [...new Set(cats)];
  },

  /**
   * 投稿作成
   * @param {{ title, body, excerpt, category, tags, coverImage, status }} data
   */
  create(data) {
    const posts = load(STORE_KEYS.posts) || [];
    const post = {
      id:          generateId(),
      title:       data.title       || '無題',
      body:        data.body        || '',
      excerpt:     data.excerpt     || '',
      category:    data.category    || '実績',
      tags:        data.tags        || [],
      coverImage:  data.coverImage  || '',
      status:      data.status      || 'draft',  // 'published' | 'draft'
      createdAt:   now(),
      updatedAt:   now(),
    };
    posts.unshift(post);
    save(STORE_KEYS.posts, posts);
    return post;
  },

  /**
   * 投稿更新
   */
  update(id, data) {
    const posts = load(STORE_KEYS.posts) || [];
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    posts[idx] = { ...posts[idx], ...data, updatedAt: now() };
    save(STORE_KEYS.posts, posts);
    return posts[idx];
  },

  /**
   * 投稿削除
   */
  delete(id) {
    const posts = (load(STORE_KEYS.posts) || []).filter(p => p.id !== id);
    save(STORE_KEYS.posts, posts);
  },

  /** サンプルデータ投入（初回のみ。画像なしデータがある場合はリセット） */
  seed() {
    const existing = load(STORE_KEYS.posts) || [];
    // 既存データに画像が1枚もない場合はリセットして再投入
    const hasImages = existing.some(p => p.coverImage && p.coverImage.length > 10);
    if (existing.length > 0 && hasImages) return;
    // 古いデータをクリア
    localStorage.removeItem(STORE_KEYS.posts);
    const samples = [
      {
        title: '相続手続きのサポート事例 ― 複数の不動産を含む遺産分割',
        body: `## 概要\n\nお客様から「父が亡くなり、不動産が複数あってどこから手をつけていいかわからない」とのご相談をいただきました。\n\n## 対応内容\n\n- 相続関係説明図の作成\n- 不動産の評価・一覧整理\n- 遺産分割協議書の作成\n- 法務局への申請サポート\n\n## 結果\n\n約3ヶ月で全ての手続きを完了。お客様からは「複雑な手続きを丁寧に説明していただき安心できた」とのお声をいただきました。`,
        excerpt: '複数の不動産を含む相続案件を3ヶ月でサポート完了。遺産分割協議書の作成から法務局申請まで一括対応しました。',
        category: '相続手続き',
        tags: ['相続', '不動産', '遺産分割'],
        coverImage: '/assets/images/blog/blog-inheritance.jpg',
        status: 'published',
      },
      {
        title: '公正証書遺言作成のサポート ― 認知症の進行前に想いを残したいという依頼',
        body: `## 概要\n\n「認知症が心配で、元気なうちに遺言を残したい」という70代の女性からのご相談です。\n\n## 対応内容\n\n- 遺言の内容・希望のヒアリング\n- 公証役場との調整・書類準備\n- 公正証書遺言の作成立ち会いサポート\n\n## 結果\n\nお客様の想いをしっかりと遺言書に反映することができました。「これで安心して過ごせる」と喜んでいただきました。`,
        excerpt: '「元気なうちに想いを残したい」70代女性の公正証書遺言作成を全面サポート。公証役場との調整から立ち会いまで対応。',
        category: '遺言書作成',
        tags: ['遺言', '公正証書', '終活'],
        coverImage: '/assets/images/blog/blog-will.jpg',
        status: 'published',
      },
      {
        title: 'エンディングノート作成ワークショップを開催しました',
        body: `## 開催概要\n\n札幌市内の地域センターにて、エンディングノート作成ワークショップを開催しました。\n\n## 参加者\n\n約20名の方にご参加いただきました。\n\n## 内容\n\n- 終活とは何か？わかりやすく解説\n- エンディングノートの書き方実践\n- 個別質問コーナー\n\n次回も開催予定です。ご興味のある方はお気軽にお問い合わせください。`,
        excerpt: '地域センターにて約20名参加のエンディングノートワークショップを開催。終活の基礎から実践まで丁寧にサポートしました。',
        category: '終活サポート',
        tags: ['終活', 'ワークショップ', 'エンディングノート'],
        coverImage: '/assets/images/blog/blog-workshop.jpg',
        status: 'published',
      },
    ];
    samples.forEach(s => this.create(s));
  },
};
/* ─────────────────────────────────────────────
   EC商品 CRUD (将来拡張用スケルトン)
───────────────────────────────────────────── */
const Products = {
  getAll()          { return load(STORE_KEYS.products) || []; },
  getById(id)       { return this.getAll().find(p => p.id === id) || null; },
  create(data)      {
    const list = this.getAll();
    const item = { id: generateId(), ...data, createdAt: now(), updatedAt: now() };
    list.unshift(item);
    save(STORE_KEYS.products, list);
    return item;
  },
  update(id, data)  {
    const list = this.getAll();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: now() };
    save(STORE_KEYS.products, list);
    return list[idx];
  },
  delete(id)        {
    save(STORE_KEYS.products, this.getAll().filter(p => p.id !== id));
  },
};

/* ─────────────────────────────────────────────
   画像：Base64 変換ユーティリティ
───────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────────
   日付フォーマット
───────────────────────────────────────────── */
function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ─────────────────────────────────────────────
   簡易 Markdown → HTML 変換
   （本番では marked.js 等に差し替え推奨）
───────────────────────────────────────────── */
function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // h2, h3
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // bold, italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // ul
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // hr
    .replace(/^---$/gm, '<hr>')
    // paragraph (空行で区切り)
    .split(/\n{2,}/)
    .map(block => {
      if (/^<(h[23]|ul|hr|li)/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

/* ─────────────────────────────────────────────
   Export
───────────────────────────────────────────── */
window.KK = { Auth, Posts, Products, formatDate, markdownToHtml, fileToBase64 };
