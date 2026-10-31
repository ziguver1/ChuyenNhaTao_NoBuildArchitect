/**
 * Điều khiển lật trang sách điện tử (StPageFlip) và các điều hướng trang
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { track } from '../../analytics/tracker.js';
import { measure } from '../../analytics/meter.js';
import { sound } from '../../core/audio.js';
import { toast } from '../../core/toast.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { CHAPTERS, P, ROMAN, chapterOfPage, folio, pageLabel } from './chapters.data.js';
import { book } from './storybook.state.js';
import {
  renderBadgePage,
  renderBadges,
  completeChapter,
  showMedalRewardPopup,
  getBadgePageHTML,
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
import { onFlipbookPageChanged } from '../community/book-community.js';

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
      <div class="intro-compact">
        <p class="pg-kicker">Lời mở đầu</p>
        <h3 class="pg-title">Gửi người giữ lửa</h3>
        <p class="pg-prose">Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời, kể lại một năm của mỗi gia đình. Cuốn sách nhỏ này mời bạn ngồi bên bếp lửa, cùng xem lại những câu chuyện về nếp nhà và hơi ấm đoàn viên.</p>
        <div class="pg-quote">
          “Bếp đỏ giữ lửa, nếp nhà đoàn viên.”
          <small>— Chuyện Nhà Táo</small>
        </div>
      </div>
    </div>${folio(1)}`;

  pageHTML[P.toc] = `
    <div class="pg-body pg-toc-body">
      <div class="toc-compact">
        <p class="pg-kicker">Mục lục</p>
        <ol class="pg-toc">
          ${CHAPTERS.map(
            (c, i) =>
              `<li class="${c.locked ? 'toc-locked-item' : ''}">
                <button type="button" data-goto="${c.startPage}">
                  <span class="toc-n">${c.locked ? '<i class="ph-fill ph-lock-key" aria-hidden="true"></i>' : ROMAN[i]}</span>
                  <span class="toc-t">
                    <span class="toc-title-row">
                      ${c.title}
                      ${c.locked ? '<span class="toc-badge-lock">Khóa</span>' : ''}
                    </span>
                    <small>${c.meaning}</small>
                  </span>
                  <span class="toc-p">${c.locked ? '<i class="ph ph-lock-simple"></i>' : c.startPage}</span>
                </button>
              </li>`
          ).join('')}
          <li>
            <button type="button" data-goto="${P.summary}">
              <span class="toc-n"><i class="ph ph-medal" aria-hidden="true"></i></span>
              <span class="toc-t">Bộ huy hiệu và sự kiện</span>
              <span class="toc-p">${P.summary}</span>
            </button>
          </li>
        </ol>
      </div>
    </div>${folio(2)}`;

  CHAPTERS.forEach((c, i) => {
    // 1. Nếu chương có danh sách ảnh -> full 100% trang sách, không nút, không lề
    if (c.pages && c.pages.length > 0) {
      c.pages.forEach((src, imgIdx) => {
        const pageNum = c.imagePages[imgIdx];
        pageHTML[pageNum] = `
          <div class="pg-full-comic">
            <img src="${src}" alt="Chương ${ROMAN[i]}: ${c.title} - Trang ${imgIdx + 1}" class="pg-full-comic-img" width="990" height="1330" loading="eager" decoding="async">
          </div>`;
      });
    } else {
      // 2. Nếu chương bị khóa (chưa có ảnh)
      pageHTML[c.lockedPage] = `
        <div class="pg-body pg-locked-page">
          <div class="locked-page-card">
            <div class="locked-page-badge-pill">
              <i class="ph-fill ph-lock-key" aria-hidden="true"></i>
              <span>CHƯƠNG ${ROMAN[i]} · ĐANG BIÊN SOẠN</span>
            </div>
            <div class="locked-page-art-zone">
              <div class="locked-glow-ring" aria-hidden="true"></div>
              <div class="locked-icon-shield">
                <i class="ph-fill ph-lock-key" aria-hidden="true"></i>
              </div>
            </div>
            <h3 class="locked-page-title">${c.title}</h3>
            <p class="locked-page-meaning">${c.meaning}</p>
            <div class="locked-page-box">
              <p class="locked-page-text"><i class="ph ph-paint-brush"></i> ${c.lockedReason}</p>
              <p class="locked-page-hint">Mời bạn quay lại thưởng thức trọn vẹn <strong>Chương I: Mái Ấm</strong> để mở Huy chương Mái Ấm trước nhé!</p>
            </div>
          </div>
        </div>${folio(c.lockedPage)}`;
    }

    // Trang huy hiệu của chương
    pageHTML[c.badgePage] = `
      <div class="pg-body pg-badge-page" id="badge-page-${i}">
        ${getBadgePageHTML(i)}
      </div>${folio(c.badgePage)}`;
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
      <a class="btn btn-primary btn-block" href="#tram-trai-nghiem" data-track="cta_passport" data-track-from="summary">Vân Du Ký (Coming Soon)</a>
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

export { pageLabel };

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
    const c = CHAPTERS[i];
    t.setAttribute('aria-selected', String(i === book.idx));
    t.tabIndex = i === book.idx ? 0 : -1;
    const check = $('.ph-seal-check', t);
    if (check) check.hidden = !book.done.has(i);
    t.setAttribute(
      'aria-label',
      `Chương ${i + 1}: ${c.short}${c.locked ? ', đang biên soạn' : book.done.has(i) ? ', đã hoàn thành' : ''}`
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

  // TỰ ĐỘNG TRAO HUY CHƯƠNG MÁI ẤM KHI LẬT ĐẾN TRANG HUY HIỆU (sau khi đọc xong chương 1)
  const ch0 = CHAPTERS[0];
  if (ch0 && !book.done.has(0)) {
    if (p === ch0.badgePage) {
      setTimeout(() => {
        if (!book.done.has(0)) completeChapter(0);
      }, 500);
    }
  }

  syncTabs();
  const statusEl = $('#flip-status');
  if (statusEl) statusEl.textContent = pageLabel(p);
  const prevBtn = $('#flip-prev');
  if (prevBtn) prevBtn.disabled = p <= 0;
  const nextBtn = $('#flip-next');
  if (nextBtn) nextBtn.disabled = p >= P.count - 1;

  // Cập nhật cảm xúc và bình luận riêng theo từng trang sách
  if (typeof onFlipbookPageChanged === 'function') {
    onFlipbookPageChanged(p);
  }
}

export function renderAllChapters() {
  CHAPTERS.forEach((c, i) => {
    if (typeof renderListen === 'function') renderListen(i, book.done.has(i));
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
        e.target.closest('button, a, input, label, textarea, select, .chip, .option, [data-noflip], .ig-book-actions, .ig-reaction-picker')
      ) {
        e.stopPropagation();
      }
    };
    el.addEventListener('mousedown', guard);
    el.addEventListener('touchstart', guard, { passive: true });
    el.addEventListener('pointerdown', guard);
    flipbookEl.appendChild(el);
    return el;
  });

  // Chặn lật trang khi bảng thả cảm xúc reaction đang mở (bấm ra ngoài thì chỉ đóng bảng chứ không lật trang)
  flipbookEl.addEventListener('touchstart', (e) => {
    const picker = document.getElementById('ig-reaction-picker');
    if (picker && !picker.hidden) {
      picker.hidden = true;
      const btn = document.getElementById('btn-ig-reaction');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  }, { capture: true, passive: false });

  // Đồng bộ nội dung các trang và huy chương ngay khi các thẻ trang đã gắn vào DOM
  renderAllChapters();

  const tabsEl = $('#chapter-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = '';
    CHAPTERS.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter-tab' + (c.locked ? ' is-locked' : '');
      b.id = 'tab-' + i;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'flip-stage');
      b.innerHTML = `<span class="n">Chương ${i + 1}
        ${
          c.locked
            ? '<i class="ph-fill ph-lock-key" aria-hidden="true" title="Chương đang biên soạn"></i>'
            : '<i class="ph-fill ph-seal-check" aria-hidden="true" hidden></i>'
        }
      </span><span class="t">${c.short}</span>`;

      b.addEventListener('click', () => {
        if (c.locked) {
          toast(
            `Chương ${i + 1}: ${c.short} đang được biên họa tranh minh họa. Hãy đón đọc Chương 1 trước nhé!`,
            'info',
            'lock-key'
          );
        }
        goPage(c.startPage);
      });

      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const n = (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
          $('#tab-' + n)?.focus();
          goPage(CHAPTERS[n].startPage);
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
    const claim = e.target.closest('[data-claim-chapter]');
    if (claim) {
      completeChapter(+claim.dataset.claimChapter);
      return;
    }
    const replay = e.target.closest('[data-replay-medal]');
    if (replay) {
      showMedalRewardPopup(+replay.dataset.replayMedal);
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
  // Tỉ lệ tranh truyện gốc 990 x 1330 (tỉ lệ chiều cao / chiều rộng ~ 1.3434)
  const pageRatio = 1330 / 990;
  const pw = 460;
  const ph = Math.round(pw * pageRatio); // 618px: đồng bộ tỉ lệ chuẩn xác của ảnh tranh
  const maxH = Math.max(440, Math.min(narrow ? 640 : 680, window.innerHeight - 120));
  // Trên điện thoại (chế độ portrait 1 trang), cho phép trang sách mở rộng tối đa sát lề màn hình
  const maxW = narrow
    ? Math.min(540, Math.max(300, window.innerWidth - 16))
    : Math.round((maxH * pw) / ph);

  book.flip = new PF(flipbookEl, {
    width: pw,
    height: ph,
    size: 'stretch',
    minWidth: 260,
    maxWidth: maxW,
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
  preloadFlipbookAssets();
}

/**
 * Tải trước ngầm toàn bộ ảnh trang sách & huy hiệu vào bộ nhớ đệm
 * Giúp lật trang mượt 60fps và mở huy chương không bị giật lag
 */
function preloadFlipbookAssets() {
  const assets = [
    'images/sach/bia_sach.webp',
    'images/sach/Trang1.webp',
    'images/sach/Trang2.webp',
    'images/sach/Trang3.webp',
    'images/sach/Trang4.webp',
    'images/sach/Trang5.webp',
    'images/huychuong/huychuong1.webp',
    'images/huychuong/huychuong2.webp',
    'images/huychuong/huychuong3.webp',
    'images/huychuong/huychuong4.webp'
  ];

  const load = () => {
    assets.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(load, { timeout: 1500 });
  } else {
    setTimeout(load, 300);
  }
}
