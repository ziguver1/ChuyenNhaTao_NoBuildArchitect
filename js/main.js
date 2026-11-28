/**
 * CHUYỆN NHÀ TÁO — Entry point (Clean Architecture / No-Build Native ESM)
 */
// Bảo vệ touch event: Ngăn cảnh báo [Intervention] khi vuốt cuộn màn hình trên di động
if (typeof Event !== 'undefined' && Event.prototype) {
  const _origPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (this.cancelable) {
      _origPreventDefault.call(this);
    }
  };
}

import { $ } from './core/dom.js';
import { store } from './core/storage.js';
import { toast } from './core/toast.js';
import { initMotionToggle, reduceMotion } from './core/motion.js';
import { initSoundToggle } from './core/audio.js';
import { initAnalytics, track } from './analytics/tracker.js';
import { initMeterListeners } from './analytics/meter.js';
import {
  initFlipbook,
  renderAllChapters,
  moveIndicator
} from './features/storybook/flipbook.js';
import { stopVoice, stopTale } from './features/storybook/narrator.js';
import { getPass, server } from './features/passport/passport.state.js';
import {
  initPassportUI,
  renderTicket,
  renderRegister,
  addStamp
} from './features/passport/ticket-ui.js';
import {
  startPolling,
  initPollingObserver,
  enterGate,
  restorePass
} from './features/passport/passport.service.js';
import { initGuideNote } from './features/passport/guide-note.js';
import {
  initUgcUI,
  renderLetter,
  unlockTest
} from './features/ugc-letter/letter-ui.js?v=3.9';
import { initLaSoBackground } from './effects/gold-dust.js';
import { initSceneCanvas } from './effects/scene-canvas.js';
import { initBookPassportTransition } from './effects/transitions.js';
import {
  initMobileMenu,
  initOfflineBar,
  initScrollAnimations
} from './effects/scroll-triggers.js';
import { initSiteIntro } from './effects/site-intro.js';
import { initBookCommunity } from './features/community/book-community.js';

// Một bước khởi tạo lỗi không được làm hỏng các phần còn lại của trang.
function safe(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error('[init] ' + name + ' lỗi:', err);
  }
}

function initApp() {
  // 1. Hạ tầng cốt lõi & Analytics
  safe('initMotionToggle', () => initMotionToggle(track));
  safe('initSoundToggle', () => initSoundToggle());
  safe('initAnalytics', () => initAnalytics());
  safe('initMeterListeners', () => initMeterListeners());
  safe('initMobileMenu', () => initMobileMenu());
  safe('initOfflineBar', () => initOfflineBar());

  // 2. Khởi tạo Storybook 4 chương
  safe('renderAllChapters', () => renderAllChapters());
  safe('initFlipbook', () => initFlipbook());
  safe('initBookCommunity', () => initBookCommunity());

  // 3. Khởi tạo Thẻ thông hành O2O
  safe('initPassportUI', () => initPassportUI());
  safe('initGuideNote', () => initGuideNote());
  safe('initPollingObserver', () => initPollingObserver());
  safe('renderTicket', () => renderTicket());
  safe('renderRegister', () => renderRegister());
  safe('startPolling', () => {
    if (getPass()) startPolling();
  });

  // 4. Khởi tạo Chuyện Nhà Đêm 23 (UGC)
  safe('initUgcUI', () => initUgcUI());
  safe('renderLetter', () => renderLetter());

  // 5. Khởi tạo Hiệu ứng đồ họa & Canvas
  safe('initLaSoBackground', () => initLaSoBackground());
  safe('initSceneCanvas', () => initSceneCanvas());
  safe('initBookPassportTransition', () => initBookPassportTransition());
  safe('initScrollAnimations', () => initScrollAnimations());
  safe('initSiteIntro', () => initSiteIntro());

  // 6. Xử lý Query Params trên URL (?vao=, ?tram=, ?the=, ?test=, ?demo=)
  const qs = new URLSearchParams(location.search);
  if (qs.has('test') || qs.has('demo')) {
    unlockTest();
    setTimeout(() => {
      $('#la-so')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 350);
  }

  const gate = qs.get('vao'),
    tram = qs.get('tram'),
    the = qs.get('the');

  if (gate || tram || the) {
    qs.delete('vao');
    qs.delete('tram');
    qs.delete('the');
    history.replaceState(
      null,
      '',
      location.pathname + (qs.toString() ? '?' + qs : '') + location.hash
    );
  }

  if (gate) enterGate(gate);
  if (the) {
    setTimeout(() => restorePass(the, false), 350);
  }

  if (tram) {
    const pass = getPass();
    if (pass) {
      setTimeout(() => {
        $('#ticket-slot')?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        });
        setTimeout(() => addStamp(tram), 700);
      }, 400);
    } else {
      store.set('pending_stamp', String(tram).toUpperCase());
      toast(
        'Bạn chưa có thẻ thông hành. Nhập tên để tạo thẻ, dấu của trạm này sẽ được đóng ngay sau đó.',
        'info',
        'qr-code'
      );
      setTimeout(() => {
        $('#register')?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 400);
    }
  }

  // Xoá vết vị trí cũ nếu từng lưu để không bao giờ tự ý cuộn trang khi reload
  try {
    store.del('last_active_section');
  } catch (e) {}

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopVoice();
      stopTale();
    }
  });
  window.addEventListener('pagehide', () => {
    stopVoice();
    stopTale();
  });

  requestAnimationFrame(() => moveIndicator(false));

  document.addEventListener('copy', () => {}, { passive: true });
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
