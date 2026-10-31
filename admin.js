/**
 * Trang quản trị & Báo cáo Tương tác Chuyện Nhà Táo:
 * 1. Phân tích Cảm xúc Cá chép, Bình luận & Lượt chia sẻ (Analytics Dashboard).
 * 2. Theo dõi Người tham gia & Thẻ Thông Hành O2O (Passport Table).
 * 3. Quản lý & In ấn Mã QR Sự kiện.
 * 
 * Dữ liệu thời gian thực từ /api/admin (Upstash Redis trên Vercel).
 * Khi chạy cục bộ / offline, tự động đồng bộ từ localStorage trình duyệt để xem trước.
 */
(function () {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Hằng số phân trang & nhãn
  const GATE_CODE = 'CONG23';
  const STATIONS = [
    ['Trạm Tôn Kính', 'TONKI1'],
    ['Trạm Mái Ấm', 'MAIAM2'],
    ['Trạm Nhìn Lại', 'NHINL3'],
    ['Trạm Hướng Thiện', 'HUONG4']
  ];
  const PRIZE_LABEL = { sticker: 'Sticker', keychain: 'Móc khoá', blindbox: 'Blindbox', none: 'Không trúng' };
  const PAGE_COUNT = 18;

  const CARP_INFO = {
    maiam: { name: 'Mái Ấm', meaning: 'Gia đình & Hòa thuận', color: '#f59e0b', img: 'images/reaction/maiam.webp' },
    tonkinh: { name: 'Tôn Kính', meaning: 'Lễ nghĩa & Cội nguồn', color: '#ef4444', img: 'images/reaction/tonkinh.webp' },
    nhinlai: { name: 'Nhìn Lại', meaning: 'Chiêm nghiệm & Tự soi', color: '#3b82f6', img: 'images/reaction/nhinlai.webp' },
    huongthien: { name: 'Hướng Thiện', meaning: 'Bao dung & Việc thiện', color: '#10b981', img: 'images/reaction/huongthien.webp' }
  };

  const SHARE_CHANNEL_INFO = {
    facebook: { name: 'Facebook', icon: 'ph-facebook-logo', color: '#1877f2' },
    zalo: { name: 'Zalo', icon: 'ph-chat-circle-dots', color: '#0068ff' },
    copy: { name: 'Sao chép liên kết', icon: 'ph-copy', color: '#8b5cf6' },
    native: { name: 'Chia sẻ hệ thống / Di động', icon: 'ph-share-network', color: '#10b981' }
  };

  const PAGE_META = [
    { page: 'p_0', index: 0, label: 'Bìa sách', chapter: 'chung' },
    { page: 'p_1', index: 1, label: 'Lời mở đầu', chapter: 'chung' },
    { page: 'p_2', index: 2, label: 'Mục lục', chapter: 'chung' },
    { page: 'p_3', index: 3, label: 'Chương I: Mái ấm · Trang 1/5', chapter: 'ch1' },
    { page: 'p_4', index: 4, label: 'Chương I: Mái ấm · Trang 2/5', chapter: 'ch1' },
    { page: 'p_5', index: 5, label: 'Chương I: Mái ấm · Trang 3/5', chapter: 'ch1' },
    { page: 'p_6', index: 6, label: 'Chương I: Mái ấm · Trang 4/5', chapter: 'ch1' },
    { page: 'p_7', index: 7, label: 'Chương I: Mái ấm · Trang 5/5', chapter: 'ch1' },
    { page: 'p_8', index: 8, label: 'Chương I: Mái ấm · Huy hiệu', chapter: 'ch1' },
    { page: 'p_9', index: 9, label: 'Chương II: Tôn kính · Đang biên soạn', chapter: 'ch2' },
    { page: 'p_10', index: 10, label: 'Chương II: Tôn kính · Huy hiệu', chapter: 'ch2' },
    { page: 'p_11', index: 11, label: 'Chương III: Nhìn lại · Đang biên soạn', chapter: 'ch3' },
    { page: 'p_12', index: 12, label: 'Chương III: Nhìn lại · Huy hiệu', chapter: 'ch3' },
    { page: 'p_13', index: 13, label: 'Chương IV: Hướng thiện · Đang biên soạn', chapter: 'ch4' },
    { page: 'p_14', index: 14, label: 'Chương IV: Hướng thiện · Huy hiệu', chapter: 'ch4' },
    { page: 'p_15', index: 15, label: 'Tổng kết', chapter: 'chung' },
    { page: 'p_16', index: 16, label: 'Sự kiện Đêm 23', chapter: 'chung' },
    { page: 'p_17', index: 17, label: 'Bìa sau', chapter: 'chung' }
  ];

  const pageName = (p) => {
    if (p == null) return '—';
    const found = PAGE_META.find((m) => m.index === p);
    return found ? found.label : `Trang ${p}`;
  };

  // State quản trị
  const state = {
    rows: [],
    analytics: null,
    inventory: null,
    rounds: [],
    activeRoundId: 'round_1',
    selectedRoundId: 'round_1',
    sort: { k: 'seen', dir: -1 },
    pageSort: { k: 'hotScore', dir: -1 },
    q: '',
    commentFilter: { chapter: 'all', q: '' },
    source: 'api',
    activeTab: 'tab-community'
  };

  const KEY = 'cnt_admin_key';
  const TTL = 8 * 3600 * 1000;
  const getKey = () => {
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      return v && Date.now() - v.at < TTL ? v.key : '';
    } catch (e) {
      return '';
    }
  };
  const setKey = (v) => {
    try {
      if (v) sessionStorage.setItem(KEY, JSON.stringify({ key: v, at: Date.now() }));
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
  };

  function notice(html) {
    const n = $('#notice');
    n.hidden = !html;
    n.innerHTML = html ? `<i class="ph ph-info" aria-hidden="true"></i><div>${html}</div>` : '';
  }

  // Tạo số liệu phân tích offline / demo từ localStorage
  function localAnalytics() {
    const get = (k, f) => {
      try {
        const v = localStorage.getItem('cnt_' + k);
        return v === null ? f : JSON.parse(v);
      } catch (e) {
        return f;
      }
    };

    const localShares = get('shares', { total: 0, channels: {}, pages: {} });
    const localReacts = get('user_page_reactions', {});
    const mobS = Number(localShares.channels?.mobile || localShares.channels?.native || 0);
    const webS = Number(localShares.channels?.web || localShares.channels?.copy || 0);
    const totalShares = localShares.total || (mobS + webS);

    let totalReactions = 0;
    let maiamSum = 0;
    let tonkinhSum = 0;
    let nhinlaiSum = 0;
    let huongthienSum = 0;
    const allComments = [];

    const pages = PAGE_META.map((meta) => {
      const userType = localReacts[meta.page];
      let pMaiam = userType === 'maiam' ? 1 : 0;
      let pTonkinh = userType === 'tonkinh' ? 1 : 0;
      let pNhinlai = userType === 'nhinlai' ? 1 : 0;
      let pHuongthien = userType === 'huongthien' ? 1 : 0;

      const pTotal = pMaiam + pTonkinh + pNhinlai + pHuongthien;
      totalReactions += pTotal;
      maiamSum += pMaiam;
      tonkinhSum += pTonkinh;
      nhinlaiSum += pNhinlai;
      huongthienSum += pHuongthien;

      const pageComm = get(`offline_comm_${meta.page}`, []);

      pageComm.forEach((c) => {
        allComments.push(Object.assign({}, c, { page: meta.page, pageLabel: meta.label }));
      });

      const pShares = Number(localShares.pages?.[meta.page] || 0);
      const hotScore = (pTotal * 1) + (pageComm.length * 3) + (pShares * 5);

      return {
        page: meta.page,
        index: meta.index,
        label: meta.label,
        chapter: meta.chapter,
        reactions: {
          total: pTotal,
          maiam: pMaiam,
          tonkinh: pTonkinh,
          nhinlai: pNhinlai,
          huongthien: pHuongthien
        },
        commentsCount: pageComm.length,
        sharesCount: pShares,
        hotScore
      };
    });

    const carpRanked = [
      { type: 'maiam', name: 'Mái Ấm', count: maiamSum, color: '#f59e0b' },
      { type: 'tonkinh', name: 'Tôn Kính', count: tonkinhSum, color: '#ef4444' },
      { type: 'nhinlai', name: 'Nhìn Lại', count: nhinlaiSum, color: '#3b82f6' },
      { type: 'huongthien', name: 'Hướng Thiện', count: huongthienSum, color: '#10b981' }
    ].sort((a, b) => b.count - a.count);

    allComments.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));

    const usersCount = 1;
    const totalInteractions = totalReactions + allComments.length + totalShares;

    return {
      kpis: {
        totalInteractions,
        totalReactions,
        totalComments: allComments.length,
        totalShares,
        usersCount,
        engagementRate: (totalInteractions / Math.max(1, usersCount)).toFixed(2),
        shareRate: ((totalShares / Math.max(1, usersCount)) * 100).toFixed(1),
        commentRate: ((allComments.length / Math.max(1, usersCount)) * 100).toFixed(1),
        dominantEmotion: carpRanked[0]
      },
      reactions: {
        total: totalReactions,
        maiam: maiamSum,
        tonkinh: tonkinhSum,
        nhinlai: nhinlaiSum,
        huongthien: huongthienSum,
        ranked: carpRanked
      },
      shares: {
        total: totalShares,
        mobile: mobS,
        web: webS,
        pages: localShares.pages || {}
      },
      comments: {
        total: allComments.length,
        items: allComments
      },
      pages
    };
  }

  // Dữ liệu người dùng từ localStorage khi offline
  function localRows() {
    const get = (k, f) => {
      try {
        const v = localStorage.getItem('cnt_' + k);
        return v === null ? f : JSON.parse(v);
      } catch (e) {
        return f;
      }
    };
    const vid = get('vid', null);
    if (!vid) return [];
    const pass = get('pass', null);
    const stats = get('stats', { flips: 0, pages: [], last: null });
    const spins = (pass && pass.spins) || {};
    return [
      {
        vid,
        pid: pass ? pass.id : null,
        name: pass ? pass.nickname : '',
        flips: stats.flips || 0,
        pages: (stats.pages || []).slice().sort((a, b) => a - b),
        last: stats.last,
        chapters: get('chapters_done', []).map((i) => i + 1).sort(),
        stamps: pass ? pass.stamps.slice().sort() : [],
        prizes: [1, 2, 3, 4].map((s) => (spins[s] ? spins[s].prize : null)),
        claimed: !!(pass && pass.claimed),
        checkin: (get('checkin', null) || {}).at || 0,
        first: 0,
        seen: Date.now()
      }
    ];
  }

  const DEFAULT_LOCAL_PRIZES = [
    { key: 'sticker', name: 'Sticker Táo Quân', short: 'Sticker', color: '#b8241c', ink: '#fff3d6', icon: '🏷️', stock: 70, rate: 45, isGift: true },
    { key: 'keychain', name: 'Móc khoá cá chép', short: 'Móc khoá', color: '#e3a92b', ink: '#4a2408', icon: '🔑', stock: 20, rate: 20, isGift: true },
    { key: 'blindbox', name: 'Blindbox bí ẩn', short: 'Blindbox', color: '#33245c', ink: '#f3d27a', icon: '🎁', stock: 3, rate: 5, isGift: true },
    { key: 'none', name: 'Chúc may mắn lần sau', short: 'Lời chúc', color: '#2f6a47', ink: '#fff3d6', icon: '🍀', stock: 0, rate: 30, isGift: false }
  ];

  function ensurePrizes(r) {
    if (Array.isArray(r.prizes) && r.prizes.length) {
      return r.prizes.map((p) => ({
        key: String(p.key || '').trim(),
        name: String(p.name || p.key || 'Phần quà').trim(),
        short: String(p.short || p.name || p.key).slice(0, 12).trim(),
        color: String(p.color || '#b8241c'),
        ink: String(p.ink || '#fff3d6'),
        icon: String(p.icon || (p.isGift ? '🎁' : '🍀')),
        stock: Math.max(0, Number(p.stock) || 0),
        rate: Math.max(0, Number(p.rate) || 0),
        isGift: p.isGift !== undefined ? Boolean(p.isGift) : p.key !== 'none'
      }));
    }
    const stock = r.stock || {};
    const rates = r.rates || {};
    return DEFAULT_LOCAL_PRIZES.map((dp) => ({
      key: dp.key,
      name: dp.name,
      short: dp.short,
      color: dp.color,
      ink: dp.ink,
      icon: dp.icon,
      isGift: dp.isGift,
      stock: Number(stock[dp.key] !== undefined ? stock[dp.key] : dp.stock),
      rate: Number(rates[dp.key] !== undefined ? rates[dp.key] : dp.rate)
    }));
  }

  const DEFAULT_LOCAL_ROUNDS = [
    {
      id: 'round_1',
      name: 'Đợt 1: Khởi động (Sáng 23)',
      status: 'active',
      prizes: JSON.parse(JSON.stringify(DEFAULT_LOCAL_PRIZES)),
      counts: {}
    },
    {
      id: 'round_2',
      name: 'Đợt 2: Cao điểm (Chiều 23)',
      status: 'upcoming',
      prizes: [
        { key: 'sticker', name: 'Sticker Táo Quân', short: 'Sticker', color: '#b8241c', ink: '#fff3d6', icon: '🏷️', stock: 70, rate: 45, isGift: true },
        { key: 'keychain', name: 'Móc khoá cá chép', short: 'Móc khoá', color: '#e3a92b', ink: '#4a2408', icon: '🔑', stock: 20, rate: 20, isGift: true },
        { key: 'blindbox', name: 'Blindbox bí ẩn', short: 'Blindbox', color: '#33245c', ink: '#f3d27a', icon: '🎁', stock: 4, rate: 5, isGift: true },
        { key: 'none', name: 'Chúc may mắn lần sau', short: 'Lời chúc', color: '#2f6a47', ink: '#fff3d6', icon: '🍀', stock: 0, rate: 30, isGift: false }
      ],
      counts: {}
    },
    {
      id: 'round_3',
      name: 'Đợt 3: Đêm hội Táo Quân (Tối 23)',
      status: 'upcoming',
      prizes: [
        { key: 'sticker', name: 'Sticker Táo Quân', short: 'Sticker', color: '#b8241c', ink: '#fff3d6', icon: '🏷️', stock: 60, rate: 40, isGift: true },
        { key: 'keychain', name: 'Móc khoá cá chép', short: 'Móc khoá', color: '#e3a92b', ink: '#4a2408', icon: '🔑', stock: 10, rate: 25, isGift: true },
        { key: 'blindbox', name: 'Blindbox bí ẩn', short: 'Blindbox', color: '#33245c', ink: '#f3d27a', icon: '🎁', stock: 3, rate: 10, isGift: true },
        { key: 'none', name: 'Chúc may mắn lần sau', short: 'Lời chúc', color: '#2f6a47', ink: '#fff3d6', icon: '🍀', stock: 0, rate: 25, isGift: false }
      ],
      counts: {}
    }
  ];

  function localInventory() {
    const get = (k, f) => {
      try {
        const v = localStorage.getItem('cnt_' + k);
        return v === null ? f : JSON.parse(v);
      } catch (e) {
        return f;
      }
    };
    const rounds = get('prize_rounds', DEFAULT_LOCAL_ROUNDS);
    const activeId = get('active_round_id', 'round_1');
    const totalCounts = get('prize_counts', {});

    const enrichedRounds = rounds.map((r) => {
      const counts = r.counts || {};
      const prizes = ensurePrizes(r);
      const items = {};
      prizes.forEach((p) => {
        const max = Number(p.stock || 0);
        const awarded = Number(counts[p.key] || 0);
        const remaining = p.isGift ? Math.max(0, max - awarded) : 999999;
        items[p.key] = {
          key: p.key,
          name: p.name,
          short: p.short,
          color: p.color,
          icon: p.icon,
          isGift: p.isGift,
          rate: p.rate,
          max,
          awarded,
          remaining: p.isGift ? remaining : '—',
          isOut: p.isGift && remaining <= 0
        };
      });
      return {
        id: r.id,
        name: r.name,
        status: r.id === activeId ? 'active' : (r.status === 'ended' ? 'ended' : 'upcoming'),
        prizes,
        stock: r.stock || {},
        rates: r.rates || {},
        counts,
        items
      };
    });

    const inv = {};
    enrichedRounds.forEach((r) => {
      r.prizes.forEach((p) => {
        if (!p.isGift) return;
        if (!inv[p.key]) {
          inv[p.key] = {
            key: p.key,
            name: p.name,
            short: p.short,
            icon: p.icon,
            color: p.color,
            max: 0,
            awarded: Number(totalCounts[p.key] || 0)
          };
        }
        inv[p.key].max += Number(p.stock || 0);
      });
    });
    Object.keys(inv).forEach((k) => {
      inv[k].remaining = Math.max(0, inv[k].max - inv[k].awarded);
      inv[k].isOut = inv[k].remaining <= 0;
    });

    return { rounds: enrichedRounds, activeRoundId: activeId, inventory: inv };
  }

  function enrich(r) {
    return Object.assign(r, {
      pagesN: r.pages.length,
      chaptersN: r.chapters.length,
      stampsN: r.stamps.length,
      prizesTxt: r.prizes.filter((p) => p && p !== 'none').map((p) => PRIZE_LABEL[p]).join(', ')
    });
  }

  async function load() {
    let res;
    try {
      res = await fetch('/api/admin', {
        headers: { 'x-admin-key': getKey() },
        cache: 'no-store'
      });
    } catch (e) {
      return showLocal('Không kết nối được máy chủ.');
    }

    if (res.status === 401) {
      setKey('');
      return showLogin('');
    }
    if (res.status === 429) {
      setKey('');
      return showLogin('Sai mật khẩu quá nhiều lần. Thử lại sau 15 phút.');
    }
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      return showLocal('Đang chạy ở máy nên chưa có API.');
    }

    let data = {};
    try {
      data = await res.json();
    } catch (e) {}

    if (res.status === 503) {
      return showLocal(
        data.reason === 'key'
          ? 'Chưa đặt mật khẩu quản trị. Vào Vercel → Settings → Environment Variables, thêm <code>ADMIN_KEY</code> rồi Redeploy.'
          : 'Chưa nối kho dữ liệu Upstash Redis trên Vercel.'
      );
    }
    if (!res.ok) return showLocal('Kho dữ liệu đang bảo trì, thử tải lại sau ít phút.');

    state.source = 'api';
    state.rows = (data.rows || []).map(enrich);
    state.analytics = data.analytics || null;
    state.inventory = data.inventory || null;
    state.rounds = data.rounds || [];
    state.activeRoundId = data.activeRoundId || 'round_1';
    if (!state.selectedRoundId || !state.rounds.some((r) => r.id === state.selectedRoundId)) {
      state.selectedRoundId = state.activeRoundId;
    }
    notice('');
    showApp();
  }

  function showLocal(why) {
    state.source = 'local';
    state.rows = localRows().map(enrich);
    state.analytics = localAnalytics();
    const loc = localInventory();
    state.inventory = loc.inventory;
    state.rounds = loc.rounds;
    state.activeRoundId = loc.activeRoundId;
    if (!state.selectedRoundId || !state.rounds.some((r) => r.id === state.selectedRoundId)) {
      state.selectedRoundId = state.activeRoundId;
    }
    notice(`${why} Đang hiển thị <strong>số liệu mẫu / trình duyệt cục bộ</strong> để kiểm tra giao diện.`);
    showApp();
  }

  function showLogin(err) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#login-err').textContent = err || '';
    $('#adm-key').focus();
  }

  function showApp() {
    $('#login').hidden = true;
    $('#app').hidden = false;
    render();
    renderQR();
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  function initTabs() {
    const tabs = $$('.adm-tab-btn');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        tabs.forEach((t) => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });
        $$('.adm-tab-panel').forEach((panel) => {
          panel.hidden = panel.id !== targetId;
        });
        state.activeTab = targetId;
      });
    });
  }

  // =========================================================================
  // RENDER TOÀN BỘ SỐ LIỆU TƯƠNG TÁC (TAB 1)
  // =========================================================================
  function renderAnalytics() {
    const a = state.analytics;
    if (!a) return;

    // 1. KPI Cards
    const kpis = a.kpis || {};
    $('#kpi-total-num').textContent = (kpis.totalInteractions || 0).toLocaleString('vi-VN');
    $('#kpi-avg-rate').textContent = `${kpis.engagementRate || '0.0'} lượt/người`;
    $('#kpi-reactions-num').textContent = (kpis.totalReactions || 0).toLocaleString('vi-VN');
    
    const dom = kpis.dominantEmotion;
    const domEl = $('#kpi-dominant-emotion');
    if (dom && domEl) {
      domEl.textContent = `${dom.name} (${dom.count || 0})`;
      domEl.style.color = dom.color || '#92400e';
    }

    $('#kpi-comments-num').textContent = (kpis.totalComments || 0).toLocaleString('vi-VN');
    $('#kpi-comment-rate').textContent = `${kpis.commentRate || '0.0'}%`;
    $('#kpi-shares-num').textContent = (kpis.totalShares || 0).toLocaleString('vi-VN');
    $('#kpi-share-rate').textContent = `${kpis.shareRate || '0.0'}%`;

    // 2. Phân Bổ 4 Cá Chép
    const sentList = $('#sentiment-list');
    if (sentList && a.reactions) {
      const totalR = Math.max(1, a.reactions.total || 0);
      const ranked = a.reactions.ranked || [];
      sentList.innerHTML = ranked
        .map((carp) => {
          const info = CARP_INFO[carp.type] || {};
          const pct = Math.round((carp.count / totalR) * 100);
          return `
            <div class="stat-row">
              <div class="stat-meta">
                <span class="stat-label">
                  <img class="stat-carp-icon" src="${info.img}" alt="${info.name}">
                  <strong>${info.name}</strong>
                  <small style="color:var(--text-muted); font-weight:400;">(${info.meaning})</small>
                </span>
                <span><b>${(carp.count || 0).toLocaleString('vi-VN')}</b> <small style="color:var(--text-muted);">(${pct}%)</small></span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width: ${pct}%; background: ${info.color || '#f59e0b'};"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 3. Hiệu Quả Lan Tỏa & Chia Sẻ Sách
    const shareList = $('#share-channels-list');
    if (shareList && a.shares) {
      const totalS = a.shares.total || 0;
      const mobS = a.shares.mobile || 0;
      const webS = a.shares.web || 0;
      const mobPct = totalS > 0 ? Math.round((mobS / totalS) * 100) : 0;
      const webPct = totalS > 0 ? Math.round((webS / totalS) * 100) : 0;

      const topPages = (a.pages || [])
        .filter((p) => p.sharesCount > 0)
        .sort((p1, p2) => p2.sharesCount - p1.sharesCount)
        .slice(0, 3);

      shareList.innerHTML = `
        <div class="stat-row">
          <div class="stat-meta">
            <span class="stat-label">
              <i class="ph ph-device-mobile" style="font-size:18px; color:#10b981;"></i>
              <strong>Chia sẻ qua Điện thoại (Menu ứng dụng)</strong>
            </span>
            <span><b>${mobS.toLocaleString('vi-VN')}</b> <small style="color:var(--text-muted);">(${mobPct}%)</small></span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width: ${mobPct}%; background: #10b981;"></div>
          </div>
          <small style="color:var(--text-muted); font-size:12.5px;">Người đọc mở bảng chia sẻ gốc của điện thoại để gửi qua Zalo, Messenger, SMS, AirDrop...</small>
        </div>

        <div class="stat-row" style="margin-top: 10px;">
          <div class="stat-meta">
            <span class="stat-label">
              <i class="ph ph-desktop" style="font-size:18px; color:#8b5cf6;"></i>
              <strong>Chia sẻ qua Máy tính (Sao chép liên kết)</strong>
            </span>
            <span><b>${webS.toLocaleString('vi-VN')}</b> <small style="color:var(--text-muted);">(${webPct}%)</small></span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width: ${webPct}%; background: #8b5cf6;"></div>
          </div>
          <small style="color:var(--text-muted); font-size:12.5px;">Người đọc sao chép liên kết sách hoặc chia sẻ từ trình duyệt web máy tính.</small>
        </div>

        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line);">
          <strong style="font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
            <i class="ph-fill ph-trophy" style="color: #f59e0b;"></i> Top Trang Được Chia Sẻ Nhiều Nhất:
          </strong>
          <div style="display: grid; gap: 6px; margin-top: 8px;">
            ${topPages.length > 0 ? topPages.map((p, idx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; background:var(--surface-2); padding:6px 12px; border-radius:8px;">
                <span><strong>#${idx + 1}</strong> ${esc(p.label)}</span>
                <span style="font-weight:700; color:var(--accent);">${p.sharesCount} lượt</span>
              </div>
            `).join('') : '<p style="color:var(--text-muted); font-size:13px; margin:4px 0;">Chưa ghi nhận lượt chia sẻ nào.</p>'}
          </div>
        </div>
      `;
    }

    // 4. Bảng Bản Đồ Nhiệt Từng Trang
    renderPageHeatmap();

    // 5. Nhật Ký Bình Luận
    renderCommentsFeed();
  }

  // Render bảng Heatmap trang
  function renderPageHeatmap() {
    const a = state.analytics;
    const tbody = $('#page-heatmap-rows');
    if (!tbody || !a || !a.pages) return;

    const { k, dir } = state.pageSort;
    $$('th[data-pk]').forEach((th) => {
      th.setAttribute('aria-sort', th.dataset.pk === k ? (dir > 0 ? 'ascending' : 'descending') : 'none');
    });

    const maxHot = Math.max(1, ...a.pages.map((p) => p.hotScore || 0));

    const sortedPages = a.pages.slice().sort((p1, p2) => {
      let v1 = p1[k];
      let v2 = p2[k];
      if (k === 'totalReact') {
        v1 = p1.reactions?.total || 0;
        v2 = p2.reactions?.total || 0;
      }
      return (v1 > v2 ? 1 : v1 < v2 ? -1 : 0) * dir;
    });

    tbody.innerHTML = sortedPages
      .map((p) => {
        const r = p.reactions || {};
        const hotPct = Math.round((p.hotScore / maxHot) * 100);
        return `
          <tr>
            <td><span class="mono">${p.page}</span></td>
            <td><strong>${esc(p.label)}</strong></td>
            <td class="num">
              <b>${(r.total || 0).toLocaleString('vi-VN')}</b>
              <div class="carp-mini-icons" title="Mái Ấm: ${r.maiam} · Tôn Kính: ${r.tonkinh} · Nhìn Lại: ${r.nhinlai} · Hướng Thiện: ${r.huongthien}">
                <small style="color:#f59e0b;">${r.maiam || 0}</small>·<small style="color:#ef4444;">${r.tonkinh || 0}</small>·<small style="color:#3b82f6;">${r.nhinlai || 0}</small>·<small style="color:#10b981;">${r.huongthien || 0}</small>
              </div>
            </td>
            <td class="num"><b>${(p.commentsCount || 0).toLocaleString('vi-VN')}</b></td>
            <td class="num"><b>${(p.sharesCount || 0).toLocaleString('vi-VN')}</b></td>
            <td class="num">
              <div class="heat-cell">
                <b>${(p.hotScore || 0).toLocaleString('vi-VN')}</b>
                <span class="heat-bar"><i class="heat-fill" style="width: ${hotPct}%;"></i></span>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Render danh sách bình luận trực tiếp
  function renderCommentsFeed() {
    const a = state.analytics;
    const feed = $('#comments-feed');
    if (!feed || !a || !a.comments) return;

    const list = a.comments.items || [];
    const filterCh = state.commentFilter.chapter;
    const q = state.commentFilter.q;

    const filtered = list.filter((c) => {
      const matchCh = filterCh === 'all' || (c.chapter || 'chung') === filterCh;
      const matchQ = !q || (c.name || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q);
      return matchCh && matchQ;
    });

    $('#comments-total-desc').textContent = `Hiển thị ${filtered.length} / ${list.length} bình luận của độc giả.`;

    if (filtered.length === 0) {
      feed.innerHTML = `<div class="empty">Không tìm thấy bình luận nào phù hợp với bộ lọc.</div>`;
      return;
    }

    feed.innerHTML = filtered
      .map((c) => {
        const timeStr = c.ts ? new Date(c.ts).toLocaleString('vi-VN') : 'Vừa xong';
        const pageTxt = c.pageLabel || pageName(Number(String(c.page || '').replace('p_', '')));
        const av = (c.name || 'B').trim()[0].toUpperCase();
        return `
          <div class="comment-card">
            <div class="c-top">
              <span class="c-user">
                <span class="c-avatar">${av}</span>
                <span>${esc(c.name || 'Bạn đọc giấu tên')}</span>
              </span>
              <span class="c-page-tag">${esc(pageTxt)}</span>
            </div>
            <div class="c-body">${esc(c.content || '')}</div>
            <div class="c-bot">
              <time><i class="ph ph-clock"></i> ${timeStr}</time>
              <span><i class="ph-fill ph-heart" style="color:#ef4444;"></i> ${c.likes || 0}</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // =========================================================================
  // RENDER QUẢN LÝ ĐỢT QUAY (ROUNDS), TỈ LỆ (%) & KHO QUÀ (TAB 2)
  // =========================================================================
  function renderRoundsNav() {
    const nav = $('#round-nav-wrap');
    if (!nav) return;
    const rounds = state.rounds || [];
    nav.innerHTML = rounds
      .map((r) => {
        const isSelected = r.id === state.selectedRoundId;
        const isLive = r.id === state.activeRoundId;
        let badge = '';
        if (isLive) badge = `<span class="r-badge is-live">Đang chạy</span>`;
        else if (r.status === 'ended') badge = `<span class="r-badge is-ended">Đã xong</span>`;
        else badge = `<span class="r-badge is-upcoming">Sắp tới</span>`;

        return `
          <button type="button" class="round-pill ${isSelected ? 'is-selected' : ''}" data-round-id="${r.id}">
            <i class="ph ${isLive ? 'ph-broadcast' : 'ph-clock'}"></i>
            <span>${esc(r.name)}</span>
            ${badge}
          </button>
        `;
      })
      .join('');

    $$('.round-pill', nav).forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedRoundId = btn.dataset.roundId;
        renderRoundsNav();
        renderInventory();
      });
    });
  }

  function updateRateVisualizer() {
    const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds[0];
    if (!curRound) return;
    const prizes = curRound.prizes || [];

    let sum = 0;
    const currentRates = {};
    prizes.forEach((p) => {
      const input = $(`#rate-input-${p.key}`);
      const val = input ? Math.max(0, parseFloat(input.value) || 0) : Number(p.rate || 0);
      currentRates[p.key] = val;
      sum += val;
    });
    sum = Math.round(sum * 10) / 10;

    const base = sum > 0 ? sum : 100;
    const track = $('#rate-track');
    if (track) {
      track.innerHTML = prizes
        .map((p) => {
          const w = currentRates[p.key] || 0;
          const pct = ((w / base) * 100).toFixed(1);
          return `<div class="rate-seg" style="width:${pct}%; background:${p.color || '#f59e0b'};" title="${esc(p.short)}: ${w}%"></div>`;
        })
        .join('');
    }

    const badge = $('#rate-total-badge');
    const warningBox = $('#rate-warning-box');
    const warningMsg = $('#rate-warning-msg');
    const saveBtn = $('#btn-save-round') || $('#btn-save-stock');

    const isValid100 = sum === 100;

    if (badge) {
      if (isValid100) {
        badge.innerHTML = `<i class="ph-fill ph-check-circle" style="color:#16a34a;"></i> Tổng: 100% (Hợp lệ để áp dụng)`;
        badge.style.color = '#16a34a';
      } else {
        const diff = Math.round(Math.abs(100 - sum) * 10) / 10;
        badge.innerHTML = `<i class="ph-fill ph-warning-circle" style="color:#dc2626;"></i> Tổng: ${sum}% (${sum < 100 ? 'Thiếu ' + diff + '%' : 'Dư ' + diff + '%'})`;
        badge.style.color = '#dc2626';
      }
    }

    if (warningBox) {
      if (!isValid100) {
        warningBox.style.display = 'flex';
        if (warningMsg) {
          const diff = Math.round(Math.abs(100 - sum) * 10) / 10;
          warningMsg.innerHTML = `Tổng tỉ lệ hiện tại là <strong>${sum}%</strong> (${sum < 100 ? 'còn thiếu ' + diff + '%' : 'đang dư ' + diff + '%'}). <strong>Bắt buộc tổng phải bằng đúng 100%</strong> mới được áp dụng vào vòng quay!`;
        }
      } else {
        warningBox.style.display = 'none';
      }
    }

    if (saveBtn) {
      saveBtn.disabled = !isValid100;
      saveBtn.style.opacity = isValid100 ? '1' : '0.6';
      saveBtn.title = isValid100 ? 'Lưu và áp dụng cấu hình vào vòng quay' : 'Tổng tỉ lệ phải bằng đúng 100% mới được lưu';
    }

    const summary = $('#rate-summary-text');
    if (summary) {
      summary.innerHTML = prizes
        .map((p) => {
          const w = currentRates[p.key] || 0;
          return `<span style="color:${p.color || '#4b5563'}; font-weight:600;">● ${esc(p.short)}: ${w}%</span>`;
        })
        .join('');
    }
  }

  function syncCurRoundFromDOM() {
    const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds?.[0];
    if (!curRound || !curRound.prizes) return;
    curRound.prizes.forEach((p) => {
      const shortInp = $(`#short-input-${p.key}`);
      if (shortInp) p.short = shortInp.value.trim() || p.short;
      const rateInp = $(`#rate-input-${p.key}`);
      if (rateInp) p.rate = Math.max(0, parseFloat(rateInp.value) || 0);
      const stockInp = $(`#stock-input-${p.key}`);
      if (stockInp && p.isGift) p.stock = Math.max(0, parseInt(stockInp.value, 10) || 0);
    });
  }

  async function switchRound(roundId) {
    if (state.source === 'api') {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
          body: JSON.stringify({ action: 'switch_round', roundId })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.activeRoundId = roundId;
          state.selectedRoundId = roundId;
          await load();
        } else {
          alert('Không thể chuyển đợt: ' + (data.error || ''));
        }
      } catch (e) {
        alert('Lỗi kết nối máy chủ.');
      }
    } else {
      state.activeRoundId = roundId;
      state.selectedRoundId = roundId;
      localStorage.setItem('cnt_active_round_id', roundId);
      const loc = localInventory();
      state.inventory = loc.inventory;
      state.rounds = loc.rounds;
      renderInventory();
    }
  }

  async function deleteRound(roundId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đợt quay này không?')) return;
    if (state.source === 'api') {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
          body: JSON.stringify({ action: 'delete_round', roundId })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.rounds = data.rounds;
          state.activeRoundId = data.activeRoundId;
          state.selectedRoundId = data.activeRoundId;
          await load();
        } else {
          alert('Không thể xóa đợt: ' + (data.error || ''));
        }
      } catch (e) {
        alert('Lỗi kết nối máy chủ.');
      }
    } else {
      let rounds = localRounds().filter((r) => r.id !== roundId);
      if (!rounds.length) return alert('Không thể xóa đợt duy nhất.');
      let active = state.activeRoundId;
      if (active === roundId) active = rounds[0].id;
      localStorage.setItem('cnt_prize_rounds', JSON.stringify(rounds));
      localStorage.setItem('cnt_active_round_id', active);
      state.selectedRoundId = active;
      const loc = localInventory();
      state.inventory = loc.inventory;
      state.rounds = loc.rounds;
      state.activeRoundId = loc.activeRoundId;
      renderInventory();
    }
  }

  async function saveSelectedRound() {
    const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds[0];
    if (!curRound) return;

    // Thu thập danh sách phần quà từ bảng
    const prizes = (curRound.prizes || []).map((p) => {
      const short = ($(`#short-input-${p.key}`)?.value || p.short).trim();
      const rate = Math.max(0, parseFloat($(`#rate-input-${p.key}`)?.value) || 0);
      const stock = p.isGift ? Math.max(0, parseInt($(`#stock-input-${p.key}`)?.value, 10) || 0) : 0;
      return Object.assign({}, p, { short, rate, stock });
    });

    // KIỂM TRA ĐIỀU KIỆN ĐỦ 100%
    const sum = Math.round(prizes.reduce((a, p) => a + p.rate, 0) * 10) / 10;
    if (sum !== 100) {
      alert(`Không thể áp dụng! Tổng tỉ lệ các phần quà hiện tại là ${sum}%. Bạn phải cân đối lại cho bằng đúng 100% để áp dụng vào vòng quay.`);
      return;
    }

    const name = ($('#round-name-input')?.value || curRound.name).trim();

    const btn = $('#btn-save-round') || $('#btn-save-stock');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Đang lưu & áp dụng...';
    }

    const roundPayload = {
      id: curRound.id,
      name,
      prizes
    };

    if (state.source === 'api') {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
          body: JSON.stringify({ action: 'save_round', round: roundPayload })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          if (btn) btn.innerHTML = '<i class="ph-fill ph-check-circle" style="color:#10b981;"></i> Đã lưu & Áp dụng thành công!';
          await load();
        } else {
          alert('Lỗi lưu: ' + (data.message || data.error || 'Vui lòng kiểm tra lại'));
          if (btn) btn.innerHTML = origHtml;
        }
      } catch (e) {
        alert('Không thể kết nối máy chủ.');
        if (btn) btn.innerHTML = origHtml;
      } finally {
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
          }
        }, 2000);
      }
    } else {
      let rounds = localRounds();
      const idx = rounds.findIndex((r) => r.id === curRound.id);
      if (idx !== -1) {
        rounds[idx] = Object.assign(rounds[idx], roundPayload);
        localStorage.setItem('cnt_prize_rounds', JSON.stringify(rounds));
      }
      const loc = localInventory();
      state.inventory = loc.inventory;
      state.rounds = loc.rounds;
      renderInventory();
      if (btn) {
        btn.innerHTML = '<i class="ph-fill ph-check-circle" style="color:#10b981;"></i> Đã lưu & Áp dụng (Offline)!';
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }, 1500);
      }
    }
  }

  async function addNewRound(name, bBox, keyc, stick) {
    if (state.source === 'api') {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
          body: JSON.stringify({
            action: 'add_round',
            round: {
              name,
              stock: { blindbox: bBox, keychain: keyc, sticker: stick }
            }
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.selectedRoundId = data.round?.id;
          await load();
        } else {
          alert('Lỗi tạo đợt mới: ' + (data.error || ''));
        }
      } catch (e) {
        alert('Lỗi kết nối máy chủ.');
      }
    } else {
      let rounds = localRounds();
      const newRound = {
        id: 'round_' + Date.now().toString(36),
        name: name || `Đợt ${rounds.length + 1}`,
        prizes: JSON.parse(JSON.stringify(DEFAULT_LOCAL_PRIZES)),
        status: 'upcoming',
        counts: {}
      };
      if (newRound.prizes[0]) newRound.prizes[0].stock = stick;
      if (newRound.prizes[1]) newRound.prizes[1].stock = keyc;
      if (newRound.prizes[2]) newRound.prizes[2].stock = bBox;
      rounds.push(newRound);
      localStorage.setItem('cnt_prize_rounds', JSON.stringify(rounds));
      state.selectedRoundId = newRound.id;
      const loc = localInventory();
      state.inventory = loc.inventory;
      state.rounds = loc.rounds;
      renderInventory();
    }
  }

  function renderInventory() {
    renderRoundsNav();
    const rounds = state.rounds || [];
    const curRound = rounds.find((r) => r.id === state.selectedRoundId) || rounds[0];
    if (!curRound) return;

    curRound.prizes = ensurePrizes(curRound);

    // 1. Tên đợt
    const nameInput = $('#round-name-input');
    if (nameInput) nameInput.value = curRound.name;

    // 2. Banner trạng thái
    const isLive = curRound.id === state.activeRoundId;
    const banner = $('#round-active-banner');
    if (banner) {
      banner.className = isLive ? 'round-active-banner is-live' : 'round-active-banner is-standby';
      banner.innerHTML = isLive
        ? `<span><i class="ph-fill ph-broadcast" style="color:#166534;"></i> <strong>Đợt này ĐANG DIỄN RA TRỰC TIẾP:</strong> Máy chủ và vòng quay sự kiện đang áp dụng tỉ lệ & kho quà của đợt này.</span>`
        : `<span><i class="ph-fill ph-pause-circle" style="color:#92400e;"></i> Đang xem & chỉnh sửa cấu hình của <strong>${esc(curRound.name)}</strong> (Chưa kích hoạt trực tiếp).</span>
           <button class="btn btn-primary btn-sm" type="button" id="btn-activate-cur-round" data-id="${curRound.id}"><i class="ph ph-lightning"></i> Kích hoạt đợt này ngay</button>`;
      
      $('#btn-activate-cur-round')?.addEventListener('click', () => switchRound(curRound.id));
    }

    // 3. Nút hành động đợt
    const actBtns = $('#round-action-btns');
    if (actBtns) {
      actBtns.innerHTML = rounds.length > 1
        ? `<button class="btn btn-quiet btn-sm" type="button" id="btn-delete-cur-round" data-id="${curRound.id}" style="color:#ef4444;"><i class="ph ph-trash"></i> Xóa đợt này</button>`
        : '';
      $('#btn-delete-cur-round')?.addEventListener('click', () => deleteRound(curRound.id));
    }

    // 4. Bảng kho & tỉ lệ
    const tbody = $('#inventory-rows');
    if (!tbody) return;

    const counts = curRound.counts || {};

    tbody.innerHTML = curRound.prizes
      .map((p) => {
        const awarded = Number(counts[p.key] || 0);

        if (!p.isGift) {
          return `
            <tr>
              <td>
                <span style="font-size:16px; margin-right:6px;">${p.icon || '🍀'}</span>
                <strong style="color:${p.color || '#10b981'};">${esc(p.name)}</strong>
              </td>
              <td style="text-align:center;">
                <input class="short-input" id="short-input-${p.key}" value="${esc(p.short || 'Lời chúc')}" maxlength="12" style="width:110px; text-align:center; padding:5px 8px; border-radius:8px; border:1px solid var(--line); font-size:12.5px;">
              </td>
              <td style="text-align:center;">
                <div class="rate-input-wrap">
                  <input class="rate-input" id="rate-input-${p.key}" data-key="${p.key}" type="number" min="0" max="100" value="${p.rate || 0}"><b>%</b>
                </div>
              </td>
              <td style="text-align:center; color:var(--text-muted); font-size:12.5px;">Không giới hạn</td>
              <td class="num"><b>${awarded}</b></td>
              <td class="num" style="color:var(--text-muted);">—</td>
              <td style="text-align:center;">
                <span class="stock-badge is-open"><i class="ph-fill ph-check-circle"></i> Đang mở quay</span>
              </td>
              <td style="text-align:center; color:var(--text-muted); font-size:11px;">Mặc định</td>
            </tr>
          `;
        }

        const maxVal = Number(p.stock !== undefined ? p.stock : 0);
        const remaining = Math.max(0, maxVal - awarded);
        const isOut = remaining <= 0;

        return `
          <tr>
            <td>
              <span style="font-size:16px; margin-right:6px;">${p.icon || '🎁'}</span>
              <strong style="color:${p.color || '#f59e0b'};">${esc(p.name)}</strong>
            </td>
            <td style="text-align:center;">
              <input class="short-input" id="short-input-${p.key}" value="${esc(p.short || p.name)}" maxlength="12" style="width:110px; text-align:center; padding:5px 8px; border-radius:8px; border:1px solid var(--line); font-size:12.5px;">
            </td>
            <td style="text-align:center;">
              <div class="rate-input-wrap">
                <input class="rate-input" id="rate-input-${p.key}" data-key="${p.key}" type="number" min="0" max="100" value="${p.rate || 0}"><b>%</b>
              </div>
            </td>
            <td style="text-align:center;">
              <input class="stock-input" id="stock-input-${p.key}" data-key="${p.key}" type="number" min="0" max="9999" value="${maxVal}" aria-label="Giới hạn kho ${p.name}">
            </td>
            <td class="num"><b>${awarded}</b></td>
            <td class="num">
              <b style="color:${isOut ? '#ef4444' : '#10b981'}; font-size:15px;">${remaining}</b>
            </td>
            <td style="text-align:center;">
              ${
                isOut
                  ? `<span class="stock-badge is-out"><i class="ph-fill ph-lock-key"></i> Đã hết (Khóa kim)</span>`
                  : `<span class="stock-badge is-open"><i class="ph-fill ph-check-circle"></i> Đang mở quay</span>`
              }
            </td>
            <td style="text-align:center;">
              ${
                ['blindbox', 'keychain', 'sticker'].includes(p.key)
                  ? `<span style="color:var(--text-muted); font-size:11px;">Mặc định</span>`
                  : `<button type="button" class="btn-del-prize" data-key="${p.key}" title="Xóa phần quà này"><i class="ph ph-trash"></i></button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');

    $$('.btn-del-prize', tbody).forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (!confirm('Bạn có chắc chắn muốn xóa phần quà này khỏi đợt?')) return;
        syncCurRoundFromDOM();
        curRound.prizes = curRound.prizes.filter((p) => p.key !== key);
        renderInventory();
      });
    });

    updateRateVisualizer();
    updateCloneWheel();

    // 5. Tổng kết kho toàn sự kiện
    const totalEl = $('#total-inventory-summary');
    if (totalEl && state.inventory) {
      const inv = state.inventory;
      const itemsHtml = Object.values(inv)
        .map((it) => `<span>${it.icon || '🎁'} ${esc(it.short || it.name)}: <b>${it.awarded}/${it.max}</b> (còn ${it.remaining})</span>`)
        .join(' · ');
      totalEl.innerHTML = `
        <span><i class="ph-fill ph-package"></i> <strong>Tổng kho qua ${rounds.length} đợt sự kiện:</strong></span>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:4px;">${itemsHtml}</div>
      `;
    }
  }

  // =========================================================================
  // VÒNG QUAY MAY MẮN MÔ PHỎNG (100% LIVE CLONE CHO ADMIN)
  // =========================================================================
  const cloneWheelState = {
    wheelList: [],
    prizesDict: {},
    prizesList: [],
    currentRotation: 0,
    isSpinning: false
  };

  const adminAudio = {
    ctx: null,
    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    tick() {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.035);
      } catch (e) {}
    },
    win() {
      if (!this.ctx) return;
      try {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const t = this.ctx.currentTime + i * 0.08;
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } catch (e) {}
    }
  };

  function blossomSVG(x, y, r) {
    const p = [0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.6}" transform="rotate(${i * 72})"/>`
      )
      .join('');
    return `<g transform="translate(${x} ${y})" fill="#f7b3c4" stroke="#c94b6d" stroke-width=".5">${p}<circle r="${r * 0.28}" fill="#d6336c" stroke="none"/></g>`;
  }

  function renderWheelDiskSVG(prizesDict, wheelList) {
    if (!wheelList || !wheelList.length) {
      return `<svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg"><circle r="99" fill="#7a1a0e"/><text text-anchor="middle" y="5" fill="#f3d27a" font-size="10">Chưa có quà</text></svg>`;
    }
    const pt = (deg, r) => {
      const t = ((deg - 90) * Math.PI) / 180;
      return [+(r * Math.cos(t)).toFixed(2), +(r * Math.sin(t)).toFixed(2)];
    };
    const R = 84;
    const segStart = (k) => wheelList.slice(0, k).reduce((a, b) => a + b.share * 3.6, 0);

    const parts = wheelList.map((seg, k) => {
      const a0 = segStart(k),
        a1 = a0 + seg.share * 3.6,
        mid = (a0 + a1) / 2,
        pz = prizesDict[seg.prize] || { color: '#b8241c', ink: '#fff', short: seg.prize };
      const [x0, y0] = pt(a0, R),
        [x1, y1] = pt(a1, R),
        [tx, ty] = pt(mid, 57);
      const turn = mid <= 180 ? mid - 90 : mid + 90;
      return `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${pz.color}"/>
        <line x1="0" y1="0" x2="${x0}" y2="${y0}" stroke="#f3d27a" stroke-width="1.6"/>
        <text x="${tx}" y="${ty}" transform="rotate(${turn} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', 'Be Vietnam Pro', sans-serif" font-size="${seg.share < 7 ? 8.5 : 9.5}" fill="${pz.ink}">${esc(pz.short)}</text>`;
    }).join('');

    const bulbs = Array.from({ length: 24 }, (_, i) => {
      const [x, y] = pt(i * 15, 92);
      return `<circle cx="${x}" cy="${y}" r="2.6" fill="${i % 2 ? '#fff6d8' : '#f3c64d'}" stroke="#7a1a0e" stroke-width=".6"/>`;
    }).join('');

    const flowers = wheelList.map((_, k) => {
      const [x, y] = pt(segStart(k), R - 2);
      return blossomSVG(x, y, 4.2);
    }).join('');

    return `<svg viewBox="-100 -100 200 200" role="img" xmlns="http://www.w3.org/2000/svg">
      <circle r="99" fill="#7a1a0e"/><circle r="97" fill="none" stroke="#f3d27a" stroke-width="2"/>
      ${bulbs}
      <circle r="${R + 2}" fill="#f3d27a"/>
      ${parts}
      <circle r="${R}" fill="none" stroke="#7a1a0e" stroke-width="1.2"/>
      <circle r="30" fill="none" stroke="#f3d27a" stroke-width="1.4" stroke-dasharray="2 3"/>
      ${flowers}
      <g>
        <circle r="21" fill="#e8b84a" stroke="#8a5a0b" stroke-width="2"/>
        <circle r="17" fill="none" stroke="#8a5a0b" stroke-width=".8"/>
        <rect x="-6" y="-6" width="12" height="12" fill="#7a1a0e" stroke="#8a5a0b" stroke-width="1.2"/>
        <text y="-10.5" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', sans-serif" font-size="5.5" fill="#6b3d06">PHÚC</text>
        <text y="11" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', sans-serif" font-size="5.5" fill="#6b3d06">LỘC</text>
        <circle cx="-11.5" cy="0" r="1.6" fill="#6b3d06"/><circle cx="11.5" cy="0" r="1.6" fill="#6b3d06"/>
      </g>
    </svg>`;
  }

  function updateCloneWheel() {
    const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds?.[0];
    if (!curRound) return;

    // Lấy danh sách phần quà từ DOM nếu đang nhập, hoặc từ curRound
    const prizesList = (curRound.prizes || []).map((p) => {
      const shortInp = $(`#short-input-${p.key}`);
      const rateInp = $(`#rate-input-${p.key}`);
      const stockInp = $(`#stock-input-${p.key}`);
      return {
        key: p.key,
        name: p.name,
        short: shortInp ? shortInp.value.trim() || p.short : p.short,
        icon: p.icon || (p.isGift ? 'gift' : 'clover'),
        color: p.color || '#b8241c',
        ink: p.ink || '#fff3d6',
        rate: rateInp ? Math.max(0, parseFloat(rateInp.value) || 0) : Number(p.rate || 0),
        stock: stockInp && p.isGift ? Math.max(0, parseInt(stockInp.value, 10) || 0) : Number(p.stock || 0),
        isGift: p.isGift
      };
    });

    const prizesDict = {};
    prizesList.forEach((p) => {
      prizesDict[p.key] = {
        label: p.name,
        short: p.short || p.name.slice(0, 10),
        icon: p.icon,
        color: p.color,
        ink: p.ink
      };
    });

    const segments = [];
    prizesList.forEach((p) => {
      const rate = Math.max(0, Number(p.rate) || 0);
      if (rate <= 0) return;
      if (rate >= 30) {
        const part = Math.round((rate / 3) * 10) / 10;
        segments.push({ prize: p.key, share: part }, { prize: p.key, share: part }, { prize: p.key, share: Math.round((rate - part * 2) * 10) / 10 });
      } else if (rate >= 16) {
        const part = Math.round((rate / 2) * 10) / 10;
        segments.push({ prize: p.key, share: part }, { prize: p.key, share: Math.round((rate - part) * 10) / 10 });
      } else {
        segments.push({ prize: p.key, share: rate });
      }
    });

    let wheelList = [];
    if (segments.length >= 3) {
      const mixed = [];
      const copy = segments.slice();
      while (copy.length) {
        const lastPrize = mixed.length ? mixed[mixed.length - 1].prize : null;
        let idx = copy.findIndex((s) => s.prize !== lastPrize);
        if (idx === -1) idx = 0;
        mixed.push(copy.splice(idx, 1)[0]);
      }
      wheelList = mixed;
    } else if (segments.length) {
      wheelList = segments;
    }

    cloneWheelState.wheelList = wheelList;
    cloneWheelState.prizesDict = prizesDict;
    cloneWheelState.prizesList = prizesList;

    const wheelEl = $('#admin-wheel');
    if (wheelEl) {
      wheelEl.innerHTML = renderWheelDiskSVG(prizesDict, wheelList);
      if (typeof gsap !== 'undefined' && gsap.set) {
        gsap.set(wheelEl, { rotation: cloneWheelState.currentRotation });
      } else {
        wheelEl.style.transform = `rotate(${cloneWheelState.currentRotation}deg)`;
      }
    }
  }

  function spinCloneWheel() {
    if (cloneWheelState.isSpinning) return;
    const { wheelList, prizesDict, prizesList } = cloneWheelState;
    if (!wheelList || !wheelList.length) {
      alert('Chưa có nan quạt nào trên vòng quay (Hãy thêm phần quà có tỉ lệ > 0%).');
      return;
    }

    adminAudio.init();

    const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds?.[0];
    const counts = curRound?.counts || {};

    // Xác định các món quà đã hết kho trong đợt này
    const outOfStock = new Set();
    (prizesList || []).forEach((p) => {
      if (p.isGift) {
        const awarded = Number(counts[p.key] || 0);
        if (awarded >= p.stock) outOfStock.add(p.key);
      }
    });

    // Lọc pool quà hợp lệ
    const validPool = (prizesList || []).filter((p) => p.rate > 0 && !outOfStock.has(p.key));
    if (!validPool.length) {
      alert('Toàn bộ quà trong đợt này đã hết kho hoặc tỉ lệ = 0%.');
      return;
    }

    // Bốc thăm quà theo trọng số
    const totalW = validPool.reduce((a, p) => a + p.rate, 0);
    let r = Math.random() * totalW;
    let chosenPrize = validPool[0].key;
    for (const p of validPool) {
      if (r < p.rate) {
        chosenPrize = p.key;
        break;
      }
      r -= p.rate;
    }

    // Tìm các nan quạt tương ứng với chosenPrize
    const segStart = (k) => wheelList.slice(0, k).reduce((a, b) => a + b.share * 3.6, 0);
    const segAt = (deg) => {
      let a = 0;
      for (let k = 0; k < wheelList.length; k++) {
        a += wheelList[k].share * 3.6;
        if (deg < a) return k;
      }
      return wheelList.length - 1;
    };

    const targetSegs = wheelList.map((s, i) => ({ s, i })).filter((x) => x.s.prize === chosenPrize);
    const target = targetSegs[Math.floor(Math.random() * targetSegs.length)] || { s: wheelList[0], i: 0 };
    const a0 = segStart(target.i), a1 = a0 + target.s.share * 3.6;
    const targetDeg = a0 + (a1 - a0) * (0.25 + Math.random() * 0.5);

    // Tính góc quay (ít nhất 5 vòng + dừng đúng góc)
    const baseCur = cloneWheelState.currentRotation % 360;
    const additionalTurns = 360 * 5;
    const targetTurn = cloneWheelState.currentRotation + additionalTurns + ((360 - ((targetDeg + baseCur) % 360)) % 360);

    const wheelEl = $('#admin-wheel');
    const spinBtn = $('#btn-admin-test-spin');
    const resEl = $('#admin-wheel-result');
    const diagBox = $('#admin-spin-diagnostic');
    const diagBadge = $('#diag-prize-badge');
    const diagDetails = $('#diag-prize-details');

    cloneWheelState.isSpinning = true;
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.innerHTML = '<i class="ph ph-spiral ph-spin"></i> Đang quay...';
    }
    if (resEl) {
      resEl.textContent = 'Vòng quay đang xoay...';
      resEl.style.color = '#92400e';
    }

    let lastTickSeg = -1;
    const onUpdate = () => {
      try {
        if (!wheelEl) return;
        const curRot = typeof gsap !== 'undefined' ? gsap.getProperty(wheelEl, 'rotation') : cloneWheelState.currentRotation;
        const currentDeg = (((360 - (curRot % 360)) % 360) + 360) % 360;
        const segIdx = segAt(currentDeg);
        if (segIdx !== lastTickSeg) {
          if (lastTickSeg !== -1) adminAudio.tick();
          lastTickSeg = segIdx;
        }
      } catch (e) {}
    };

    const onComplete = () => {
      cloneWheelState.currentRotation = targetTurn;
      cloneWheelState.isSpinning = false;
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.innerHTML = '<i class="ph ph-spiral"></i> Quay thử tiếp';
      }

      const winPrize = prizesDict[chosenPrize] || { label: chosenPrize, icon: '🎁', color: '#b8241c' };
      const itemConfig = (prizesList || []).find((p) => p.key === chosenPrize);
      const isGift = itemConfig?.isGift;

      if (isGift) {
        adminAudio.win();
        if (resEl) {
          resEl.innerHTML = `<span style="color:#b8241c; font-size:14.5px;"><i class="ph-fill ph-gift" style="font-size:17px;"></i> 🎉 Trúng: <strong>${esc(winPrize.label)}</strong></span>`;
        }
      } else {
        if (resEl) {
          resEl.innerHTML = `<span style="color:#2f6a47; font-size:14.5px;"><i class="ph-fill ph-clover" style="font-size:17px;"></i> 🍀 Chúc bạn may mắn lần sau!</span>`;
        }
      }

      // Cập nhật bảng chẩn đoán
      if (diagBox && diagBadge && diagDetails && itemConfig) {
        diagBox.style.display = 'block';
        diagBadge.textContent = isGift ? 'Trúng Quà' : 'Lời Chúc';
        diagBadge.style.background = isGift ? '#dcfce7' : '#f3f4f6';
        diagBadge.style.color = isGift ? '#166534' : '#4b5563';

        const awarded = Number(counts[chosenPrize] || 0);
        const rem = isGift ? Math.max(0, itemConfig.stock - awarded) : 'Không giới hạn';
        diagDetails.innerHTML = `
          Phần quà: <strong>${itemConfig.icon || '🎁'} ${esc(itemConfig.name)}</strong><br>
          Tỉ lệ xác suất: <strong>${itemConfig.rate}%</strong> · Kho đợt này: <strong>${isGift ? itemConfig.stock : '∞'}</strong><br>
          Trạng thái kim: <span style="color:#16a34a; font-weight:700;"><i class="ph-fill ph-check-circle"></i> Kim dừng chính xác vào nan quạt</span>
        `;
      }
    };

    if (typeof gsap !== 'undefined' && gsap.to) {
      gsap.fromTo(
        wheelEl,
        { rotation: cloneWheelState.currentRotation },
        {
          rotation: targetTurn,
          duration: 4.2,
          ease: 'power4.out',
          onUpdate,
          onComplete
        }
      );
    } else {
      wheelEl.style.transition = 'transform 4.2s cubic-bezier(0.15, 0.9, 0.2, 1)';
      wheelEl.style.transform = `rotate(${targetTurn}deg)`;
      setTimeout(onComplete, 4200);
    }
  }

  function resetCloneWheel() {
    if (cloneWheelState.isSpinning) return;
    cloneWheelState.currentRotation = 0;
    const wheelEl = $('#admin-wheel');
    if (wheelEl) {
      if (typeof gsap !== 'undefined' && gsap.set) gsap.set(wheelEl, { rotation: 0 });
      else {
        wheelEl.style.transition = 'none';
        wheelEl.style.transform = 'rotate(0deg)';
      }
    }
    const resEl = $('#admin-wheel-result');
    if (resEl) resEl.textContent = 'Nhấn "Quay thử nghiệm" để kiểm tra kim dừng';
    const diagBox = $('#admin-spin-diagnostic');
    if (diagBox) diagBox.style.display = 'none';
  }

  // =========================================================================
  // RENDER THÔNG TIN NGƯỜI CHƠI (TAB 2)
  // =========================================================================
  function renderPeople() {
    const R = state.rows, n = R.length || 1;
    const sum = (f) => R.reduce((a, r) => a + f(r), 0);
    const prize = (k) => sum((r) => r.prizes.filter((p) => p === k).length);
    const tiles = [
      {
        val: R.length.toLocaleString('vi-VN'),
        label: 'Người tham gia',
        sub: 'Độc giả vào ứng dụng',
        icon: 'ph-users-three',
        color: '#8b5cf6'
      },
      {
        val: R.filter((r) => r.pid).length.toLocaleString('vi-VN'),
        label: 'Đã tạo thẻ',
        sub: 'Hộ chiếu Táo Quân',
        icon: 'ph-identification-card',
        color: '#3b82f6'
      },
      {
        val: R.filter((r) => r.checkin).length.toLocaleString('vi-VN'),
        label: 'Check-in sự kiện',
        sub: 'Đã quét cổng chính',
        icon: 'ph-signpost',
        color: '#10b981'
      },
      {
        val: sum((r) => r.flips).toLocaleString('vi-VN'),
        label: 'Tổng lượt lật trang',
        sub: 'Tương tác đọc sách',
        icon: 'ph-book-open',
        color: '#f59e0b'
      },
      {
        val: `${(sum((r) => r.pagesN) / n).toFixed(1)} / ${PAGE_COUNT}`,
        label: 'Trang xem TB',
        sub: 'Độ sâu tiếp cận sách',
        icon: 'ph-file-text',
        color: '#06b6d4'
      },
      {
        val: R.filter((r) => r.chaptersN === 4).length.toLocaleString('vi-VN'),
        label: 'Nghe đủ 4 chương',
        sub: 'Hoàn thành trọn audio',
        icon: 'ph-headphones',
        color: '#ec4899'
      },
      {
        val: R.filter((r) => r.stampsN === 4).length.toLocaleString('vi-VN'),
        label: 'Đủ 4 dấu trạm',
        sub: 'Hoàn thành hành trình',
        icon: 'ph-seal-check',
        color: '#14b8a6'
      },
      {
        val: `${prize('sticker')} · ${prize('keychain')} · ${prize('blindbox')}`,
        label: 'Quà đã trúng',
        sub: 'Sticker · Móc khoá · Blindbox',
        icon: 'ph-gift',
        color: '#b8241c'
      }
    ];

    const tilesEl = $('#tiles');
    if (tilesEl) {
      tilesEl.className = 'kpi-grid';
      tilesEl.innerHTML = tiles
        .map(
          (t) => `
          <div class="kpi-card" style="border-left: 4px solid ${t.color}; padding: 14px 16px;">
            <div class="kpi-header">
              <span style="font-size: 11.5px; font-weight:700;">${esc(t.label)}</span>
              <i class="ph-fill ${t.icon}" style="color: ${t.color}; font-size: 20px;"></i>
            </div>
            <div class="kpi-num" style="font-size: 26px; margin: 4px 0;">${t.val}</div>
            <div class="kpi-sub" style="font-size: 12px; color:var(--text-muted);">${esc(t.sub)}</div>
          </div>
        `
        )
        .join('');
    }

    $('#people-sub').textContent = state.source === 'api' ? `${R.length} người, sắp theo hoạt động gần nhất` : 'Số liệu của trình duyệt này';
    renderRows();
  }

  function renderRows() {
    const { k, dir } = state.sort;
    $$('th[data-k]').forEach((th) => th.setAttribute('aria-sort', th.dataset.k === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
    const rows = state.rows
      .filter((r) => !state.q || (r.pid || '').toLowerCase().includes(state.q) || (r.name || '').toLowerCase().includes(state.q))
      .sort((a, b) => {
        const x = a[k] == null ? -1 : a[k], y = b[k] == null ? -1 : b[k];
        return (x > y ? 1 : x < y ? -1 : 0) * dir;
      });
    const dots = (arr) => `<span class="dots" aria-label="${arr.length}/4">${[1, 2, 3, 4].map((i) => `<i class="${arr.includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
    $('#rows').innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
        <td><span class="mono">${esc(r.pid || '—')}</span></td>
        <td>${esc(r.name || '(chưa tạo thẻ)')}${r.checkin ? ' <small title="Đã check-in sự kiện">· đã tới</small>' : ''}</td>
        <td class="num">${r.flips}</td>
        <td class="num">${r.pagesN}/${PAGE_COUNT}<span class="bar"><i style="width:${Math.round((r.pagesN / PAGE_COUNT) * 100)}%"></i></span></td>
        <td>${pageName(r.last)}</td>
        <td>${dots(r.chapters)} ${r.chaptersN}/4</td>
        <td>${dots(r.stamps)} ${r.stampsN}/4</td>
        <td>${esc(r.prizesTxt || '—')}${r.claimed ? ' · <strong>đã nhận quà cuối</strong>' : ''}</td>
        <td>${r.seen ? new Date(r.seen).toLocaleString('vi-VN') : '—'}</td>
      </tr>`
          )
          .join('')
      : `<tr><td class="empty" colspan="9">Chưa có ai${state.q ? ' khớp với ô tìm kiếm' : ''}.</td></tr>`;
  }

  function render() {
    renderAnalytics();
    renderInventory();
    renderPeople();
  }

  // =========================================================================
  // XUẤT CSV (NGƯỜI CHƠI & BÁO CÁO TƯƠNG TÁC SÁCH)
  // =========================================================================
  function exportPeopleCSV() {
    const head = [
      'Mã thẻ', 'Tên', 'Check-in sự kiện', 'Lượt lật trang', 'Số trang đã xem', 'Các trang đã xem',
      'Đang xem trang', 'Chương đã nghe', 'Dấu trạm', 'Quà trạm 1', 'Quà trạm 2', 'Quà trạm 3', 'Quà trạm 4',
      'Đã nhận quà cuối', 'Lần đầu', 'Gần nhất', 'Mã trình duyệt'
    ];
    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const time = (t) => (t ? new Date(t).toISOString() : '');
    const lines = state.rows.map((r) =>
      [
        r.pid, r.name, time(r.checkin), r.flips, r.pagesN, r.pages.join(' '), r.last, r.chapters.join(' '), r.stamps.join(' '),
        ...r.prizes.map((p) => (p ? PRIZE_LABEL[p] : '')), r.claimed ? 'có' : '', time(r.first), time(r.seen), r.vid
      ]
        .map(cell)
        .join(',')
    );
    const blob = new Blob(['\ufeff' + [head.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chuyen-nha-tao-nguoi-choi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function exportInteractionCSV() {
    const an = state.analytics;
    if (!an) return;

    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    // Phần 1: Thống kê từng trang sách
    const headPages = ['Mã trang', 'Tên nội dung', 'Tổng Cảm Xúc', 'Mái Ấm', 'Tôn Kính', 'Nhìn Lại', 'Hướng Thiện', 'Bình luận', 'Chia sẻ', 'Điểm Sức Hút (Hotness)'];
    const linesPages = (an.pages || []).map((p) => [
      p.page, p.label, p.reactions?.total || 0, p.reactions?.maiam || 0, p.reactions?.tonkinh || 0,
      p.reactions?.nhinlai || 0, p.reactions?.huongthien || 0, p.commentsCount || 0, p.sharesCount || 0, p.hotScore || 0
    ].map(cell).join(','));

    // Phần 2: Toàn bộ bình luận của độc giả
    const headComments = ['Mã bình luận', 'Trang sách', 'Chương', 'Người gửi', 'Nội dung', 'Thời gian', 'Lượt tim'];
    const linesComments = (an.comments?.items || []).map((c) => [
      c.id || '', c.pageLabel || c.page || '', c.chapter || '', c.name || '', c.content || '',
      c.ts ? new Date(c.ts).toLocaleString('vi-VN') : '', c.likes || 0
    ].map(cell).join(','));

    const content = [
      '# BÁO CÁO TƯƠNG TÁC TỪNG TRANG SÁCH',
      headPages.map(cell).join(','),
      ...linesPages,
      '',
      '# NHẬT KÝ BÌNH LUẬN ĐỘC GIẢ',
      headComments.map(cell).join(','),
      ...linesComments
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chuyen-nha-tao-bao-cao-tuong-tac-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // =========================================================================
  // MÃ QR SỰ KIỆN (TAB 3)
  // =========================================================================
  function renderQR() {
    const base = location.origin + '/';
    const items = [['Cổng check-in', 'Quét để check-in sự kiện', GATE_CODE, `${base}?vao=${GATE_CODE}`]].concat(
      STATIONS.map(([name, code]) => [name, 'Quét để đóng dấu và quay thưởng', code, `${base}?tram=${code}`])
    );
    const grid = $('#qr-grid');
    if (!grid || grid.dataset.done) return;
    grid.dataset.done = '1';
    grid.innerHTML = items
      .map(
        ([t, sub, code, url], i) =>
          `<div class="qr-card"><strong>${t}</strong><span>${sub}</span><div id="qr-${i}"></div><code>${code}</code><small>${url}</small></div>`
      )
      .join('');
    const draw = () =>
      items.forEach(([, , , url], i) => {
        if (typeof QRCode === 'undefined') {
          const el = document.getElementById('qr-' + i);
          if (el) el.textContent = url;
          return;
        }
        new QRCode(document.getElementById('qr-' + i), {
          text: url,
          width: 150,
          height: 150,
          colorDark: '#1b120c',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      });
    if (typeof QRCode !== 'undefined') draw();
    else window.addEventListener('load', draw, { once: true });
  }

  // =========================================================================
  // EVENT LISTENERS & KHỞI CHẠY
  // =========================================================================
  function initEvents() {
    initTabs();

    $('#login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      setKey($('#adm-key').value.trim());
      const before = getKey();
      await load();
      if (!$('#login').hidden && before && !$('#login-err').textContent) {
        $('#login-err').textContent = 'Mật khẩu quản trị chưa đúng.';
      }
    });

    $('#btn-logout')?.addEventListener('click', () => {
      setKey('');
      showLogin('');
    });

    $('#btn-reload')?.addEventListener('click', load);

    $('#btn-csv')?.addEventListener('click', exportPeopleCSV);
    $('#btn-csv-interact')?.addEventListener('click', exportInteractionCSV);

    // Lưu cấu hình Đợt quay (Rounds), Tỉ lệ (%) & Kho quà
    $('#btn-save-round')?.addEventListener('click', saveSelectedRound);
    $('#btn-save-stock')?.addEventListener('click', saveSelectedRound);

    // Mở modal Thêm Quà Mới
    $('#btn-add-prize')?.addEventListener('click', () => {
      syncCurRoundFromDOM();
      const dlg = $('#dlg-add-prize');
      if (dlg) {
        const nameInp = $('#new-prize-name');
        if (nameInp) nameInp.value = '';
        const shortInp = $('#new-prize-short');
        if (shortInp) {
          shortInp.value = '';
          shortInp.dataset.autofill = '1';
        }
        const stockInp = $('#new-prize-stock');
        if (stockInp) stockInp.value = '5';
        const rateInp = $('#new-prize-rate');
        if (rateInp) rateInp.value = '5';
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.hidden = false;
      }
    });

    $('#btn-cancel-add-prize')?.addEventListener('click', () => {
      const dlg = $('#dlg-add-prize');
      if (dlg) {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.hidden = true;
      }
    });

    $('#new-prize-name')?.addEventListener('input', (e) => {
      const shortInp = $('#new-prize-short');
      if (shortInp && (!shortInp.value || shortInp.dataset.autofill === '1')) {
        shortInp.value = e.target.value.slice(0, 12);
        shortInp.dataset.autofill = '1';
      }
    });
    $('#new-prize-short')?.addEventListener('input', () => {
      const shortInp = $('#new-prize-short');
      if (shortInp) shortInp.dataset.autofill = '0';
    });

    $('#form-add-prize')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const dlg = $('#dlg-add-prize');
      const name = ($('#new-prize-name')?.value || '').trim();
      const short = ($('#new-prize-short')?.value || name).trim();
      const icon = $('#new-prize-icon')?.value || '🎁';
      const color = $('#new-prize-color')?.value || '#0284c7';
      const stock = Math.max(0, parseInt($('#new-prize-stock')?.value, 10) || 0);
      const rate = Math.max(0, parseFloat($('#new-prize-rate')?.value) || 0);

      if (!name) return;

      const curRound = (state.rounds || []).find((r) => r.id === state.selectedRoundId) || state.rounds?.[0];
      if (!curRound) return;

      syncCurRoundFromDOM();

      const baseKey = short
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '');
      const key = (baseKey || 'gift') + '_' + Date.now().toString(36).slice(-4);
      const ink = color === '#e3a92b' ? '#1b120c' : '#ffffff';

      const newPrize = {
        key,
        name,
        short,
        color,
        ink,
        icon,
        stock,
        rate,
        isGift: true
      };

      const noneIdx = (curRound.prizes || []).findIndex((p) => p.key === 'none');
      if (noneIdx !== -1) {
        curRound.prizes.splice(noneIdx, 0, newPrize);
      } else {
        curRound.prizes.push(newPrize);
      }

      if (dlg && typeof dlg.close === 'function') dlg.close();
      renderInventory();
    });

    // Mở modal Thêm Đợt Mới
    $('#btn-add-round')?.addEventListener('click', () => {
      const dlg = $('#dlg-add-round');
      if (dlg) {
        const nextIdx = (state.rounds || []).length + 1;
        $('#new-round-name').value = `Đợt ${nextIdx}: Ca ${nextIdx}`;
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.hidden = false;
      }
    });

    $('#btn-cancel-add-round')?.addEventListener('click', () => {
      const dlg = $('#dlg-add-round');
      if (dlg) {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.hidden = true;
      }
    });

    $('#form-add-round')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dlg = $('#dlg-add-round');
      const name = $('#new-round-name')?.value.trim();
      const bBox = Math.max(0, parseInt($('#new-round-blindbox')?.value, 10) || 0);
      const keyc = Math.max(0, parseInt($('#new-round-keychain')?.value, 10) || 0);
      const stick = Math.max(0, parseInt($('#new-round-sticker')?.value, 10) || 0);

      if (dlg && typeof dlg.close === 'function') dlg.close();
      await addNewRound(name, bBox, keyc, stick);
    });

    // Lắng nghe thay đổi ô nhập tỉ lệ & tên ngắn để cập nhật thanh trực quan và vòng quay mô phỏng ngay lập tức
    $('#inventory-rows')?.addEventListener('input', (e) => {
      if (e.target.classList.contains('rate-input') || e.target.classList.contains('short-input')) {
        updateRateVisualizer();
        updateCloneWheel();
      }
    });

    // Nút Quay thử nghiệm & Đặt lại của Vòng quay Clone
    $('#btn-admin-test-spin')?.addEventListener('click', spinCloneWheel);
    $('#btn-admin-reset-wheel')?.addEventListener('click', resetCloneWheel);

    // Tìm kiếm người tham gia
    $('#search')?.addEventListener('input', (e) => {
      state.q = e.target.value.trim().toLowerCase();
      renderRows();
    });

    // Sắp xếp bảng người tham gia
    $$('th[data-k]').forEach((th) =>
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        state.sort = { k, dir: state.sort.k === k ? -state.sort.dir : -1 };
        renderRows();
      })
    );

    // Sắp xếp bảng Heatmap từng trang
    $$('th[data-pk]').forEach((th) =>
      th.addEventListener('click', () => {
        const pk = th.dataset.pk;
        state.pageSort = { k: pk, dir: state.pageSort.k === pk ? -state.pageSort.dir : -1 };
        renderPageHeatmap();
      })
    );

    // Lọc & tìm kiếm bình luận
    $('#comment-filter-chapter')?.addEventListener('change', (e) => {
      state.commentFilter.chapter = e.target.value;
      renderCommentsFeed();
    });

    $('#search-comments')?.addEventListener('input', (e) => {
      state.commentFilter.q = e.target.value.trim().toLowerCase();
      renderCommentsFeed();
    });
  }

  initEvents();
  load();
})();
