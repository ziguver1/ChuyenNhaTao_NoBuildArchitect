/**
 * Điều khiển lật trang sách điện tử (StPageFlip) và các điều hướng trang
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { track } from '../../analytics/tracker.js';
import { measure } from '../../analytics/meter.js';
import { sound } from '../../core/audio.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { CHAPTERS, P, ROMAN, chapterOfPage, folio } from './chapters.data.js';
import { book } from './storybook.state.js';
import {
  renderBadgePage,
  renderBadges,
  setStorybookNav,
  initMedalConsoleHelpers
} from './badges.js';
import {
  stopVoice,
  voiceOver,
  playTale,
  stopTale,
  finishTale,
  renderListen,
  tale
} from './narrator.js';

let flipbookEl = null;
let pageEls = [];
let isFlipping = false;

export function buildPageHTML() {
  const pageHTML = [];

  pageHTML[P.cover] = `
    <div class="pg-cover-img" style="position:relative; width:100%; height:100%; cursor:pointer;" data-goto="${P.intro}">
      <img src="images/sach/bia_sach.webp" alt="Bìa sách Chuyện Nhà Táo" style="width:100%; height:100%; object-fit:cover; display:block;">
      <button class="lp-open-icon" type="button" data-goto="${P.intro}" aria-label="Mở sách" title="Mở sách" style="position:absolute; bottom:18px; right:18px; width:40px; height:40px; border-radius:50%; background:rgba(30,18,12,0.85); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); border:1.5px solid rgba(243,210,122,0.8); color:#f3d27a; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,0.4); padding:0;">
        <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" style="margin-left:2px;"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
      </button>
    </div>`;

  pageHTML[P.intro] = `
    <div class="pg-body pg-intro">
      <div>
        <p class="pg-kicker">Lời mở đầu</p>
        <h3 class="pg-title">Gửi người giữ lửa</h3>
        <p class="pg-prose">Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời, kể lại một năm của mỗi gia đình. Cuốn sách nhỏ này mời bạn ngồi bên bếp lửa, đọc bốn câu chuyện về tôn kính, mái ấm, nhìn lại và hướng thiện.</p>
        <div class="pg-quote">
          “Bếp đỏ giữ lửa, nếp nhà đoàn viên. Dù ngoài kia có bão giông, cuối năm vẫn có một ngọn lửa ấm đợi mình về.”
          <small>— Chuyện Nhà Táo</small>
        </div>
        <p class="pg-prose">Cuối mỗi chương có một câu chuyện nhỏ để bạn lắng nghe. Sách là phần đọc thêm, không bắt buộc: bạn có thể tạo thẻ thông hành ngay và đến sự kiện đi bốn trạm.</p>
      </div>
      <p class="pg-hint"><i class="ph ph-hand-swipe-right" aria-hidden="true"></i> Kéo góc trang hoặc vuốt ngang để lật</p>
    </div>${folio(1)}`;

  pageHTML[P.toc] = `
    <div class="pg-body">
      <p class="pg-kicker">Mục lục</p>
      <ol class="pg-toc">
        ${CHAPTERS.map(
          (c, i) =>
            `<li><button type="button" data-goto="${P.art(i)}"><span class="toc-n">${
              ROMAN[i]
            }</span><span class="toc-t">${c.title}<small>${c.meaning}</small></span><span class="toc-p">${P.art(
              i
            )}</span></button></li>`
        ).join('')}
        <li><button type="button" data-goto="${P.summary}"><span class="toc-n"><i class="ph ph-medal" aria-hidden="true"></i></span><span class="toc-t">Bộ huy hiệu và sự kiện</span><span class="toc-p">${
    P.summary
  }</span></button></li>
      </ol>
    </div>${folio(2)}`;

  CHAPTERS.forEach((c, i) => {
    pageHTML[P.art(i)] = `
      <div class="pg-art" style="--pos:${c.pos || 'center'}">
        <figure class="pg-plate">
          <img src="${c.img}" alt="${c.alt}" loading="lazy" decoding="async" onerror="this.remove()">
          <i class="ph ph-${c.icon} pg-art-icon" aria-hidden="true"></i>
          <figcaption>Hình ${ROMAN[i]}. ${c.alt}</figcaption>
        </figure>
        <p class="pg-seed"><small>Câu hỏi gieo</small>${c.seed}</p>
      </div>${folio(P.art(i))}`;

    pageHTML[P.text(i)] = `
      <div class="pg-body pg-chapter-body">
        <div>
          <div class="pg-chapter-head">
            <div class="pg-head-text">
              <p class="pg-kicker">Chương ${ROMAN[i]} · ${c.meaning}</p>
              <h3 class="pg-title">${c.title}</h3>
            </div>
            <button class="pg-voice-circle" type="button" data-voice="${i}" aria-label="Nghe đọc chương" title="Nghe đọc">
              <i class="ph ph-speaker-high" aria-hidden="true"></i>
            </button>
          </div>
          <p class="pg-prose pg-story">${c.story}</p>
          <div class="pg-chapter-quote">
            <p>“${c.badge.desc}”</p>
          </div>
        </div>
      </div>${folio(P.text(i))}`;

    pageHTML[P.game(i)] = `<div class="pg-body"><p class="pg-kicker">Lắng nghe · Chương ${
      ROMAN[i]
    }</p><div class="game" id="game-${i}"></div></div>${folio(P.game(i))}`;

    pageHTML[P.badge(i)] = `<div class="pg-body pg-badge-page" id="badge-page-${i}"></div>${folio(
      P.badge(i)
    )}`;
  });

  pageHTML[P.summary] = `
    <div class="pg-body">
      <p class="pg-kicker">Tổng kết</p>
      <h3 class="pg-title" data-summary-title>Gom đủ bốn huy hiệu</h3>
      <div class="badges pg-badges" id="badges"></div>
    </div>${folio(P.summary)}`;

  pageHTML[P.event] = `
    <div class="pg-body">
      <p class="pg-kicker">Hẹn gặp ở sự kiện</p>
      <h3 class="pg-title">Bốn trạm đang chờ bạn</h3>
      <p class="pg-prose" data-summary-text>Bốn trạm thực tế đang chờ bạn đóng dấu và nhận quà.</p>
      <dl class="event-meta">
        <div><i class="ph ph-calendar-blank" aria-hidden="true"></i><span><dt>Ngày giờ</dt><dd><span class="soon">Sắp công bố</span></dd></span></div>
        <div><i class="ph ph-map-pin" aria-hidden="true"></i><span><dt>Địa điểm</dt><dd><span class="soon">Sắp công bố</span></dd></span></div>
      </dl>
      <a class="btn btn-primary btn-block" href="#tram-trai-nghiem" data-track="cta_passport" data-track-from="summary">Lấy thẻ thông hành</a>
    </div>${folio(P.event)}`;

  pageHTML[P.back] = `
    <div class="pg-body lp-back-page">
      <div class="lp-back-inner">
        <p class="lp-box">#Chuyện-Nhà-Táo</p>
        <div class="lp-titles">
          <p class="lp-red">Bếp đỏ giữ lửa</p>
          <p class="lp-small">Nếp nhà đoàn viên</p>
          <p class="lp-desc">Dù ngoài kia có bão giông, cuối năm vẫn có một ngọn lửa ấm đợi mình về.</p>
        </div>
        <div class="lp-action">
          <button class="btn btn-primary lp-replay-btn" type="button" data-goto="${P.cover}">
            <i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>
            <span>Đọc lại từ đầu</span>
          </button>
        </div>
        <p class="lp-rule">
          <span>In lần thứ nhất</span>
          <span>Giá : Một nụ cười</span>
        </p>
      </div>
    </div>`;

  return pageHTML;
}

export function pageLabel(p) {
  if (p === P.cover) return 'Bìa sách';
  if (p === P.back) return 'Bìa sau';
  const ch = chapterOfPage(p);
  const where = ch !== null ? `Chương ${ch + 1}` : p <= P.toc ? 'Lời mở đầu' : 'Tổng kết';
  return `${where} · Trang ${p}/${P.count - 2}`;
}

export function moveIndicator(animate) {
  const tabsEl = $('#chapter-tabs');
  if (!tabsEl) return;
  const tab = $('#tab-' + book.idx);
  const ind = $('.tab-indicator', tabsEl);
  if (!tab || !ind) return;
  const x = tab.offsetLeft - 6,
    w = tab.offsetWidth;
  if (hasGsap && animate && !reduceMotion && window.gsap) {
    gsap.to(ind, { x, width: w, duration: 0.45, ease: 'power3.out' });
  } else {
    ind.style.transform = `translateX(${x}px)`;
    ind.style.width = w + 'px';
  }
}

export function syncTabs() {
  const tabsEl = $('#chapter-tabs');
  if (!tabsEl) return;
  $$('.chapter-tab', tabsEl).forEach((t, i) => {
    t.setAttribute('aria-selected', String(i === book.idx));
    t.tabIndex = i === book.idx ? 0 : -1;
    const check = $('.ph-seal-check', t);
    if (check) check.hidden = !book.done.has(i);
    t.setAttribute(
      'aria-label',
      `Chương ${i + 1}: ${CHAPTERS[i].short}${book.done.has(i) ? ', đã hoàn thành' : ''}`
    );
  });
}

export function goPage(p) {
  p = Math.max(0, Math.min(P.count - 1, +p));
  if (book.flip) {
    try {
      book.flip.turnToPage(p);
    } catch (err) {
      try {
        book.flip.flip(p);
      } catch (e) {}
    }
    onPageChange(p);
  } else if (pageEls[p]) {
    pageEls[p].scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest'
    });
    onPageChange(p);
  }
}

export function onPageChange(p) {
  if (p !== book.page) measure('flip', { p });
  book.page = p;
  store.set('page', p);
  stopVoice();
  if (tale.playing && chapterOfPage(p) !== tale.i) stopTale();
  const ch = chapterOfPage(p);
  if (ch !== null && ch !== book.idx) {
    book.idx = ch;
    store.set('chapter', ch);
    moveIndicator(true);
  }
  if (ch !== null && !book.started.has(ch)) {
    book.started.add(ch);
    track('chapter_start', { chapter: ch + 1 });
  }
  syncTabs();
  const statusEl = $('#flip-status');
  if (statusEl) statusEl.textContent = pageLabel(p);
  const prevBtn = $('#flip-prev');
  if (prevBtn) prevBtn.disabled = p <= 0;
  const nextBtn = $('#flip-next');
  if (nextBtn) nextBtn.disabled = p >= P.count - 1;
}

export function renderAllChapters() {
  CHAPTERS.forEach((c, i) => {
    renderListen(i, book.done.has(i));
    renderBadgePage(i);
  });
  renderBadges();
  syncTabs();
}

export function initFlipbook() {
  flipbookEl = $('#flipbook');
  if (!flipbookEl) return;

  setStorybookNav(goPage, syncTabs, renderListen);
  initMedalConsoleHelpers();

  const pageHTML = buildPageHTML();
  flipbookEl.innerHTML = '';
  pageEls = pageHTML.map((html, n) => {
    const el = document.createElement('div');
    const hard = n === P.cover || n === P.back;
    el.className =
      'pg' +
      (hard ? ' pg-hard' : '') +
      (n === P.cover ? ' pg-cover' : '') +
      (n === P.back ? ' pg-backcover' : '');
    if (hard) el.dataset.density = 'hard';
    el.setAttribute('role', 'group');
    el.setAttribute(
      'aria-label',
      n === P.cover ? 'Bìa sách' : n === P.back ? 'Bìa sau' : `Trang ${n}`
    );
    el.innerHTML = html;

    const guard = (e) => {
      if (
        e.target.closest('button, a, input, label, textarea, select, .chip, .option, [data-noflip]')
      ) {
        e.stopPropagation();
      }
    };
    el.addEventListener('mousedown', guard);
    el.addEventListener('touchstart', guard, { passive: true });
    flipbookEl.appendChild(el);
    return el;
  });

  const tabsEl = $('#chapter-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = '';
    CHAPTERS.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter-tab';
      b.setAttribute('role', 'tab');
      b.id = 'tab-' + i;
      b.setAttribute('aria-controls', 'flip-stage');
      b.innerHTML = `<span class="n">Chương ${
        i + 1
      }<i class="ph-fill ph-seal-check" aria-hidden="true" hidden></i></span><span class="t">${
        c.short
      }</span>`;
      b.addEventListener('click', () => goPage(P.art(i)));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const n = (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
          $('#tab-' + n)?.focus();
          goPage(P.art(n));
        }
      });
      tabsEl.appendChild(b);
    });
  }

  window.addEventListener('resize', () => moveIndicator(false));

  flipbookEl.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) {
      goPage(+go.dataset.goto);
      return;
    }
    const v = e.target.closest('[data-voice]');
    if (v) {
      voiceOver(v, +v.dataset.voice);
      return;
    }
    const t = e.target.closest('[data-tale]');
    if (t) {
      playTale(+t.dataset.tale);
      return;
    }
    const all = e.target.closest('[data-tale-all]');
    if (all) {
      stopTale();
      finishTale(+all.dataset.taleAll, 'read');
    }
  });

  $('#flip-prev')?.addEventListener('click', () => {
    if (isFlipping) return;
    if (book.flip) {
      if (book.page <= 0) return;
      isFlipping = true;
      try {
        book.flip.flipPrev();
      } catch (err) {
        goPage(Math.max(0, book.page - 1));
      }
      setTimeout(() => {
        isFlipping = false;
      }, 650);
    } else {
      goPage(Math.max(0, book.page - 1));
    }
  });

  $('#flip-next')?.addEventListener('click', () => {
    if (isFlipping) return;
    if (book.flip) {
      if (book.page >= P.count - 1) return;
      isFlipping = true;
      try {
        book.flip.flipNext();
      } catch (err) {
        goPage(Math.min(P.count - 1, book.page + 1));
      }
      setTimeout(() => {
        isFlipping = false;
      }, 650);
    } else {
      goPage(Math.min(P.count - 1, book.page + 1));
    }
  });

  $('#flip-stage')?.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      $('#flip-next')?.click();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      $('#flip-prev')?.click();
    }
  });

  const PF = window.St && window.St.PageFlip;
  if (!PF) {
    $('#flip-stage')?.classList.add('is-fallback');
    onPageChange(book.page);
    return;
  }

  const narrow = window.innerWidth < 600;
  const ph = narrow ? 740 : 620;
  const maxH = Math.max(440, Math.min(narrow ? 600 : 680, window.innerHeight - 140));

  book.flip = new PF(flipbookEl, {
    width: 460,
    height: ph,
    size: 'stretch',
    minWidth: 280,
    maxWidth: Math.round((maxH * 460) / ph),
    minHeight: 380,
    maxHeight: maxH,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: 0.08,
    flippingTime: reduceMotion ? 1 : 600,
    mobileScrollSupport: true,
    disableFlipByClick: true,
    showPageCorners: !reduceMotion,
    swipeDistance: 30,
    startPage: book.page,
    startZIndex: 1
  });
  book.flip.loadFromHTML(pageEls);

  const ctrl = book.flip.getFlipController();
  if (ctrl) {
    ctrl.flipPrev = function (t = 'top') {
      const r = this.render.getRect();
      this.flip({
        x: (r.left || 0) + 12,
        y: t === 'top' ? 1 : r.height - 2
      });
    };
  }

  book.flip.on('flip', (e) => {
    isFlipping = false;
    sound.flip();
    onPageChange(e.data);
  });

  book.flip.on('changeOrientation', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  $('#flip-stage')?.classList.add('is-ready');
  onPageChange(book.page);
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}
