// Kho dữ liệu: Upstash Redis qua REST API (không cần cài thư viện).
// Trên Vercel: Storage → Upstash Redis (Marketplace) → Connect với project,
// Vercel tự thêm biến KV_REST_API_URL / KV_REST_API_TOKEN (hoặc UPSTASH_REDIS_REST_URL / _TOKEN).
// Tên file bắt đầu bằng "_" nên Vercel không coi đây là một đường dẫn API.
const crypto = require('crypto');

const cleanVal = (s) => (s || '').trim().replace(/^["']|["']$/g, '');
const isRealVal = (s) => {
  const c = cleanVal(s);
  return Boolean(c && !c.includes('your-upstash-redis') && !c.includes('example') && c !== 'your-upstash-redis-token');
};

const getUrl = () => {
  let u = '';
  if (isRealVal(process.env.UPSTASH_REDIS_KV_REST_API_URL)) u = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  else if (isRealVal(process.env.UPSTASH_REDIS_REST_URL)) u = process.env.UPSTASH_REDIS_REST_URL;
  else if (isRealVal(process.env.KV_REST_API_URL)) u = process.env.KV_REST_API_URL;
  else {
    for (const [k, v] of Object.entries(process.env)) {
      if (isRealVal(v) && !k.includes('READ_ONLY') && (k.endsWith('_REST_API_URL') || k.endsWith('_REST_URL'))) {
        u = v;
        break;
      }
    }
  }
  return cleanVal(u);
};

const getToken = () => {
  let t = '';
  if (isRealVal(process.env.UPSTASH_REDIS_KV_REST_API_TOKEN)) t = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
  else if (isRealVal(process.env.UPSTASH_REDIS_REST_TOKEN)) t = process.env.UPSTASH_REDIS_REST_TOKEN;
  else if (isRealVal(process.env.KV_REST_API_TOKEN)) t = process.env.KV_REST_API_TOKEN;
  else {
    for (const [k, v] of Object.entries(process.env)) {
      if (isRealVal(v) && !k.includes('READ_ONLY') && (k.endsWith('_REST_API_TOKEN') || k.endsWith('_REST_TOKEN'))) {
        t = v;
        break;
      }
    }
  }
  return cleanVal(t);
};

const configured = () => Boolean(getUrl() && getToken());

// Gửi nhiều lệnh Redis trong một lần gọi (pipeline). Trả về mảng kết quả theo thứ tự.
async function redis(commands) {
  if (!commands.length) return [];
  const url = getUrl();
  const token = getToken();
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => (r.error ? null : r.result));
}

// HGETALL qua REST trả về mảng phẳng [k1, v1, k2, v2...]
const toObject = (arr) => {
  const o = {};
  for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

const PID_RE = /^(TAO|OFF)-[A-Z0-9]{6}$/;

const DEFAULT_PRIZE_SET = new Set(['keychain', 'sticker', 'tote', 'blindbox', 'none']);
const PRIZE_KEYS = {
  has(k) {
    return typeof k === 'string' && (DEFAULT_PRIZE_SET.has(k) || /^[a-zA-Z0-9_-]{1,32}$/.test(k));
  }
};

// Danh mục các phần quà mặc định của sự kiện: 150 phần quà (60 móc khoá + 60 sticker + 21 túi tote + 9 blindbox)
const DEFAULT_PRIZES = [
  { key: 'keychain', name: 'Móc khoá cá chép', short: 'Móc khoá', color: '#e3a92b', ink: '#4a2408', icon: 'key', stock: 60, rate: 40, isGift: true },
  { key: 'sticker', name: 'Sticker Táo Quân', short: 'Sticker', color: '#b8241c', ink: '#fff3d6', icon: 'sticker', stock: 60, rate: 40, isGift: true },
  { key: 'tote', name: 'Túi tote Táo Quân', short: 'Túi tote', color: '#1f4e8c', ink: '#ffffff', icon: 'tote', stock: 21, rate: 14, isGift: true },
  { key: 'blindbox', name: 'Blindbox bí ẩn', short: 'Blindbox', color: '#33245c', ink: '#f3d27a', icon: 'gift', stock: 9, rate: 6, isGift: true }
];

// Cấu hình các Đợt (Rounds) mặc định của sự kiện để phân bổ kho quà đều đặn theo ca/thời điểm
const DEFAULT_ROUNDS = [
  {
    id: 'round_1',
    name: 'Đợt 1: Ngày đầu (150 quà)',
    status: 'active',
    prizes: JSON.parse(JSON.stringify(DEFAULT_PRIZES))
  },
  {
    id: 'round_2',
    name: 'Đợt 2: Cao điểm (150 quà)',
    status: 'upcoming',
    prizes: JSON.parse(JSON.stringify(DEFAULT_PRIZES))
  },
  {
    id: 'round_3',
    name: 'Đợt 3: Đêm hội Táo Quân (150 quà)',
    status: 'upcoming',
    prizes: JSON.parse(JSON.stringify(DEFAULT_PRIZES))
  }
];

const DEFAULT_PRIZE_STOCK = {
  keychain: 60,
  sticker: 60,
  tote: 21,
  blindbox: 9
};

const DEFAULT_PRIZE_RATES = {
  keychain: 40,
  sticker: 40,
  tote: 14,
  blindbox: 6
};

// Đảm bảo cấu trúc mảng prizes chuẩn cho mỗi round
function ensureRoundPrizes(r = {}) {
  if (Array.isArray(r.prizes) && r.prizes.length) {
    return r.prizes.map((p) => ({
      key: String(p.key || '').trim(),
      name: String(p.name || p.key || 'Phần quà').trim(),
      short: String(p.short || p.name || p.key).slice(0, 12).trim(),
      color: String(p.color || '#b8241c'),
      ink: String(p.ink || '#fff3d6'),
      icon: String(p.icon || (p.isGift ? 'gift' : 'clover')),
      stock: Math.max(0, Number(p.stock) || 0),
      rate: Math.max(0, Number(p.rate) || 0),
      isGift: p.isGift !== undefined ? Boolean(p.isGift) : p.key !== 'none'
    }));
  }

  // Tương thích ngược nếu round lưu dạng stock & rates cũ
  const stock = r.stock || {};
  const rates = r.rates || {};
  const baseDefs = {
    keychain: { name: 'Móc khoá cá chép', short: 'Móc khoá', color: '#e3a92b', ink: '#4a2408', icon: 'key', isGift: true },
    sticker: { name: 'Sticker Táo Quân', short: 'Sticker', color: '#b8241c', ink: '#fff3d6', icon: 'sticker', isGift: true },
    tote: { name: 'Túi tote Táo Quân', short: 'Túi tote', color: '#1f4e8c', ink: '#ffffff', icon: 'tote', isGift: true },
    blindbox: { name: 'Blindbox bí ẩn', short: 'Blindbox', color: '#33245c', ink: '#f3d27a', icon: 'gift', isGift: true },
    none: { name: 'Chúc may mắn lần sau', short: 'Lời chúc', color: '#2f6a47', ink: '#fff3d6', icon: 'clover', isGift: false }
  };
  const allKeys = Array.from(new Set([...Object.keys(baseDefs), ...Object.keys(rates), ...Object.keys(stock)]));
  return allKeys.map((k) => {
    const b = baseDefs[k] || { name: k, short: k, color: '#f59e0b', ink: '#fff', icon: 'gift', isGift: true };
    return {
      key: k,
      name: b.name,
      short: b.short,
      color: b.color,
      ink: b.ink,
      icon: b.icon,
      stock: Number(stock[k] !== undefined ? stock[k] : 0),
      rate: Number(rates[k] !== undefined ? rates[k] : 0),
      isGift: b.isGift
    };
  });
}

// Phân tích cấu hình rounds & active round từ Redis hash prize:config
function parseRoundsConfig(configObj = {}) {
  let rounds = null;
  if (configObj.rounds) {
    try {
      rounds = typeof configObj.rounds === 'string' ? JSON.parse(configObj.rounds) : configObj.rounds;
    } catch (e) {}
  }
  if (!Array.isArray(rounds) || !rounds.length) {
    rounds = JSON.parse(JSON.stringify(DEFAULT_ROUNDS));
  }

  let activeId = configObj.active_round;
  if (!activeId || !rounds.some((r) => r.id === activeId)) {
    const foundActive = rounds.find((r) => r.status === 'active');
    activeId = foundActive ? foundActive.id : rounds[0].id;
  }

  rounds.forEach((r) => {
    r.status = r.id === activeId ? 'active' : (r.status === 'ended' ? 'ended' : 'upcoming');
    r.prizes = ensureRoundPrizes(r);
    // Tự động map sang stock & rates object cho tương thích ngược
    r.stock = {};
    r.rates = {};
    r.prizes.forEach((p) => {
      r.stock[p.key] = p.stock;
      r.rates[p.key] = p.rate;
    });
  });

  const activeRound = rounds.find((r) => r.id === activeId) || rounds[0];
  return { rounds, activeId: activeRound.id, activeRound };
}

// Lấy số quà đã trao trong roundId từ hash prize:round_counts
function getRoundCounts(roundCountsObj = {}, roundId) {
  const prefix = `${roundId}:`;
  const counts = {};
  for (const [k, v] of Object.entries(roundCountsObj || {})) {
    if (k.startsWith(prefix)) {
      counts[k.slice(prefix.length)] = Number(v || 0);
    }
  }
  return counts;
}

// Xác định các món quà đã hết kho trong round (để loại bỏ hoàn toàn khỏi thuật toán quay)
function getRoundOutOfStockSet(round, roundCounts = {}) {
  const out = new Set();
  const prizes = round.prizes || ensureRoundPrizes(round);
  prizes.forEach((p) => {
    if (!p.isGift) return; // Lời chúc / none không bao giờ hết kho
    const max = Number(p.stock || 0);
    const count = Number(roundCounts[p.key] || 0);
    if (count >= max) {
      out.add(p.key);
    }
  });
  return out;
}

// Tương thích ngược
function getOutOfStockSet(stockObj = {}, countsObj = {}) {
  const out = new Set();
  ['blindbox', 'keychain', 'sticker', 'tote'].forEach((k) => {
    const max = stockObj[k] !== undefined && stockObj[k] !== '' ? Number(stockObj[k]) : DEFAULT_PRIZE_STOCK[k];
    const count = Number(countsObj[k] || 0);
    if (count >= max) {
      out.add(k);
    }
  });
  return out;
}

// Bốc thăm quà dựa trên tỉ lệ động của Round và kho quà còn lại
function rollPrize(noMoreNone, outOfStock = new Set(), prizeSource = null) {
  let pool = [];
  if (Array.isArray(prizeSource)) {
    pool = prizeSource.map((p) => [p.key, Math.max(0, Number(p.rate) || 0)]);
  } else if (prizeSource && typeof prizeSource === 'object') {
    pool = Object.entries(prizeSource).map(([k, v]) => [k, Math.max(0, Number(v) || 0)]);
  } else {
    pool = DEFAULT_PRIZES.map((p) => [p.key, p.rate]);
  }

  const validPool = pool.filter(([k, w]) => w > 0 && !(noMoreNone && k === 'none') && !outOfStock.has(k));
  if (!validPool.length) return 'sticker'; // Fallback nếu hết sạch kho quà
  const total = validPool.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return 'sticker';
  let r = crypto.randomInt(0, total);
  for (const [k, w] of validPool) {
    if (r < w) return k;
    r -= w;
  }
  return validPool[0][0];
}

// Đóng dấu trạm st cho thẻ: chỉ ghi nhận dấu trạm (không bốc quà tại các trạm).
// Nếu thẻ đạt đủ 4 trạm, tự động bốc 1 phần quà vòng quay checkout duy nhất.
function stampCmds(o, key, st, now, outOfStock = new Set(), roundId = 'round_1', prizeSource = null) {
  const cmds = [
    ['HSET', key, `st${st}`, now],
    ['HINCRBY', 'staff:stamps', String(st), '1']
  ];
  if (o.vid) {
    cmds.push(
      ['SADD', `st:${o.vid}`, String(st)],
      ['HSET', `u:${o.vid}`, 'seen', now],
      ['ZADD', 'users', now, o.vid]
    );
  }

  // Kiểm tra xem thẻ đã đủ 4 dấu chưa (gồm các dấu cũ + dấu trạm hiện tại st)
  const currentStamps = [1, 2, 3, 4].filter((s) => s === st || o[`st${s}`]);
  if (currentStamps.length >= 4 && !o.checkout_prize && !o.prize) {
    // Đã đủ 4 trạm -> Bốc 1 phần quà vòng quay checkout duy nhất
    const prize = rollPrize(false, outOfStock, prizeSource);
    cmds.push(
      ['HSET', key, 'checkout_prize', prize, 'round', roundId],
      ['HINCRBY', 'prize:counts', prize, '1']
    );
    if (roundId) {
      cmds.push(['HINCRBY', 'prize:round_counts', `${roundId}:${prize}`, '1']);
    }
    if (o.vid) {
      cmds.push(['HSET', `u:${o.vid}`, 'checkout_prize', prize]);
    }
  }

  return cmds;
}

// Mã dự phòng 6 số của trạm (khi không quét được QR): nhân sự đọc cho người chơi nhập.
// Tính từ mật khẩu nhân sự + số trạm + phút hiện tại nên tự đổi mỗi phút; chấp nhận cả mã của phút trước.
const CODE_STEP = 60 * 1000;
function stationCode(st, at = Date.now()) {
  const secret = process.env.STAFF_KEY || process.env.ADMIN_KEY || '';
  const win = Math.floor(at / CODE_STEP);
  const h = crypto.createHmac('sha256', secret).update(`tram:${st}:${win}`).digest();
  return String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
}
function stationOfCode(code, at = Date.now()) {
  for (const st of [1, 2, 3, 4]) {
    if (sameKey(code, stationCode(st, at)) || sameKey(code, stationCode(st, at - CODE_STEP))) return st;
  }
  return 0;
}

// Thẻ ở dạng gửi cho người chơi / staff
function passView(h) {
  if (!h || !h.pid) return null;
  const by = (prefix) => Object.fromEntries([1, 2, 3, 4].filter((s) => h[prefix + s]).map((s) => [s, prefix === 'prize' ? h[prefix + s] : Number(h[prefix + s])]));
  const checkoutPrize = h.checkout_prize || h.prize || null;
  const prizes = by('prize');
  if (checkoutPrize) prizes.checkout = checkoutPrize;
  return {
    pid: h.pid,
    name: h.name || '',
    phone: h.phone || null,
    email: h.email || null,
    age: h.age || null,
    source: h.source || null,
    created: Number(h.created || 0),
    gift: h.gift || null,
    stamps: by('st'),
    prizes,
    checkoutPrize,
    given: by('given'),
    checkoutGiven: h.checkout_given ? Number(h.checkout_given) : null,
    claimed: h.claimed ? Number(h.claimed) : null,
    favStation: h.fav_station || null,
    rating: h.rating ? Number(h.rating) : null,
    feedbackComment: h.feedback_comment || null,
    feedbackAt: h.feedback_at ? Number(h.feedback_at) : null
  };
}

// Mật khẩu: so sánh an toàn + khoá 15 phút sau 5 lần sai (theo IP)
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
function sameKey(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
async function checkKey(req, keys) {
  const ip = ipOf(req), fk = `fail:${ip}`;
  const [fails] = await redis([['GET', fk]]);
  if (Number(fails || 0) >= 5) return { ok: false, status: 429 };
  const given = req.headers['x-staff-key'] || req.headers['x-admin-key'];
  const role = keys.find(([, v]) => v && sameKey(given, v));
  if (role) return { ok: true, role: role[0] };
  await redis([['INCR', fk], ['EXPIRE', fk, '900']]);
  return { ok: false, status: 401 };
}

const plainName = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().trim();

module.exports = {
  configured,
  redis,
  toObject,
  readBody,
  PID_RE,
  rollPrize,
  PRIZE_KEYS,
  DEFAULT_PRIZE_STOCK,
  DEFAULT_PRIZE_RATES,
  DEFAULT_PRIZES,
  DEFAULT_ROUNDS,
  ensureRoundPrizes,
  parseRoundsConfig,
  getRoundCounts,
  getRoundOutOfStockSet,
  getOutOfStockSet,
  passView,
  checkKey,
  stampCmds,
  stationCode,
  stationOfCode,
  CODE_STEP,
  plainName
};
