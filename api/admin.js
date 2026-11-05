// GET /api/admin — danh sách người tham gia & phân tích số liệu tương tác cho trang quản trị (admin.html).
// Bảo vệ bằng mật khẩu ADMIN_KEY (đặt trong Vercel → Settings → Environment Variables),
// gửi qua header x-admin-key để không lộ trong đường dẫn.
const { configured, redis, toObject, checkKey, readBody, DEFAULT_PRIZE_STOCK, DEFAULT_PRIZE_RATES, DEFAULT_PRIZES, DEFAULT_ROUNDS, ensureRoundPrizes, parseRoundsConfig, getRoundCounts, getRoundOutOfStockSet } = require('./_store');

const LIMIT = 2000;

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

const SEED_COMMENTS_MAP = {};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }
  if (!configured()) return res.status(503).json({ configured: false, reason: 'store' });
  if (!process.env.ADMIN_KEY) return res.status(503).json({ configured: false, reason: 'key' });

  try {
    // Sai mật khẩu 5 lần thì khoá 15 phút
    const auth = await checkKey(req, [['admin', process.env.ADMIN_KEY]]);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.status === 429 ? 'locked' : 'key' });

    // POST: Cập nhật cấu hình Đợt (Rounds), Tỉ lệ trúng thưởng (%) & Kho quà
    if (req.method === 'POST') {
      const b = readBody(req) || {};

      // 1. Chuyển đổi Đợt quay đang hoạt động
      if (b.action === 'switch_round') {
        const roundId = String(b.roundId || '').trim();
        const [configData] = await redis([['HGETALL', 'prize:config']]);
        const config = toObject(configData);
        const { rounds } = parseRoundsConfig(config);
        const target = rounds.find((r) => r.id === roundId);
        if (!target) return res.status(400).json({ error: 'round_not_found' });
        rounds.forEach((r) => {
          if (r.id === roundId) r.status = 'active';
          else if (r.status === 'active') r.status = 'ended';
        });
        await redis([
          ['HSET', 'prize:config', 'rounds', JSON.stringify(rounds), 'active_round', roundId]
        ]);
        return res.status(200).json({ ok: true, activeRoundId: roundId, rounds });
      }

      // 2. Lưu thông tin, tỉ lệ & kho quà của 1 Đợt (BẮT BUỘC ĐỦ 100%)
      if (b.action === 'save_round') {
        const roundData = b.round || {};
        const roundId = String(roundData.id || '').trim();
        if (!roundId) return res.status(400).json({ error: 'invalid_round_id' });
        const [configData] = await redis([['HGETALL', 'prize:config']]);
        const config = toObject(configData);
        const { rounds, activeId } = parseRoundsConfig(config);
        const idx = rounds.findIndex((r) => r.id === roundId);
        if (idx === -1) return res.status(400).json({ error: 'round_not_found' });

        if (roundData.name) rounds[idx].name = String(roundData.name).trim();

        // Xử lý mảng phần quà (hỗ trợ thêm quà mới tùy chỉnh)
        let prizes = Array.isArray(roundData.prizes) && roundData.prizes.length
          ? roundData.prizes
          : rounds[idx].prizes;
        prizes = ensureRoundPrizes({ prizes });

        // KIỂM TRA ĐIỀU KIỆN ĐỦ 100%: Tổng tỉ lệ phải đạt chính xác 100%
        const totalRate = Math.round(prizes.reduce((a, p) => a + Math.max(0, Number(p.rate) || 0), 0) * 10) / 10;
        if (totalRate !== 100) {
          return res.status(400).json({
            error: 'rates_must_equal_100',
            message: `Tổng tỉ lệ các phần quà phải bằng đúng 100% (Hiện tại là ${totalRate}%). Vui lòng điều chỉnh lại trước khi lưu/áp dụng!`,
            totalRate
          });
        }

        rounds[idx].prizes = prizes;
        rounds[idx].stock = {};
        rounds[idx].rates = {};
        prizes.forEach((p) => {
          rounds[idx].stock[p.key] = p.stock;
          rounds[idx].rates[p.key] = p.rate;
        });

        await redis([
          ['HSET', 'prize:config', 'rounds', JSON.stringify(rounds)]
        ]);
        return res.status(200).json({ ok: true, round: rounds[idx], rounds });
      }

      // 3. Thêm Đợt quay mới (BẮT BUỘC ĐỦ 100%)
      if (b.action === 'add_round') {
        const roundData = b.round || {};
        const [configData] = await redis([['HGETALL', 'prize:config']]);
        const config = toObject(configData);
        const { rounds } = parseRoundsConfig(config);
        const newId = 'round_' + Date.now().toString(36);

        let prizes = Array.isArray(roundData.prizes) && roundData.prizes.length
          ? roundData.prizes
          : JSON.parse(JSON.stringify(DEFAULT_PRIZES));

        if (roundData.stock) {
          prizes.forEach((p) => {
            if (roundData.stock[p.key] !== undefined) p.stock = Math.max(0, Number(roundData.stock[p.key]) || 0);
          });
        }

        prizes = ensureRoundPrizes({ prizes });

        const totalRate = Math.round(prizes.reduce((a, p) => a + Math.max(0, Number(p.rate) || 0), 0) * 10) / 10;
        if (totalRate !== 100) {
          return res.status(400).json({
            error: 'rates_must_equal_100',
            message: `Tổng tỉ lệ các phần quà phải bằng đúng 100% (Hiện tại là ${totalRate}%). Vui lòng điều chỉnh lại trước khi tạo đợt!`,
            totalRate
          });
        }

        const newRound = {
          id: newId,
          name: String(roundData.name || `Đợt ${rounds.length + 1}`).trim(),
          status: 'upcoming',
          prizes,
          stock: {},
          rates: {}
        };
        prizes.forEach((p) => {
          newRound.stock[p.key] = p.stock;
          newRound.rates[p.key] = p.rate;
        });

        rounds.push(newRound);
        await redis([
          ['HSET', 'prize:config', 'rounds', JSON.stringify(rounds)]
        ]);
        return res.status(200).json({ ok: true, round: newRound, rounds });
      }

      // 4. Xóa 1 Đợt quay
      if (b.action === 'delete_round') {
        const roundId = String(b.roundId || '').trim();
        const [configData] = await redis([['HGETALL', 'prize:config']]);
        const config = toObject(configData);
        const { rounds, activeId } = parseRoundsConfig(config);
        if (rounds.length <= 1) return res.status(400).json({ error: 'cannot_delete_last_round' });
        const newRounds = rounds.filter((r) => r.id !== roundId);
        let newActive = activeId;
        if (activeId === roundId) {
          newActive = newRounds[0].id;
          newRounds[0].status = 'active';
        }
        await redis([
          ['HSET', 'prize:config', 'rounds', JSON.stringify(newRounds), 'active_round', newActive]
        ]);
        return res.status(200).json({ ok: true, rounds: newRounds, activeRoundId: newActive });
      }

      // 5. Cập nhật kho quà (Tương thích ngược)
      if (b.action === 'set_stock') {
        const stock = b.stock || {};
        const [configData] = await redis([['HGETALL', 'prize:config']]);
        const config = toObject(configData);
        const { rounds, activeId, activeRound } = parseRoundsConfig(config);
        if (stock.blindbox !== undefined) activeRound.stock.blindbox = Math.max(0, Number(stock.blindbox) || 0);
        if (stock.keychain !== undefined) activeRound.stock.keychain = Math.max(0, Number(stock.keychain) || 0);
        if (stock.sticker !== undefined) activeRound.stock.sticker = Math.max(0, Number(stock.sticker) || 0);

        await redis([
          ['HSET', 'prize:config', 'rounds', JSON.stringify(rounds)]
        ]);
        return res.status(200).json({ ok: true, stock: activeRound.stock, round: activeRound });
      }

      return res.status(400).json({ error: 'unknown_action' });
    }

    // 1. LẤY DỮ LIỆU NGƯỜI DÙNG & HỘ CHIẾU
    const [vids] = await redis([['ZREVRANGE', 'users', '0', String(LIMIT - 1)]]);
    const list = vids || [];
    const cmds = [];
    list.forEach((v) => cmds.push(['HGETALL', `u:${v}`], ['SMEMBERS', `pg:${v}`], ['SMEMBERS', `ch:${v}`], ['SMEMBERS', `st:${v}`]));
    
    // 2. LẤY TOÀN BỘ SỐ LIỆU TƯƠNG TÁC SÁCH & KHO QUÀ
    PAGE_META.forEach(({ page }) => {
      cmds.push(['HGETALL', `book:react:${page}`]);
      cmds.push(['ZREVRANGE', `book:comm:${page}`, '0', '99']);
    });
    cmds.push(
      ['HGETALL', 'book:shares:channels'],
      ['HGETALL', 'book:shares:pages'],
      ['GET', 'book:shares:total'],
      ['HGETALL', 'prize:config'],
      ['HGETALL', 'prize:round_counts'],
      ['HGETALL', 'prize:counts']
    );

    const out = await redis(cmds);
    const nums = (a) => (a || []).map(Number).sort((x, y) => x - y);

    // Xử lý danh sách người dùng
    const rows = list.map((vid, i) => {
      const u = toObject(out[i * 4]);
      return {
        vid,
        pid: u.pid || null,
        name: u.name || '',
        flips: Number(u.flips || 0),
        pages: nums(out[i * 4 + 1]),
        last: u.last !== undefined ? Number(u.last) : null,
        chapters: nums(out[i * 4 + 2]),
        stamps: nums(out[i * 4 + 3]),
        checkoutPrize: u.checkout_prize || null,
        prizes: [u.checkout_prize || null, ...[1, 2, 3, 4].map((s) => u[`prize${s}`] || null)].filter(Boolean),
        claimed: u.claimed === '1',
        checkin: Number(u.checkin || 0),
        first: Number(u.first || 0),
        seen: Number(u.seen || 0)
      };
    });

    // Xử lý dữ liệu tương tác sách
    const commOffset = list.length * 4;
    let totalReactions = 0;
    let maiamSum = 0;
    let tonkinhSum = 0;
    let nhinlaiSum = 0;
    let huongthienSum = 0;
    const allComments = [];

    const pagesAnalytics = PAGE_META.map((meta, idx) => {
      const rawReact = toObject(out[commOffset + idx * 2]);
      const rawComm = out[commOffset + idx * 2 + 1];

      const maiam = Number(rawReact.maiam || 0);
      const tonkinh = Number(rawReact.tonkinh || 0);
      const nhinlai = Number(rawReact.nhinlai || 0);
      const huongthien = Number(rawReact.huongthien || 0);
      const pageTotalReact = Number(rawReact.total || (maiam + tonkinh + nhinlai + huongthien) || 0);

      totalReactions += pageTotalReact;
      maiamSum += maiam;
      tonkinhSum += tonkinh;
      nhinlaiSum += nhinlai;
      huongthienSum += huongthien;

      let comments = [];
      if (Array.isArray(rawComm) && rawComm.length > 0) {
        comments = rawComm
          .map((item) => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item;
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);
      } else if (SEED_COMMENTS_MAP[meta.page]) {
        comments = SEED_COMMENTS_MAP[meta.page];
      }

      comments.forEach((c) => {
        if (!c.page) c.page = meta.page;
        if (!c.pageLabel) c.pageLabel = meta.label;
        allComments.push(c);
      });

      return {
        page: meta.page,
        index: meta.index,
        label: meta.label,
        chapter: meta.chapter,
        reactions: {
          total: pageTotalReact,
          maiam,
          tonkinh,
          nhinlai,
          huongthien
        },
        commentsCount: comments.length,
        sharesCount: 0,
        hotScore: 0
      };
    });

    // Lấy dữ liệu chia sẻ
    const shareBase = commOffset + PAGE_META.length * 2;
    const rawSharesChannels = toObject(out[shareBase]);
    const rawSharesPages = toObject(out[shareBase + 1]);
    const rawSharesTotal = Number(out[shareBase + 2] || 0);

    const mobileShares = Number(rawSharesChannels.mobile || 0) + Number(rawSharesChannels.native || 0);
    const webShares = Number(rawSharesChannels.web || 0) + Number(rawSharesChannels.copy || 0) + Number(rawSharesChannels.facebook || 0) + Number(rawSharesChannels.zalo || 0);
    const totalShares = rawSharesTotal || (mobileShares + webShares);

    // Gán số lượt chia sẻ & Tính điểm sức hút (Attention Hot Score) từng trang
    pagesAnalytics.forEach((p) => {
      p.sharesCount = Number(rawSharesPages[p.page] || 0);
      // Điểm sức hút: Reaction trọng số 1, Comment trọng số 3, Share trọng số 5
      p.hotScore = (p.reactions.total * 1) + (p.commentsCount * 3) + (p.sharesCount * 5);
    });

    const topSharedPages = pagesAnalytics
      .filter((p) => p.sharesCount > 0)
      .sort((a, b) => b.sharesCount - a.sharesCount)
      .slice(0, 3);

    const shareSummary = {
      total: totalShares,
      mobile: mobileShares,
      web: webShares,
      topPages: topSharedPages,
      pages: rawSharesPages
    };

    allComments.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));

    // Xếp hạng cảm xúc 4 cá chép
    const carpStats = [
      { type: 'maiam', name: 'Mái Ấm', count: maiamSum, color: '#f59e0b' },
      { type: 'tonkinh', name: 'Tôn Kính', count: tonkinhSum, color: '#ef4444' },
      { type: 'nhinlai', name: 'Nhìn Lại', count: nhinlaiSum, color: '#3b82f6' },
      { type: 'huongthien', name: 'Hướng Thiện', count: huongthienSum, color: '#10b981' }
    ].sort((a, b) => b.count - a.count);

    const usersCount = list.length || 1;
    const totalComments = allComments.length;
    const totalInteractions = totalReactions + totalComments + totalShares;

    // 4. QUẢN LÝ CẤU HÌNH ĐỢT (ROUNDS), TỈ LỆ (%) & TỒN KHO QUÀ VÒNG QUAY
    const rawConfig = toObject(out[shareBase + 3]);
    const rawRoundCounts = toObject(out[shareBase + 4]);
    const rawTotalCounts = toObject(out[shareBase + 5]);

    const { rounds, activeId, activeRound } = parseRoundsConfig(rawConfig);

    const enrichedRounds = rounds.map((r) => {
      const counts = getRoundCounts(rawRoundCounts, r.id);
      const prizes = ensureRoundPrizes(r);
      const items = {};
      prizes.forEach((p) => {
        const awarded = Number(counts[p.key] || 0);
        const max = Number(p.stock || 0);
        const remaining = p.isGift ? Math.max(0, max - awarded) : 999999;
        items[p.key] = {
          key: p.key,
          name: p.name,
          short: p.short,
          color: p.color,
          ink: p.ink,
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
        status: r.status,
        prizes,
        stock: r.stock,
        rates: r.rates,
        counts,
        items
      };
    });

    const activeEnriched = enrichedRounds.find((r) => r.id === activeId) || enrichedRounds[0];

    // Thống kê tổng kho toàn bộ sự kiện (qua tất cả các rounds và hỗ trợ quà tùy chỉnh mới)
    const inventory = {};
    enrichedRounds.forEach((r) => {
      r.prizes.forEach((p) => {
        if (!p.isGift) return;
        if (!inventory[p.key]) {
          inventory[p.key] = {
            key: p.key,
            name: p.name,
            short: p.short,
            icon: p.icon,
            color: p.color,
            max: 0,
            awarded: Number(rawTotalCounts[p.key] || 0)
          };
        }
        inventory[p.key].max += Number(p.stock || 0);
      });
    });
    for (const k of Object.keys(inventory)) {
      inventory[k].remaining = Math.max(0, inventory[k].max - inventory[k].awarded);
      inventory[k].isOut = inventory[k].remaining <= 0;
    }

    const analytics = {
      kpis: {
        totalInteractions,
        totalReactions,
        totalComments,
        totalShares,
        usersCount: list.length,
        engagementRate: (totalInteractions / Math.max(1, list.length)).toFixed(2),
        shareRate: ((totalShares / Math.max(1, list.length)) * 100).toFixed(1),
        commentRate: ((totalComments / Math.max(1, list.length)) * 100).toFixed(1),
        dominantEmotion: carpStats[0] || { type: 'maiam', name: 'Mái Ấm', count: 0 }
      },
      reactions: {
        total: totalReactions,
        maiam: maiamSum,
        tonkinh: tonkinhSum,
        nhinlai: nhinlaiSum,
        huongthien: huongthienSum,
        ranked: carpStats
      },
      shares: shareSummary,
      comments: {
        total: totalComments,
        items: allComments
      },
      pages: pagesAnalytics
    };

    return res.status(200).json({
      configured: true,
      rows,
      analytics,
      rounds: enrichedRounds,
      activeRoundId: activeId,
      activeRound: activeEnriched,
      inventory
    });
  } catch (err) {
    console.error('[API admin error]:', err);
    return res.status(502).json({ error: 'store' });
  }
};
