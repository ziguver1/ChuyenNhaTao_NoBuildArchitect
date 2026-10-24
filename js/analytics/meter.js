/**
 * Đo lường hành vi chi tiết theo từng người dùng (vid)
 * Gửi batch lên /api/track vài giây một lần hoặc khi rời trang (sendBeacon)
 */
import { store } from '../core/storage.js';

let passGetter = () => null;

/**
 * Đăng ký hàm lấy thông tin thẻ thông hành hiện tại (pass)
 * @param {Function} getter
 */
export function setPassGetter(getter) {
  passGetter = getter;
}

export const meter = {
  vid: store.get('vid', null),
  q: store.get('q', []),
  off: false,
  timer: 0,
  stats: Object.assign({ flips: 0, pages: [], last: null }, store.get('stats', {}))
};

if (!meter.vid) {
  meter.vid =
    'v-' +
    (window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  store.set('vid', meter.vid);
}

export function measure(t, data = {}) {
  meter.q.push(Object.assign({ t, ts: Date.now() }, data));
  if (meter.q.length > 300) meter.q.splice(0, meter.q.length - 300);
  store.set('q', meter.q);

  if (t === 'flip') {
    const st = meter.stats;
    st.flips++;
    st.last = data.p;
    if (!st.pages.includes(data.p)) st.pages.push(data.p);
    store.set('stats', st);
  }

  clearTimeout(meter.timer);
  meter.timer = setTimeout(() => flushMeter(), 4000);
}

export function flushMeter(leaving = false) {
  if (meter.off || !meter.q.length || !navigator.onLine) return;
  const events = meter.q.slice();
  const pass = typeof passGetter === 'function' ? passGetter() : null;
  const body = JSON.stringify({
    vid: meter.vid,
    pid: pass ? pass.id : null,
    name: pass ? pass.nickname : '',
    events
  });

  const sent = () => {
    meter.q.splice(0, events.length);
    store.set('q', meter.q);
  };

  if (leaving && navigator.sendBeacon) {
    if (navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) {
      sent();
    }
    return;
  }

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  })
    .then((r) => {
      if (r.ok) {
        sent();
      } else if ([404, 405, 501, 503].includes(r.status)) {
        // Chưa có API (chạy ở máy) hoặc chưa nối kho dữ liệu: thôi gửi trong lần mở trang này
        meter.off = true;
      }
    })
    .catch(() => {
      /* mất mạng: giữ hàng đợi, gửi lần sau */
    });
}

/**
 * Gắn các sự kiện lắng nghe khi người dùng ẩn tab hoặc rời trang
 */
export function initMeterListeners() {
  window.addEventListener('pagehide', () => flushMeter(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushMeter(true);
  });
}
