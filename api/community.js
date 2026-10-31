// API: Lưu bút & Cảm xúc cá chép riêng theo từng trang sách
// GET  /api/community?page=p_3    — Lấy cảm xúc và bình luận của trang cụ thể
// POST /api/community             — Gửi cảm xúc hoặc bình luận cho trang cụ thể
const { configured, redis, toObject, readBody } = require('./_store');

// Bình luận hạt giống mẫu cho trang đầu tiên đọc truyện (Trang 1 chương 1)
const SEED_COMMENTS_MAP = {
  p_3: [
    {
      id: 'seed-p3-1',
      name: 'Thanh Trúc',
      content: 'Trang mở đầu ấm áp quá! Nhìn đàn cá chép bơi quây quần thấy nhớ mâm cơm nhà ghê.',
      chapter: 'ch1',
      ts: Date.now() - 3600000 * 4,
      likes: 5
    }
  ],
  p_4: [
    {
      id: 'seed-p4-1',
      name: 'Minh Khôi',
      content: 'Nét vẽ mộc mạc và giọng đọc ấm lòng, câu chuyện thấm đẫm tình cảm gia đình.',
      chapter: 'ch1',
      ts: Date.now() - 3600000 * 8,
      likes: 3
    }
  ]
};

const DEFAULT_PAGE_REACTIONS = {
  total: 28,
  maiam: 12,
  tonkinh: 6,
  nhinlai: 4,
  huongthien: 6
};

module.exports = async (req, res) => {
  // Lấy key định danh trang (ví dụ: p_3, p_4, p_0...)
  const pageParam = (req.query && req.query.page) ? String(req.query.page).trim() : 'p_3';
  const page = /^[a-zA-Z0-9_-]{1,24}$/.test(pageParam) ? pageParam : 'p_3';
  const uid = (req.query && req.query.uid) ? String(req.query.uid).trim().slice(0, 40) : '';

  // 1. GET: Lấy cảm xúc và bình luận của trang hiện tại
  if (req.method === 'GET') {
    if (!configured()) {
      return res.status(200).json({
        configured: false,
        page,
        reactions: DEFAULT_PAGE_REACTIONS,
        comments: SEED_COMMENTS_MAP[page] || [],
        userReaction: null
      });
    }

    try {
      const cmds = [
        ['HGETALL', `book:react:${page}`],
        ['ZREVRANGE', `book:comm:${page}`, '0', '49']
      ];
      if (uid) cmds.push(['HGET', `book:react:u:${page}`, uid]);

      const [rawReactions, rawComments, userReact] = await redis(cmds);

      const reactObj = toObject(rawReactions);
      const maiam = Number(reactObj.maiam || 0);
      const tonkinh = Number(reactObj.tonkinh || 0);
      const nhinlai = Number(reactObj.nhinlai || 0);
      const huongthien = Number(reactObj.huongthien || 0);
      const total = Number(reactObj.total || (maiam + tonkinh + nhinlai + huongthien) || DEFAULT_PAGE_REACTIONS.total);

      const reactions = {
        total,
        maiam: maiam || DEFAULT_PAGE_REACTIONS.maiam,
        tonkinh: tonkinh || DEFAULT_PAGE_REACTIONS.tonkinh,
        nhinlai: nhinlai || DEFAULT_PAGE_REACTIONS.nhinlai,
        huongthien: huongthien || DEFAULT_PAGE_REACTIONS.huongthien
      };

      let comments = [];
      if (Array.isArray(rawComments) && rawComments.length > 0) {
        comments = rawComments
          .map((item) => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item;
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);
      } else {
        comments = SEED_COMMENTS_MAP[page] || [];
      }

      return res.status(200).json({
        configured: true,
        page,
        reactions,
        comments,
        userReaction: userReact || null
      });
    } catch (err) {
      console.error(`[API community GET ${page} error]:`, err.message);
      return res.status(200).json({
        configured: false,
        page,
        reactions: DEFAULT_PAGE_REACTIONS,
        comments: SEED_COMMENTS_MAP[page] || [],
        userReaction: null
      });
    }
  }

  // 2. POST: Thả cảm xúc hoặc gửi bình luận cho trang hiện tại
  if (req.method === 'POST') {
    const body = readBody(req) || {};
    const action = body.action || '';
    const targetPage = /^[a-zA-Z0-9_-]{1,24}$/.test(body.page || '') ? body.page : page;

    // A. Thả cảm xúc (action = react)
    // Luật: Mỗi tài khoản/thiết bị chỉ được đếm 1 lượt duy nhất trên mỗi trang.
    // Có thể đổi icon (chuyển đổi qua lại mà không tăng tổng số).
    // Nếu ấn nhiều lần cùng 1 icon thì server không tăng đếm.
    if (action === 'react') {
      const type = String(body.type || '').trim().toLowerCase();
      let oldType = String(body.oldType || '').trim().toLowerCase();
      const userUid = String(body.uid || '').trim().slice(0, 40);
      let isSwitch = Boolean(body.isSwitch || (oldType && oldType !== type && ['maiam', 'tonkinh', 'nhinlai', 'huongthien'].includes(oldType)));

      if (!['maiam', 'tonkinh', 'nhinlai', 'huongthien'].includes(type)) {
        return res.status(400).json({ error: 'invalid_type' });
      }

      if (!configured()) {
        return res.status(200).json({
          ok: true,
          page: targetPage,
          type,
          count: DEFAULT_PAGE_REACTIONS.total + (isSwitch ? 0 : 1),
          switched: isSwitch
        });
      }

      try {
        // Nếu có userUid, kiểm tra reaction trước đó của người dùng trên trang này
        if (userUid) {
          const priorRes = await redis([['HGET', `book:react:u:${targetPage}`, userUid]]);
          const priorType = priorRes && priorRes[0];
          if (priorType) {
            if (priorType === type) {
              // Người dùng đã thả icon này rồi -> không tăng đếm
              const totalRes = await redis([['HGET', `book:react:${targetPage}`, 'total']]);
              const curTotal = Number((totalRes && totalRes[0]) || DEFAULT_PAGE_REACTIONS.total);
              return res.status(200).json({
                ok: true,
                page: targetPage,
                type,
                count: curTotal,
                duplicate: true
              });
            }
            // Đã thả icon khác trước đó -> tự động coi là đổi icon
            isSwitch = true;
            oldType = priorType;
          }
        }

        const cmds = [];
        if (isSwitch) {
          // Đổi icon: giảm icon cũ 1, tăng icon mới 1, total không đổi
          if (oldType && ['maiam', 'tonkinh', 'nhinlai', 'huongthien'].includes(oldType)) {
            cmds.push(['HINCRBY', `book:react:${targetPage}`, oldType, '-1']);
          }
          cmds.push(['HINCRBY', `book:react:${targetPage}`, type, '1']);
          if (userUid) {
            cmds.push(['HSET', `book:react:u:${targetPage}`, userUid, type]);
          }
          cmds.push(['HGET', `book:react:${targetPage}`, 'total']);
        } else {
          // Thả lần đầu: tăng icon 1, tăng total 1
          cmds.push(['HINCRBY', `book:react:${targetPage}`, type, '1']);
          cmds.push(['HINCRBY', `book:react:${targetPage}`, 'total', '1']);
          if (userUid) {
            cmds.push(['HSET', `book:react:u:${targetPage}`, userUid, type]);
          }
        }

        const resList = await redis(cmds);
        const newTotal = isSwitch
          ? Number(resList[cmds.length - 1] || DEFAULT_PAGE_REACTIONS.total)
          : Number(resList[1] || DEFAULT_PAGE_REACTIONS.total + 1);

        return res.status(200).json({
          ok: true,
          page: targetPage,
          type,
          count: newTotal,
          switched: isSwitch
        });
      } catch (err) {
        console.error(`[API community react ${targetPage} error]:`, err.message);
        return res.status(200).json({ ok: true, page: targetPage, type, fallback: true });
      }
    }

    // B. Thêm bình luận mới (action = comment)
    if (action === 'comment') {
      const rawContent = String(body.content || '').trim();
      if (!rawContent || rawContent.length < 2) {
        return res.status(400).json({ error: 'content_required' });
      }

      const content = rawContent.slice(0, 300);
      const name = String(body.name || '').trim().slice(0, 24) || 'Bạn đọc giấu tên';
      const chapter = ['chung', 'ch1', 'ch2', 'ch3', 'ch4'].includes(body.chapter) ? body.chapter : 'chung';
      const ts = Date.now();
      const id = 'c_' + ts.toString(36) + '_' + Math.random().toString(36).slice(2, 6);

      const commentItem = {
        id,
        page: targetPage,
        name,
        content,
        chapter,
        ts,
        likes: 0
      };

      if (!configured()) {
        return res.status(200).json({ ok: true, page: targetPage, comment: commentItem });
      }

      try {
        await redis([
          ['ZADD', `book:comm:${targetPage}`, String(ts), JSON.stringify(commentItem)]
        ]);
        return res.status(200).json({ ok: true, page: targetPage, comment: commentItem });
      } catch (err) {
        console.error(`[API community comment ${targetPage} error]:`, err.message);
        return res.status(200).json({ ok: true, page: targetPage, comment: commentItem, fallback: true });
      }
    }

    return res.status(400).json({ error: 'unknown_action' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
};
