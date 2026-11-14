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
import { getPass, server } from './features/passport/passport.state.js?v=4.5';
import {
  initPassportUI,
  renderTicket,
  renderRegister,
  addStamp,
  triggerCheckoutNow
} from './features/passport/ticket-ui.js?v=4.5';
import {
  startPolling,
  initPollingObserver,
  enterGate,
  restorePass
} from './features/passport/passport.service.js?v=4.5';
import { initGuideNote } from './features/passport/guide-note.js';
import {
  initUgcUI,
  renderLetter,
  unlockTest
} from './features/ugc-letter/letter-ui.js';
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

function initApp() {
  // 1. Hạ tầng cốt lõi & Analytics
  initMotionToggle(track);
  initSoundToggle();
  initAnalytics();
  initMeterListeners();
  initMobileMenu();
  initOfflineBar();

  // 2. Khởi tạo Storybook 4 chương (nếu có trên trang)
  if ($('#flipbook')) {
    renderAllChapters();
    initFlipbook();
    initBookCommunity();
  }

  // 3. Khởi tạo Thẻ thông hành O2O / Khảo sát Check-in
  initPassportUI();
  renderRegister();
  startPolling();
  initPollingObserver();

  // 4. Khởi tạo Chuyện Nhà Đêm 23 (UGC) (nếu có trên trang)
  if ($('#la-so')) {
    initUgcUI();
    renderLetter();
  }

  // 5. Khởi tạo Hiệu ứng đồ họa & Canvas (nếu có trên trang)
  if ($('#la-so-bg-canvas')) initLaSoBackground();
  if ($('#scene-canvas')) initSceneCanvas();
  if ($('#seam-book-passport')) initBookPassportTransition();
  initScrollAnimations();

  // 6. Xử lý Query Params trên URL (?vao=, ?tram=, ?the=, ?checkout=, ?test=, ?demo=)
  const qs = new URLSearchParams(location.search);
  if (qs.has('test') || qs.has('demo')) {
    unlockTest();
    setTimeout(() => {
      $('#la-so')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 350);
  }

  const gate = qs.get('vao'),
    tram = qs.get('tram') || qs.get('checkout'),
    the = qs.get('the');

  if (gate || tram || the) {
    qs.delete('vao');
    qs.delete('tram');
    qs.delete('checkout');
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
        $('#checkout')?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        });
        setTimeout(() => triggerCheckoutNow(), 400);
      }, 300);
    } else {
      toast(
        'Bạn chưa có thẻ thông hành. Vui lòng hoàn tất Check-in tạo thẻ trước khi Check-out nhé!',
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

  if ($('#flipbook')) {
    requestAnimationFrame(() => moveIndicator(false));
  }

  document.addEventListener('copy', () => {}, { passive: true });
  window.addEventListener('pagehide', () => {
    stopVoice();
    stopTale();
  });
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
