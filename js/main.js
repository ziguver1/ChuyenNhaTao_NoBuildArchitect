/**
 * CHUYỆN NHÀ TÁO — Entry point (Clean Architecture / No-Build Native ESM)
 */
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

function initApp() {
  // 1. Hạ tầng cốt lõi & Analytics
  initMotionToggle(track);
  initSoundToggle();
  initAnalytics();
  initMeterListeners();
  initMobileMenu();
  initOfflineBar();

  // 2. Khởi tạo Storybook 4 chương
  renderAllChapters();
  initFlipbook();

  // 3. Khởi tạo Thẻ thông hành O2O
  initPassportUI();
  initGuideNote();
  initPollingObserver();
  renderTicket();
  renderRegister();
  if (getPass()) {
    startPolling();
  }

  // 4. Khởi tạo Chuyện Nhà Đêm 23 (UGC)
  initUgcUI();
  renderLetter();

  // 5. Khởi tạo Hiệu ứng đồ họa & Canvas
  initLaSoBackground();
  initSceneCanvas();
  initBookPassportTransition();
  initScrollAnimations();
  initSiteIntro();

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

  if (tram && server.on) {
    toast(
      'Ở sự kiện, nhân sự sẽ quét mã QR trên hộ chiếu của bạn để đóng dấu.',
      'info',
      'qr-code'
    );
  } else if (tram) {
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

  requestAnimationFrame(() => moveIndicator(false));

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
