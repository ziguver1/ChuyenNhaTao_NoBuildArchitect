/**
 * Quản lý sự kiện Analytics & UTM tracking
 */
import { store } from '../core/storage.js';

window.dataLayer = window.dataLayer || [];

export const utm = {};
new URLSearchParams(location.search).forEach((v, k) => {
  if (k.startsWith('utm_')) utm[k] = v;
});
if (Object.keys(utm).length) {
  store.set('utm', utm);
}

export function track(event, props = {}) {
  const payload = Object.assign({ event, ts: Date.now() }, store.get('utm', {}), props);
  window.dataLayer.push(payload);
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.debug('[track]', payload);
  }
}

/**
 * Khởi tạo tracking page_view và click trên các thẻ [data-track]
 */
export function initAnalytics() {
  track('page_view', { utm_source: utm.utm_source || null });
  if (store.get('visited', false)) {
    track('return_visit');
  } else {
    store.set('visited', true);
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { from: el.dataset.trackFrom });
  });
}
