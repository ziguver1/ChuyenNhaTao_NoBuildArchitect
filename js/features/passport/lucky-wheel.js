/**
 * Vòng quay may mắn phong cách Tết dân gian & Hiệu ứng pháo hoa tia lửa
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { ask } from '../../core/dialog.js';
import { toast } from '../../core/toast.js';
import { sound } from '../../core/audio.js';
import { track } from '../../analytics/tracker.js';
import { measure } from '../../analytics/meter.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { STATIONS, PP } from './stations.data.js';
import { getPass, setPass, savePassToHistory } from './passport.state.js?v=4.6';

export const PRIZES = {
  keychain: {
    label: 'Móc khoá cá chép',
    short: 'Móc khoá',
    icon: 'key',
    color: '#e3a92b',
    ink: '#4a2408'
  },
  sticker: {
    label: 'Sticker Táo Quân',
    short: 'Sticker',
    icon: 'sticker',
    color: '#b8241c',
    ink: '#fff3d6'
  },
  tote: {
    label: 'Túi tote Táo Quân',
    short: 'Túi tote',
    icon: 'tote',
    color: '#1f4e8c',
    ink: '#ffffff'
  },
  blindbox: {
    label: 'Blindbox bí ẩn',
    short: 'Blindbox',
    icon: 'gift',
    color: '#33245c',
    ink: '#f3d27a'
  },
  none: {
    label: 'Chúc may mắn lần sau',
    short: 'Lần sau',
    icon: 'clover',
    color: '#2f6a47',
    ink: '#fff3d6'
  }
};

export const WHEEL = [
  { prize: 'keychain', share: 13.3 },
  { prize: 'sticker', share: 13.3 },
  { prize: 'tote', share: 7 },
  { prize: 'keychain', share: 13.3 },
  { prize: 'sticker', share: 13.3 },
  { prize: 'blindbox', share: 6 },
  { prize: 'keychain', share: 13.4 },
  { prize: 'sticker', share: 13.4 },
  { prize: 'tote', share: 7 }
];

// Cập nhật cấu hình nan quạt & giải thưởng động từ Đợt quay đang hoạt động
export function applyPrizesToWheel(prizesList) {
  if (!Array.isArray(prizesList) || !prizesList.length) return;
  prizesList.forEach((p) => {
    PRIZES[p.key] = {
      label: p.name,
      short: p.short || p.name.slice(0, 10),
      icon: p.icon || (p.isGift ? 'gift' : 'clover'),
      color: p.color || '#b8241c',
      ink: p.ink || '#fff3d6'
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

  if (segments.length >= 3) {
    const mixed = [];
    const copy = segments.slice();
    while (copy.length) {
      const lastPrize = mixed.length ? mixed[mixed.length - 1].prize : null;
      let idx = copy.findIndex((s) => s.prize !== lastPrize);
      if (idx === -1) idx = 0;
      mixed.push(copy.splice(idx, 1)[0]);
    }
    WHEEL.length = 0;
    WHEEL.push(...mixed);
  } else if (segments.length) {
    WHEEL.length = 0;
    WHEEL.push(...segments);
  }
}

// Đồng bộ vòng quay may mắn với đợt đang diễn ra trên máy chủ
export async function syncWheelFromActiveRound() {
  try {
    const cached = store.get('cnt_active_wheel_prizes', null);
    if (cached) applyPrizesToWheel(cached);
    const res = await fetch('/api/pass?action=wheel');
    if (res.ok) {
      const d = await res.json();
      if (d.activeRound && Array.isArray(d.activeRound.prizes)) {
        applyPrizesToWheel(d.activeRound.prizes);
        store.set('cnt_active_wheel_prizes', d.activeRound.prizes);
      }
      if (Array.isArray(d.outOfStock)) {
        store.set('cnt_out_of_stock', d.outOfStock);
      }
    }
  } catch (e) {}
}

// Tự động kiểm tra nạp vòng quay từ cache khi khởi động
try {
  const initPrizes = store.get('cnt_active_wheel_prizes', null);
  if (initPrizes) applyPrizesToWheel(initPrizes);
} catch (e) {}

export const spinOf = (id = 'checkout') => {
  const pass = getPass();
  if (!pass) return null;
  if (id === 'checkout') {
    return pass.checkoutSpin || (pass.spins && pass.spins.checkout) || null;
  }
  return (pass.spins && pass.spins[id]) || null;
};

export const segStart = (k) => WHEEL.slice(0, k).reduce((a, b) => a + b.share * 3.6, 0);

export const segAt = (deg) => {
  let a = 0;
  for (let k = 0; k < WHEEL.length; k++) {
    a += WHEEL[k].share * 3.6;
    if (deg < a) return k;
  }
  return WHEEL.length - 1;
};

export const blossom = (x, y, r) => {
  const p = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.6}" transform="rotate(${
          i * 72
        })"/>`
    )
    .join('');
  return `<g transform="translate(${x} ${y})" fill="#f7b3c4" stroke="#c94b6d" stroke-width=".5">${p}<circle r="${
    r * 0.28
  }" fill="#d6336c" stroke="none"/></g>`;
};

export function wheelSVG() {
  const pt = (deg, r) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [+(r * Math.cos(t)).toFixed(2), +(r * Math.sin(t)).toFixed(2)];
  };
  const R = 84;
  const parts = WHEEL.map((seg, k) => {
    const a0 = segStart(k),
      a1 = a0 + seg.share * 3.6,
      mid = (a0 + a1) / 2,
      pz = PRIZES[seg.prize];
    const [x0, y0] = pt(a0, R),
      [x1, y1] = pt(a1, R),
      [tx, ty] = pt(mid, 57);
    const turn = mid <= 180 ? mid - 90 : mid + 90;
    return `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 ${
      a1 - a0 > 180 ? 1 : 0
    } 1 ${x1} ${y1} Z" fill="${pz.color}"/>
      <line x1="0" y1="0" x2="${x0}" y2="${y0}" stroke="#f3d27a" stroke-width="1.6"/>
      <text x="${tx}" y="${ty}" transform="rotate(${turn} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', 'Be Vietnam Pro', sans-serif" font-size="${
      seg.share < 7 ? 8.5 : 9.5
    }" fill="${pz.ink}">${pz.short}</text>`;
  }).join('');

  const bulbs = Array.from({ length: 24 }, (_, i) => {
    const [x, y] = pt(i * 15, 92);
    return `<circle cx="${x}" cy="${y}" r="2.6" fill="${
      i % 2 ? '#fff6d8' : '#f3c64d'
    }" stroke="#7a1a0e" stroke-width=".6"/>`;
  }).join('');

  const flowers = WHEEL.map((_, k) => {
    const [x, y] = pt(segStart(k), R - 2);
    return blossom(x, y, 4.2);
  }).join('');

  return `<svg viewBox="-100 -100 200 200" role="img" aria-label="Vòng quay may mắn: ${Object.values(
    PRIZES
  )
    .map((x) => x.label)
    .join(', ')}" xmlns="http://www.w3.org/2000/svg">
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
    </g></svg>`;
}

export const tetFx = {
  cv: null,
  ctx: null,
  parts: [],
  raf: 0,
  timer: 0,
  last: 0,
  onResize: null,

  mount(host) {
    this.unmount();
    const cv = document.createElement('canvas');
    cv.className = 'tet-fx';
    cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    if (reduceMotion) return;
    for (let i = 0; i < 12; i++) this.petal(true);
    this.timer = setInterval(() => this.petal(false), 420);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    if (!this.cv) return;
    const d = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = innerWidth * d;
    this.cv.height = innerHeight * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  },

  unmount() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.cv) this.cv.remove();
    this.cv = null;
    this.parts = [];
  },

  petal(anywhere, fast) {
    const whole = Math.random() < 0.3;
    this.parts.push({
      t: 'petal',
      whole,
      x: Math.random() * innerWidth,
      y: anywhere ? Math.random() * innerHeight * 0.8 : -20,
      vx: (Math.random() - 0.5) * 30,
      vy: (fast ? 90 : 35) + Math.random() * 40,
      rot: Math.random() * 6.3,
      vr: (Math.random() - 0.5) * 3,
      size: whole ? 7 + Math.random() * 5 : 5 + Math.random() * 5,
      phase: Math.random() * 6.3,
      color: ['#f7a8bd', '#f48fb1', '#fbc4d2', '#f06292'][Math.floor(Math.random() * 4)]
    });
  },

  burst(x, y, big) {
    if (!this.cv || reduceMotion) return;
    const sparks = big ? 70 : 18,
      papers = big ? 46 : 10;
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * 6.3,
        sp = (big ? 160 : 90) + Math.random() * (big ? 260 : 140);
      this.parts.push({
        t: 'spark',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5,
        age: 0,
        color: ['#ffd76a', '#ffb02e', '#fff4c2', '#ff6a3d'][Math.floor(Math.random() * 4)]
      });
    }
    for (let i = 0; i < papers; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6,
        sp = 80 + Math.random() * (big ? 260 : 150);
      this.parts.push({
        t: 'paper',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: Math.random() * 6.3,
        vr: (Math.random() - 0.5) * 14,
        w: 3 + Math.random() * 3,
        h: 6 + Math.random() * 6,
        life: 1.6 + Math.random() * 0.8,
        age: 0,
        color: Math.random() < 0.8 ? '#d42a1e' : '#f3c64d'
      });
    }
    this.parts.push({ t: 'flash', x, y, r: big ? 70 : 26, life: big ? 0.25 : 0.12, age: 0 });
  },

  loop(now) {
    if (!this.cv) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.ctx,
      H = innerHeight;
    c.clearRect(0, 0, innerWidth, H);
    this.parts = this.parts.filter((p) => {
      if (p.t === 'petal') {
        p.phase += dt * 2;
        p.x += (p.vx + Math.sin(p.phase) * 25) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        if (p.whole) {
          for (let i = 0; i < 5; i++) {
            c.rotate(1.2566);
            c.beginPath();
            c.ellipse(0, -p.size * 0.5, p.size * 0.36, p.size * 0.55, 0, 0, 6.3);
            c.fill();
          }
          c.fillStyle = '#d6336c';
          c.beginPath();
          c.arc(0, 0, p.size * 0.22, 0, 6.3);
          c.fill();
        } else {
          c.beginPath();
          c.ellipse(0, 0, p.size * 0.45, p.size * 0.8, 0, 0, 6.3);
          c.fill();
        }
        c.restore();
        return p.y < H + 30;
      }
      p.age += dt;
      if (p.age > p.life) return false;
      const k = 1 - p.age / p.life;
      if (p.t === 'spark') {
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 260 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        c.globalAlpha = k;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, 1.2 + 1.6 * k, 0, 6.3);
        c.fill();
      } else if (p.t === 'paper') {
        p.vx *= 0.97;
        p.vy = p.vy * 0.97 + 300 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        c.globalAlpha = Math.min(1, k * 2);
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      } else {
        c.globalAlpha = k * 0.85;
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, '#fff8d8');
        g.addColorStop(0.4, 'rgba(255,190,80,.6)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, 6.3);
        c.fill();
      }
      c.globalAlpha = 1;
      return true;
    });
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
};

window.tetFx = tetFx;

export function firecrackers() {
  const box = $('.dlg-box'),
    wheel = $('#wheel');
  const r = box
    ? box.getBoundingClientRect()
    : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const w = wheel ? wheel.getBoundingClientRect() : r;
  let t = 0;
  for (let i = 0; i < 30; i++) {
    t += 30 + Math.random() * 70;
    setTimeout(() => {
      sound.pop(false);
      const side = Math.random() < 0.5;
      const x = side ? r.left + Math.random() * 60 - 20 : r.right - Math.random() * 60 + 20;
      tetFx.burst(
        Math.max(10, Math.min(innerWidth - 10, x)),
        r.top + 40 + Math.random() * r.height * 0.6,
        false
      );
    }, t);
  }
  setTimeout(() => {
    sound.pop(true);
    tetFx.burst(w.left + w.width / 2, w.top + w.height * 0.25, true);
    for (let i = 0; i < 26; i++) tetFx.petal(false, true);
  }, t + 220);
}

let isWheelSpinning = false;
let wheelListeners = { onRefreshVisa: (id) => {}, onRenderCheckout: () => {}, onSpinComplete: () => {} };

export function setWheelCallbacks(callbacks) {
  wheelListeners = Object.assign(wheelListeners, callbacks);
}

export function openWheel(target = 'checkout') {
  const pass = getPass();
  if (!pass) return Promise.resolve();
  if (spinOf('checkout')) {
    toast('Bạn đã quay vòng quay may mắn Check-out rồi!', 'info', 'check-circle');
    return Promise.resolve();
  }
  isWheelSpinning = false;

  const dlg = $('#dlg');
  if (dlg && dlg.open) {
    try {
      dlg.close('');
    } catch (e) {}
  }

  const p = ask({
    tone: 'tet',
    title: 'Vòng quay may mắn Check-out',
    dismissible: false,
    html: `
      <div style="text-align:center;margin-bottom:8px;">
        <div class="wheel-ticket-banner" id="wheel-banner" aria-label="Bạn có 1 lượt quay">
          <i class="ph-fill ph-ticket" aria-hidden="true"></i>
          <span>Bạn có: <strong id="wheel-spins-count">1 lượt quay</strong></span>
          <span class="plus-badge">+1</span>
        </div>
      </div>
      <p class="tet-sub">✦ Vòng quay may mắn Check-out ✦<br>Chúc mừng bạn đã Check-out! Dùng <strong>1 lượt quay</strong> để nhận quà may mắn từ Chuyện Nhà Táo.</p>
      <div class="wheel-wrap">
        <span class="wheel-pin" aria-hidden="true"><svg viewBox="0 0 40 52"><path d="M20 50 L6 20 A14 14 0 1 1 34 20 Z" fill="#b8241c" stroke="#f3d27a" stroke-width="2.5"/>${blossom(
          20,
          16,
          7
        )}</svg></span>
        <div class="wheel" id="wheel">${wheelSVG()}</div>
      </div>
      <p class="wheel-result" id="wheel-result" aria-live="polite"></p>
      <button class="btn btn-tet btn-block btn-spin-active" type="button" id="wheel-spin">
        <i class="ph-fill ph-spiral" aria-hidden="true"></i> Quay lấy lộc (1 lượt)
      </button>`,
    buttons: [{ label: 'Để sau', value: 'later', cls: 'btn-quiet', id: 'wheel-close' }]
  });

  try {
    tetFx.mount(dlg);
  } catch (e) {}
  p.then(() => {
    isWheelSpinning = false;
    tetFx.unmount();
    if (spinOf('checkout')) {
      wheelListeners.onSpinComplete?.();
    }
  }).catch(() => {
    isWheelSpinning = false;
    tetFx.unmount();
  });

  const spinBtn = $('#wheel-spin');
  if (spinBtn) {
    spinBtn.addEventListener('click', () => {
      if (!isWheelSpinning) spinWheel('checkout');
    });
  }
  // Đồng bộ thời gian thực với Hệ thống Quản lý Vòng quay trên Admin ngay khi mở popup
  syncWheelFromActiveRound()
    .then(() => {
      if (!isWheelSpinning) {
        const w = $('#wheel');
        if (w) w.innerHTML = wheelSVG();
      }
    })
    .catch(() => {});
  track('wheel_open', { station: 'checkout' });
  return p;
}

export async function spinWheel(target = 'checkout') {
  const pass = getPass();
  if (!pass || spinOf('checkout') || isWheelSpinning) return;
  isWheelSpinning = true;
  try {
    sound.init();
  } catch (e) {}

  const btn = $('#wheel-spin');
  if (btn) {
    btn.disabled = true;
    btn.classList.remove('btn-spin-active');
    btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Đang quay lấy lộc...';
  }
  const countEl = $('#wheel-spins-count');
  if (countEl) countEl.textContent = '0 lượt';
  const bannerTag = $('.wheel-ticket-banner .plus-badge');
  if (bannerTag) bannerTag.style.display = 'none';
  const closeBtn = $('#wheel-close');
  if (closeBtn) closeBtn.disabled = true;

  // 1. Xin kết quả quay trực tiếp từ Hệ thống Quản lý Vòng quay trên Server (kiểm tra kho & tỉ lệ đợt đang chạy)
  let serverPrize = pass.checkoutPrize || (pass.serverPrizes && (pass.serverPrizes.checkout || pass.serverPrizes[4])) || null;
  let syncedWithServer = Boolean(serverPrize);

  if (!serverPrize && navigator.onLine) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1200);
      const r = await fetch('/api/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spin',
          pid: pass.id,
          name: pass.nickname || '',
          phone: pass.phone || '',
          email: pass.email || '',
          age: pass.age || '',
          origin: pass.origin || 'vietnamese',
          source: pass.source || '',
          gift: pass.giftCode || '',
          vid: store.get('vid', ''),
          scope: 'nhasach'
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (r.ok) {
        const d = await r.json();
        if (d.activeRound && Array.isArray(d.activeRound.prizes)) {
          applyPrizesToWheel(d.activeRound.prizes);
          store.set('cnt_active_wheel_prizes', d.activeRound.prizes);
          const wEl = $('#wheel');
          if (wEl) wEl.innerHTML = wheelSVG();
        }
        if (Array.isArray(d.outOfStock)) {
          store.set('cnt_out_of_stock', d.outOfStock);
        }
        if (d.prize) {
          serverPrize = d.prize;
          syncedWithServer = true;
        }
      }
    } catch (e) {}
  }

  const outOfStock = new Set(store.get('cnt_out_of_stock', []));
  const inStockPool = WHEEL.map((x, i) => i).filter((i) => !outOfStock.has(WHEEL[i].prize));
  const pool = inStockPool.length ? inStockPool : WHEEL.map((x, i) => i);
  let r = Math.random() * pool.reduce((a, i) => a + WHEEL[i].share, 0),
    k = pool[0];
  for (const i of pool) {
    k = i;
    if (r < WHEEL[i].share) break;
    r -= WHEEL[i].share;
  }

  const fixed = serverPrize;
  if (fixed && (!outOfStock.has(fixed) || !inStockPool.length)) {
    const ks = WHEEL.map((x, i) => (x.prize === fixed ? i : -1)).filter((i) => i >= 0);
    if (ks.length) k = ks[Math.floor(Math.random() * ks.length)];
  } else if (fixed && outOfStock.has(fixed) && inStockPool.length) {
    k = inStockPool[Math.floor(Math.random() * inStockPool.length)];
  }
  const at = segStart(k) + WHEEL[k].share * 3.6 * (0.15 + Math.random() * 0.7);
  const prize = WHEEL[k].prize;

  const nowTs = Date.now();
  pass.checkedOut = true;
  pass.claimed = true;
  pass.checkoutSpin = { prize, at: nowTs };
  pass.checkoutPrize = prize;
  if (!pass.spins) pass.spins = {};
  pass.spins.checkout = { prize, at: nowTs };
  setPass(pass);
  savePassToHistory(pass);

  // Cập nhật bản ghi local Nhà Sách check-in để đồng bộ quà vòng quay
  try {
    const nsList = store.get('nhasach_checkins', []);
    const idx = nsList.findIndex((item) => item && item.pid === pass.id);
    if (idx !== -1) {
      nsList[idx].checkoutPrize = prize;
      nsList[idx].claimed = true;
      nsList[idx].seen = nowTs;
      store.set('nhasach_checkins', nsList);
    }
  } catch (e) {}

  // Nếu lúc bấm mạng chậm chưa kịp gọi xong, đồng bộ ngầm lên server để trừ kho quà trên Admin
  if (!syncedWithServer && navigator.onLine) {
    fetch('/api/pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'spin',
        pid: pass.id,
        prize,
        name: pass.nickname || '',
        phone: pass.phone || '',
        email: pass.email || '',
        age: pass.age || '',
        origin: pass.origin || 'vietnamese',
        source: pass.source || '',
        gift: pass.giftCode || '',
        vid: store.get('vid', ''),
        scope: 'nhasach'
      })
    }).then((r) => r.json()).then((d) => {
      if (d.pass && d.pass.checkoutPrize) {
        pass.checkoutPrize = d.pass.checkoutPrize;
        setPass(pass);
      }
    }).catch(() => {});
  }

  measure('spin', { st: 4, prize });
  track('wheel_spin', { station: 'checkout', prize });

  const wheel = $('#wheel');
  const turn = 360 * (reduceMotion ? 1 : 6) + (360 - at);

  const reveal = () => {
    isWheelSpinning = false;
    const banner = $('#wheel-banner') || $('.wheel-ticket-banner');
    if (banner) {
      banner.innerHTML = `<i class="ph-fill ph-check-circle" style="color:#16a34a;font-size:18px;"></i> <span>Đã dùng <strong>1 lượt quay</strong></span>`;
      banner.style.background = '#dcfce7';
      banner.style.borderColor = '#22c55e';
      banner.style.animation = 'none';
    }
    const pz = PRIZES[prize] || PRIZES.sticker,
      win = prize !== 'none';
    const res = $('#wheel-result');
    if (res) {
      const iconHtml = (pz.icon && pz.icon.length > 2 && !pz.icon.includes(' '))
        ? `<i class="ph-fill ph-${pz.icon}" aria-hidden="true"></i>`
        : `<span style="font-size:20px; line-height:1; display:inline-block; vertical-align:middle;">${pz.icon || '🎁'}</span>`;
      res.innerHTML = win
        ? `${iconHtml} ${
            prize === 'blindbox' ? 'Quà hiếm, cả sự kiện chỉ có ít người trúng!' : 'Chúc mừng!'
          } Bạn trúng <strong>${
            pz.label
          }</strong>. Đưa mã nhận quà cho nhân sự tại bàn Check-out để nhận quà.`
        : `${iconHtml} ${pz.label}. Chúc bạn năm mới an khang thịnh vượng, cảm ơn bạn đã ghé thăm Chuyện Nhà Táo!`;
      res.className = 'wheel-result ' + (win ? 'is-win' : 'is-miss');
    }
    if (btn) btn.hidden = true;
    if (closeBtn) {
      closeBtn.disabled = false;
      closeBtn.textContent = 'Xong';
      closeBtn.className = 'btn btn-tet';
    }
    try {
      if (win) {
        firecrackers();
        toast(`Bạn trúng ${pz.label}!`, 'gold', 'gift');
      } else {
        sound.ting();
      }
    } catch (e) {}

    wheelListeners.onRefreshVisa(PP.done);
    wheelListeners.onRenderCheckout();
  };

  const dur = reduceMotion ? 0.6 : 4.6;
  let shown = false,
    lastSeg = -1;
  const finish = () => {
    if (shown) return;
    shown = true;
    if (hasGsap && wheel && window.gsap) {
      try {
        gsap.killTweensOf(wheel);
        gsap.set(wheel, { rotation: turn });
      } catch (e) {}
    } else if (wheel) {
      wheel.style.transform = `rotate(${turn}deg)`;
    }
    reveal();
  };

  const onUpdate = () => {
    try {
      if (!wheel) return;
      const rot = typeof gsap !== 'undefined' ? gsap.getProperty(wheel, 'rotation') : null;
      if (typeof rot === 'number' && !isNaN(rot)) {
        const seg = segAt((((360 - (rot % 360)) % 360) + 360) % 360);
        if (seg !== lastSeg) {
          if (lastSeg !== -1) sound.tick();
          lastSeg = seg;
        }
      }
    } catch (e) {}
  };

  if (hasGsap && wheel && window.gsap) {
    gsap.fromTo(
      wheel,
      { rotation: 0 },
      {
        rotation: turn,
        duration: dur,
        ease: reduceMotion ? 'power1.out' : 'power4.out',
        onUpdate,
        onComplete: finish
      }
    );
  }
  setTimeout(finish, dur * 1000 + 400);
}
