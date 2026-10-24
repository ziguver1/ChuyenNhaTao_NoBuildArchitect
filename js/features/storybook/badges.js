/**
 * Quản lý mở khóa huy hiệu 4 chương và Modal thành tựu
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { track } from '../../analytics/tracker.js';
import { measure } from '../../analytics/meter.js';
import { sound } from '../../core/audio.js';
import { toast } from '../../core/toast.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { CHAPTERS, P } from './chapters.data.js';
import { book } from './storybook.state.js';

let navToPage = (p) => {};
let refreshTabs = () => {};
let refreshListen = (i, done) => {};

export function setStorybookNav(goPageFn, syncTabsFn, renderListenFn) {
  navToPage = goPageFn;
  refreshTabs = syncTabsFn;
  refreshListen = renderListenFn;
}

/**
 * Hiển thị trang huy hiệu bên trong sách
 */
export function renderBadgePage(i, animate) {
  const c = CHAPTERS[i];
  if (!c) return;
  const on = book.done.has(i);
  const last = i === CHAPTERS.length - 1;
  const pg = $('#badge-page-' + i);
  if (!pg) return;

  const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.png`;
  pg.innerHTML = `
    <p class="pg-kicker">Huy hiệu chương ${i + 1}</p>
    <div class="pg-medal ${on ? 'is-on' : 'is-locked'}">
      <div class="pg-medal-aura" aria-hidden="true"></div>
      <img class="pg-medal-img" src="${medalImg}" alt="${c.badge.name}" width="160" height="160" loading="lazy">
      ${!on ? '<span class="pg-medal-lock-badge" title="Chưa mở" aria-label="Chưa mở"><i class="ph-fill ph-lock-simple" aria-hidden="true"></i></span>' : ''}
    </div>
    <h3 class="pg-title">${c.badge.name}</h3>
    <p class="pg-prose">${on ? c.badge.desc : 'Nghe câu chuyện ở trang bên để mở huy hiệu này.'}</p>
    ${
      on
        ? last
          ? `<button class="btn btn-primary" type="button" data-goto="${P.summary}">Xem bộ huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`
          : `<button class="btn btn-primary" type="button" data-goto="${P.art(i + 1)}">Sang chương ${i + 2} <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`
        : `<button class="btn btn-ghost" type="button" data-goto="${P.game(i)}"><i class="ph ph-arrow-left" aria-hidden="true"></i> Về câu chuyện</button>`
    }`;

  const pgMedal = $('.pg-medal', pg);
  if (animate && hasGsap && !reduceMotion && pgMedal && window.gsap) {
    gsap.from(pgMedal, {
      scale: 0.3,
      rotation: -20,
      duration: 0.7,
      ease: 'back.out(2)',
      delay: 0.2
    });
  }
}

/**
 * Hoàn thành 1 chương sách, kích hoạt mở huy hiệu
 */
export function completeChapter(i) {
  const first = !book.done.has(i);
  book.done.add(i);
  store.set('chapters_done', [...book.done]);
  track('chapter_complete', { chapter: i + 1 });

  if (first) {
    measure('listen', { ch: i + 1 });
    track('badge_unlocked', { badge: CHAPTERS[i].badge.name });
  }

  if (typeof refreshListen === 'function') refreshListen(i, true);
  renderBadgePage(i, false);
  if (typeof refreshTabs === 'function') refreshTabs();
  renderBadges();
  showMedalRewardPopup(i);
}

/**
 * Popup nhận Huy Chương kiểu game khi nghe kể xong
 */
export function showMedalRewardPopup(i) {
  const c = CHAPTERS[i];
  if (!c) return;
  const modal = $('#medal-modal');
  if (!modal) return;

  const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.png`;
  const medalImgEl = $('#medal-modal-img');
  if (medalImgEl) {
    medalImgEl.src = medalImg;
    medalImgEl.alt = c.badge.name;
  }
  const nameEl = $('#medal-modal-name');
  if (nameEl) nameEl.textContent = c.badge.name;
  const descEl = $('#medal-modal-desc');
  if (descEl) descEl.textContent = c.badge.desc;

  const COIN_METRICS = [
    { cx: '51.5%', cy: '59.5%', dia: '56%' },
    { cx: '50.3%', cy: '50.7%', dia: '55%' },
    { cx: '49%', cy: '58%', dia: '58%' },
    { cx: '49.0%', cy: '60.0%', dia: '58%' }
  ];
  const m = COIN_METRICS[i] || { cx: '50%', cy: '55%', dia: '65%' };
  const stage = $('.medal-modal-stage');
  if (stage) {
    stage.style.setProperty('--coin-cx', m.cx);
    stage.style.setProperty('--coin-cy', m.cy);
    stage.style.setProperty('--coin-dia', m.dia);
  }

  modal.hidden = false;
  sound.init();
  sound.chime();
  sound.ting();

  if (typeof window.tetFx !== 'undefined' && window.tetFx.burst) {
    setTimeout(() => {
      const cx = window.innerWidth / 2,
        cy = window.innerHeight / 2;
      window.tetFx.burst(cx - 90, cy - 80, true);
      window.tetFx.burst(cx + 90, cy - 80, true);
      sound.pop(true);
    }, 250);
  }

  if (hasGsap && !reduceMotion && window.gsap) {
    gsap.fromTo(
      '.medal-modal-body',
      { scale: 0.35, y: 30, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.8)' }
    );
    gsap.fromTo('.medal-sunburst', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' });
  }

  const btn = $('#medal-modal-stamp-btn');
  if (btn) btn.focus();

  let stamped = false;
  const doStamp = () => {
    if (stamped) return;
    stamped = true;
    closeMedalPopup(() => stampMedalIntoBookPage(i));
  };

  const closeMedalPopup = (cb) => {
    cleanupListeners();
    if (hasGsap && !reduceMotion && window.gsap) {
      gsap.to('.medal-modal-body', {
        scale: 0.6,
        opacity: 0,
        y: -20,
        duration: 0.28,
        ease: 'power2.in',
        onComplete: () => {
          modal.hidden = true;
          if (cb) cb();
        }
      });
    } else {
      modal.hidden = true;
      if (cb) cb();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      doStamp();
    }
  };
  const onBackdrop = (e) => {
    if (
      e.target === $('#medal-modal-backdrop') ||
      e.target === modal ||
      e.target === $('.medal-modal-card')
    ) {
      doStamp();
    }
  };
  const onBtn = (e) => {
    e.preventDefault();
    doStamp();
  };

  function cleanupListeners() {
    document.removeEventListener('keydown', onKey);
    modal.removeEventListener('click', onBackdrop);
    btn?.removeEventListener('click', onBtn);
  }

  cleanupListeners();
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', onBackdrop);
  btn?.addEventListener('click', onBtn);
}

/**
 * Đóng dấu huy hiệu vào trang sách
 */
export function stampMedalIntoBookPage(i) {
  navToPage(P.badge(i));

  setTimeout(
    () => {
      sound.stamp(true);
      const pg = $('#badge-page-' + i);
      if (!pg) return;
      const medalEl = $('.pg-medal', pg);
      if (!medalEl) return;

      medalEl.classList.remove('is-stamping');
      void medalEl.offsetWidth;
      medalEl.classList.add('is-stamping');

      const wave = document.createElement('div');
      wave.className = 'stamp-shockwave';
      wave.setAttribute('aria-hidden', 'true');
      medalEl.appendChild(wave);
      setTimeout(() => wave.remove(), 1000);

      if (typeof window.tetFx !== 'undefined' && window.tetFx.burst) {
        const r = medalEl.getBoundingClientRect();
        window.tetFx.burst(r.left + r.width / 2, r.top + r.height / 2, false);
      }

      toast(`✦ ${CHAPTERS[i].badge.name} đã được in trang trọng vào sách!`, 'gold', 'medal');
    },
    book.flip ? 380 : 120
  );
}

/**
 * Hiển thị tổng kết 4 huy chương
 */
export function renderBadges() {
  const container = $('#badges');
  if (!container) return;

  container.innerHTML = CHAPTERS.map((c, i) => {
    const on = book.done.has(i);
    const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.png`;
    return `<button type="button" class="badge ${on ? 'is-unlocked' : ''}" data-badge="${i}" data-goto="${
      on ? P.badge(i) : P.art(i)
    }">
      <span class="disc ${on ? 'is-on' : 'is-locked'}">
        <img src="${medalImg}" alt="${c.badge.name}" class="badge-thumb-img" loading="lazy">
        ${!on ? '<span class="badge-lock-ico" aria-hidden="true"><i class="ph-fill ph-lock-simple"></i></span>' : ''}
      </span>
      <h4>${c.badge.name}</h4>
      <p>${on ? c.badge.desc : 'Đọc chương ' + (i + 1) + ' để mở'}</p>
    </button>`;
  }).join('');

  const n = book.done.size;
  const titleEl = $('[data-summary-title]');
  if (titleEl) {
    titleEl.textContent =
      n === 4
        ? 'Bạn đã gom đủ bốn huy hiệu'
        : n === 0
        ? 'Gom đủ bốn huy hiệu'
        : `Bạn đã có ${n}/4 huy hiệu`;
  }
  const textEl = $('[data-summary-text]');
  if (textEl) {
    textEl.textContent =
      n === 4
        ? 'Tôn kính, mái ấm, nhìn lại và hướng thiện. Mang cả bốn giá trị ấy đến sự kiện và đóng dấu ở bốn trạm nhé.'
        : 'Bốn trạm thực tế đang chờ bạn đóng dấu và nhận quà.';
  }

  if (typeof window.renderLetter === 'function' && $('#letter-lock')) {
    window.renderLetter();
  }
}

/**
 * Gắn helper test vào window console (F12)
 */
export function initMedalConsoleHelpers() {
  window.resetMedals = function (ch) {
    if (typeof ch === 'number') {
      book.done.delete(ch);
      toast(`Đã khóa lại Huy chương chương ${ch + 1}!`, 'info');
    } else {
      book.done.clear();
      toast('Đã khóa lại toàn bộ 4 Huy chương để test!', 'info');
    }
    store.set('chapters_done', [...book.done]);
    for (let idx = 0; idx < CHAPTERS.length; idx++) {
      if (typeof refreshListen === 'function') refreshListen(idx, book.done.has(idx));
      renderBadgePage(idx, false);
    }
    if (typeof refreshTabs === 'function') refreshTabs();
    renderBadges();
  };

  window.testMedalPopup = function (ch = 0) {
    completeChapter(ch);
  };
}
