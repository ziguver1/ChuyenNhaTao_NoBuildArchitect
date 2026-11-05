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
 * Trả về cấu trúc HTML của trang huy hiệu bên trong sách
 */
export function getBadgePageHTML(i) {
  const c = CHAPTERS[i];
  if (!c) return '';
  const on = book.done.has(i);
  const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.webp`;

  if (c.locked) {
    return `
      <p class="pg-kicker">Huy hiệu chương ${i + 1} · Tạm khóa</p>
      <div class="pg-medal is-locked">
        <div class="pg-medal-aura" aria-hidden="true"></div>
        <img class="pg-medal-img" src="${medalImg}" alt="${c.badge.name}" width="160" height="160" loading="lazy">
        <span class="pg-medal-lock-badge" title="Chưa mở" aria-label="Chưa mở"><i class="ph-fill ph-lock-key" aria-hidden="true"></i></span>
      </div>
      <h3 class="pg-title">${c.badge.name}</h3>
      <p class="pg-prose">Chương này đang được đội ngũ họa sĩ hoàn thiện tranh minh họa. Hãy đón đọc Chương 1 để nhận Huy hiệu Mái Ấm trước nhé!</p>`;
  }

  // Khi chưa đóng dấu vào sách: hiển thị khung mộc chờ, chưa hiện ảnh huy chương
  if (!on) {
    return `
      <p class="pg-kicker">Huy hiệu chương ${i + 1}</p>
      <div class="pg-medal is-awaiting-stamp">
        <div class="pg-medal-aura" aria-hidden="true"></div>
        <div class="pg-stamp-slot" aria-hidden="true">
          <i class="ph ph-stamp"></i>
          <span>Chỗ in huy hiệu</span>
        </div>
        <img class="pg-medal-img" src="${medalImg}" alt="${c.badge.name}" width="160" height="160" loading="lazy">
      </div>
      <h3 class="pg-title">${c.badge.name}</h3>
      <p class="pg-prose" id="badge-prose-${i}">Đọc trọn vẹn ${c.pages?.length || 5} trang truyện của chương để mở huy hiệu này.</p>
      <div class="badge-actions-group" id="badge-actions-${i}">
        <button class="btn btn-primary" type="button" data-claim-chapter="${i}"><i class="ph-fill ph-medal" aria-hidden="true"></i> Nhận ${c.badge.name}</button>
      </div>`;
  }

  // Khi đã đóng dấu thành công vào trang sách
  return `
    <button class="badge-replay-corner-btn" type="button" data-replay-medal="${i}" title="Xem lại hiệu ứng mở khóa" aria-label="Xem lại hiệu ứng mở khóa">
      <i class="ph-fill ph-arrow-counter-clockwise" aria-hidden="true"></i>
      <span>Xem lại</span>
    </button>
    <p class="pg-kicker">Huy hiệu chương ${i + 1}</p>
    <div class="pg-medal is-on" style="--medal-url: url('${medalImg}')">
      <div class="pg-medal-aura" aria-hidden="true"></div>
      <img class="pg-medal-img" src="${medalImg}" alt="${c.badge.name}" width="160" height="160" loading="lazy">
      <div class="pg-medal-shine" aria-hidden="true"></div>
      <div class="pg-medal-glints" aria-hidden="true">
        <span class="glint g-face" aria-hidden="true">
          <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
        </span>
        <span class="glint g-top-right" aria-hidden="true">
          <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
        </span>
        <span class="glint g-bottom-left" aria-hidden="true">
          <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
        </span>
        <span class="glint g-bottom-right" aria-hidden="true">
          <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
        </span>
      </div>
    </div>
    <h3 class="pg-title">${c.badge.name}</h3>
    <p class="pg-prose" id="badge-prose-${i}">${c.badge.desc}</p>
    <div class="badge-actions-group" id="badge-actions-${i}">
      <button class="btn btn-primary" type="button" data-goto="${P.summary}">Xem bộ huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
    </div>`;
}

/**
 * Hiển thị trang huy hiệu bên trong sách
 */
export function renderBadgePage(i, animate) {
  const c = CHAPTERS[i];
  if (!c) return;
  const pg = $('#badge-page-' + i);
  if (!pg) return;

  pg.innerHTML = getBadgePageHTML(i);

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
  // Đảm bảo trước khi dập mộc, trang sách ở trạng thái chờ in (hoàn toàn chưa có huy chương)
  const pg = $('#badge-page-' + i);
  if (pg) {
    const medalEl = $('.pg-medal', pg);
    if (medalEl) {
      medalEl.classList.remove('is-on', 'is-stamping');
      medalEl.classList.add('is-awaiting-stamp');
    }
  }
  showMedalRewardPopup(i);
}

/**
 * Popup nhận Huy Chương kiểu game khi hoàn thành chương
 */
export function showMedalRewardPopup(i) {
  const c = CHAPTERS[i];
  if (!c) return;
  const modal = $('#medal-modal');
  if (!modal) return;

  const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.webp`;
  const medalImgEl = $('#medal-modal-img');
  if (medalImgEl) {
    medalImgEl.src = medalImg;
    medalImgEl.alt = c.badge.name;
  }
  const congratsEl = $('#medal-modal-congrats');
  if (congratsEl) {
    congratsEl.textContent = `Chúc mừng bạn đã hoàn thành Chương ${i + 1} và nhận được ${c.badge.name}!`;
  }
  const nameEl = $('#medal-modal-name');
  if (nameEl) nameEl.textContent = c.badge.name;
  const descEl = $('#medal-modal-desc');
  if (descEl) descEl.textContent = c.badge.desc;

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
  const c = CHAPTERS[i];
  if (!c) return;
  const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.webp`;

  // Chỉ lật sang trang huy hiệu nếu chưa ở đúng trang
  const needsFlip = book.page !== c.badgePage;
  if (needsFlip) {
    navToPage(c.badgePage);
  }

  // Đảm bảo trước khi dập mộc, trang sách hoàn toàn chưa có huy chương (giữ slot chờ mộc)
  const pg = $('#badge-page-' + i);
  if (pg) {
    const medalEl = $('.pg-medal', pg);
    if (medalEl) {
      medalEl.classList.remove('is-on', 'is-stamping');
      medalEl.classList.add('is-awaiting-stamp');
    }
  }

  // Đợi trang sách ổn định rồi DẬP MỘC ĐANH CHẮC rơi xuống!
  const delay = needsFlip ? (book.flip ? 450 : 120) : 80;
  setTimeout(
    () => {
      sound.stamp(true);
      const targetPg = $('#badge-page-' + i);
      if (!targetPg) return;
      const medalEl = $('.pg-medal', targetPg);
      if (!medalEl) return;

      // Kích hoạt hiệu ứng rơi dập mộc và hiển thị hào quang
      medalEl.classList.remove('is-awaiting-stamp');
      medalEl.classList.remove('is-stamping');
      requestAnimationFrame(() => {
        medalEl.classList.add('is-stamping', 'is-on');
        medalEl.style.setProperty('--medal-url', `url('${medalImg}')`);
      });

      // Quét ánh sáng kim loại vàng trực tiếp trên bề mặt huy chương (dùng mask theo ảnh cắt bg)
      if (!medalEl.querySelector('.pg-medal-shine')) {
        const shine = document.createElement('div');
        shine.className = 'pg-medal-shine';
        shine.setAttribute('aria-hidden', 'true');
        medalEl.appendChild(shine);
      }

      // Thêm các tia lấp lánh ánh kim vàng to rõ ngay trên mặt huy chương nếu chưa có
      if (!medalEl.querySelector('.pg-medal-glints')) {
        const glints = document.createElement('div');
        glints.className = 'pg-medal-glints';
        glints.setAttribute('aria-hidden', 'true');
        glints.innerHTML = `
          <span class="glint g-face" aria-hidden="true">
            <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
          </span>
          <span class="glint g-top-right" aria-hidden="true">
            <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
          </span>
          <span class="glint g-bottom-left" aria-hidden="true">
            <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
          </span>
          <span class="glint g-bottom-right" aria-hidden="true">
            <svg viewBox="0 0 32 32" class="glint-svg"><path d="M16 0C16 8.5 23.5 16 32 16C23.5 16 16 23.5 16 32C16 23.5 8.5 16 0 16C8.5 16 16 8.5 16 0Z" fill="#fff7d6"/><circle cx="16" cy="16" r="3.5" fill="#ffffff"/></svg>
          </span>
        `;
        medalEl.appendChild(glints);
      }

      // Sóng chấn động lan tỏa từ con dấu
      const wave = document.createElement('div');
      wave.className = 'stamp-shockwave';
      wave.setAttribute('aria-hidden', 'true');
      medalEl.appendChild(wave);
      setTimeout(() => wave.remove(), 1000);

      // Pháo hoa nổ bung trên huy chương
      if (typeof window.tetFx !== 'undefined' && window.tetFx.burst) {
        const r = medalEl.getBoundingClientRect();
        window.tetFx.burst(r.left + r.width / 2, r.top + r.height / 2, false);
        sound.pop(true);
      }

      // Lưu trạng thái hoàn thành
      const first = !book.done.has(i);
      book.done.add(i);
      store.set('chapters_done', [...book.done]);
      track('chapter_complete', { chapter: i + 1 });
      if (first) {
        measure('listen', { ch: i + 1 });
        track('badge_unlocked', { badge: c.badge.name });
      }

      // Cập nhật lời văn & nút hành động sau khi in (chỉ giữ nút Xem bộ huy hiệu, loại bỏ cuộn thừa)
      const proseEl = $('#badge-prose-' + i);
      if (proseEl) proseEl.textContent = c.badge.desc;
      const actionsEl = $('#badge-actions-' + i);
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="btn btn-primary" type="button" data-goto="${P.summary}">Xem bộ huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
        `;
      }

      // Gắn nút "Xem lại" tinh tế, nhỏ gọn ở góc trên bên phải trang sách
      if (targetPg && !targetPg.querySelector('.badge-replay-corner-btn')) {
        const replayBtn = document.createElement('button');
        replayBtn.className = 'badge-replay-corner-btn';
        replayBtn.type = 'button';
        replayBtn.setAttribute('data-replay-medal', String(i));
        replayBtn.title = 'Xem lại hiệu ứng mở khóa';
        replayBtn.setAttribute('aria-label', 'Xem lại hiệu ứng mở khóa');
        replayBtn.innerHTML = '<i class="ph-fill ph-arrow-counter-clockwise" aria-hidden="true"></i><span>Xem lại</span>';
        targetPg.prepend(replayBtn);
      }

      if (typeof refreshTabs === 'function') refreshTabs();
      renderBadges();

      toast(`✦ ${c.badge.name} đã được in trang trọng vào sách!`, 'gold', 'medal');
    },
    book.flip ? 320 : 100
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
    const medalImg = c.badge.img || `images/huychuong/huychuong${i + 1}.webp`;
    return `<button type="button" class="badge ${on ? 'is-unlocked' : ''} ${c.locked ? 'is-chapter-locked' : ''}" data-badge="${i}" data-goto="${
      on ? c.badgePage : c.startPage
    }">
      <span class="disc ${on ? 'is-on' : 'is-locked'}">
        <img src="${medalImg}" alt="${c.badge.name}" class="badge-thumb-img" loading="lazy">
        ${!on ? `<span class="badge-lock-ico" aria-hidden="true"><i class="ph-fill ph-${c.locked ? 'lock-key' : 'lock-simple'}"></i></span>` : ''}
      </span>
      <h4>${c.badge.name}</h4>
      <p>${on ? c.badge.desc : c.locked ? 'Chương đang biên soạn' : 'Đọc chương ' + (i + 1) + ' để mở'}</p>
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
        ? 'Mái ấm, tôn kính, nhìn lại và hướng thiện. Mang cả bốn giá trị ấy đến sự kiện và đóng dấu ở bốn trạm nhé.'
        : 'Hãy đọc hết Chương 1 để nhận Huy hiệu Mái Ấm và đến bốn trạm sự kiện đóng dấu nhé.';
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
