/**
 * Giao diện soạn thảo Chuyện Nhà Đêm 23: Tab thiết kế, chọn khung, chỉnh màu, sticker và khóa
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { toast } from '../../core/toast.js';
import { track } from '../../analytics/tracker.js';
import { esc } from '../../core/dom.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { VALUES, FRAME_CONFIG, COLOR_PRESETS, STICKER_CATALOG, STICKER_DEFAULT_SLOTS } from './values.data.js';
import { letter, ugc, saveUgcSettings, saveLetter, lineOf } from './letter.state.js';
import { book } from '../storybook/storybook.state.js';
import {
  getPass,
  setPass,
  moments,
  MOMENT_SLOTS,
  saveMoments
} from '../passport/passport.state.js';
import { pickMoment, ppRefresh, renderTicket, renderRegister } from '../passport/ticket-ui.js';
import { PP } from '../passport/stations.data.js';
import {
  drawCard,
  setupCanvasStickerDrag,
  initCanvasExporter
} from './canvas-exporter.js';
import { initShareButtons } from './share.js';

let letterShown = false;
let activeDesignTab = 'frames';
let activeStickerCategory = 'all';

export const gate = () => {
  const pass = getPass();
  const ch = book.done.size,
    st = pass ? pass.stamps.length : 0;
  return { ch, st, ok: st === 4 };
};

export function renderLetter() {
  const g = gate(),
    openBox = $('#letter-open'),
    lockBox = $('#letter-lock');
  if (!openBox || !lockBox) return;

  const wasOpen = !openBox.hidden,
    first = !letterShown;
  letterShown = true;
  lockBox.hidden = g.ok;
  openBox.hidden = !g.ok;

  if (!g.ok) {
    renderLock(g);
    return;
  }

  renderFrameSelector();
  renderColorControls();
  renderStickerControls();
  setupDesignTabs();
  renderLetterEdit();
  renderMoments();
  drawCard();

  if (!wasOpen) {
    if (!store.get('letter_unlocked', false)) {
      store.set('letter_unlocked', true);
      track('letter_unlocked');
    }
    const letterEls = $$('#letter-open > *');
    if (!first && hasGsap && !reduceMotion && letterEls.length && window.gsap) {
      gsap.from(letterEls, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out'
      });
    }
  }
}

window.renderLetter = renderLetter;

export function unlockTest() {
  let pass = getPass();
  if (!pass) {
    pass = {
      id: 'TAO-DEMO88',
      nickname: 'Bé Na Test',
      issuedAt: Date.now(),
      synced: false,
      giftCode: 'QUA-TEST',
      stamps: [],
      stampedAt: {}
    };
  }
  pass.stamps = [1, 2, 3, 4];
  pass.stampedAt = { 1: Date.now(), 2: Date.now(), 3: Date.now(), 4: Date.now() };
  setPass(pass);
  toast('Đã kích hoạt đủ 4 dấu trạm để mở Chuyện Nhà Đêm 23!', 'ok', 'seal-check');
  renderTicket();
  renderLetter();
  renderRegister();
}

export function renderLock(g) {
  const lockEl = $('#letter-lock');
  if (!lockEl) return;
  const pass = getPass();
  const step = (done, title, sub, href, cta) => `
    <li class="${done ? 'is-done' : ''}">
      <i class="ph${done ? '-fill' : ''} ph-${done ? 'check-circle' : 'circle-dashed'}" aria-hidden="true"></i>
      <span><strong>${title}</strong><small>${sub}</small></span>
      ${done ? '' : `<a class="btn btn-primary btn-sm lock-step-btn" href="${href}">${cta}</a>`}
    </li>`;

  lockEl.innerHTML = `
    <div class="lock-head">
      <span class="lock-ico" id="btn-unlock-test" aria-hidden="true" style="cursor:pointer" title="Chạm để mở nhanh (chế độ kiểm thử)"><i class="ph ph-lock-simple"></i></span>
      <div><h3>Chuyện Nhà Đêm 23 mở khi bạn đi trọn hành trình</h3>
      <p>Chuyện Nhà Đêm 23 ghi đủ bốn giá trị, nên cần bạn đi qua cả bốn trạm ở sự kiện. Sách bốn chương là phần đọc thêm, không bắt buộc.</p></div>
    </div>
    <ol class="lock-steps">
      ${step(
        g.st === 4,
        'Đóng đủ 4 dấu ở 4 trạm sự kiện',
        pass ? `${g.st}/4 dấu` : 'Chưa có thẻ thông hành',
        '#tram-trai-nghiem',
        pass ? 'Xem hộ chiếu' : 'Tạo thẻ thông hành'
      )}
      ${step(
        g.ch === 4,
        'Nghe 4 câu chuyện trong sách (không bắt buộc)',
        `${g.ch}/4 chương`,
        '#doc-sach',
        'Đọc sách'
      )}
    </ol>
    <ul class="lock-values" aria-label="Tiến độ từng giá trị">
      ${VALUES.map((v, k) => {
        const read = book.done.has(k),
          stamped = !!(pass && pass.stamps.includes(k + 1));
        return `<li class="${stamped ? 'is-done' : ''}"><i class="ph${
          stamped ? '-fill' : ''
        } ph-${v.icon}" aria-hidden="true"></i><span>${v.name}</span>
          <small><i class="ph${read ? '-fill' : ''} ph-book-open" aria-label="${
          read ? 'Đã nghe chuyện' : 'Chưa nghe chuyện'
        }"></i><i class="ph${stamped ? '-fill' : ''} ph-seal-check" aria-label="${
          stamped ? 'Đã đóng dấu' : 'Chưa đóng dấu'
        }"></i></small></li>`;
      }).join('')}
    </ul>`;

  $('#btn-unlock-test')?.addEventListener('click', unlockTest);
}

export function renderLetterEdit() {
  const editBox = $('#letter-edit');
  if (!editBox) return;
  editBox.innerHTML = `
    <h3>Bốn lời gửi ông Táo</h3>
    <p class="help">Mỗi giá trị một câu. Giữ gợi ý sẵn hoặc viết bằng lời của nhà bạn.</p>
    <div class="letter-rows">${VALUES.map(
      (v, k) => `
      <div class="letter-row">
        <label for="letter-${k}"><i class="ph-fill ph-${v.icon}" aria-hidden="true"></i>${
        v.name
      }</label>
        <textarea class="input" id="letter-${k}" rows="2" maxlength="80" data-k="${k}">${esc(
        lineOf(k)
      )}</textarea>
        <button class="linklike" type="button" data-suggest="${k}"><i class="ph ph-shuffle" aria-hidden="true"></i> Gợi ý khác</button>
      </div>`
    ).join('')}
    </div>`;

  let raf = 0;
  $$('#letter-edit textarea').forEach((t) =>
    t.addEventListener('input', () => {
      letter.custom[+t.dataset.k] = t.value;
      saveLetter();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawCard);
    })
  );

  $$('#letter-edit [data-suggest]').forEach((b) =>
    b.addEventListener('click', () => {
      const k = +b.dataset.suggest;
      letter.picks[k] = (letter.picks[k] + 1) % VALUES[k].lines.length;
      letter.custom[k] = '';
      saveLetter();
      const el = $('#letter-' + k);
      if (el) el.value = lineOf(k);
      drawCard();
    })
  );
}

export function renderMoments() {
  const box = $('#moments');
  if (!box) return;
  const labels = {
    '1': 'Tôn Kính',
    '2': 'Mái Ấm',
    '3': 'Nhìn Lại',
    '4': 'Hướng Thiện',
    'x1': 'Kỷ niệm 1',
    'x2': 'Kỷ niệm 2'
  };

  box.innerHTML = MOMENT_SLOTS.map((slot) => {
    const label = labels[slot] || 'Ảnh khác';
    const src = moments[slot];
    return `<div class="moment ${src ? 'has-photo' : ''}">
      ${
        src
          ? `<img src="${src}" alt="Khoảnh khắc ${label}"><button class="moment-del" type="button" data-del="${slot}" aria-label="Xoá ảnh ${label}"><i class="ph ph-x" aria-hidden="true"></i></button>`
          : `<button class="moment-add" type="button" data-add="${slot}" aria-label="Thêm ảnh ${label}"><i class="ph ph-camera-plus" aria-hidden="true"></i></button>`
      }
      <span class="moment-label">${label}</span>
    </div>`;
  }).join('');

  $$('[data-add]', box).forEach((b) =>
    b.addEventListener('click', () => pickMoment(b.dataset.add))
  );
  $$('[data-del]', box).forEach((b) =>
    b.addEventListener('click', () => removeMoment(b.dataset.del))
  );
}

export function removeMoment(slot) {
  delete moments[slot];
  saveMoments();
  const pass = getPass();
  if (/^\d$/.test(slot) && pass) ppRefresh([PP.visa(+slot)]);
  renderMoments();
  drawCard();
}

export function setupDesignTabs() {
  const tabs = $$('.design-tab');
  const panes = $$('.design-pane');
  if (!tabs.length) return;

  function activateTab(tabKey) {
    activeDesignTab = tabKey;
    tabs.forEach((t) => {
      const isActive = t.dataset.tab === tabKey;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    panes.forEach((p) => {
      const isMatch = p.id === `pane-${tabKey}`;
      p.classList.toggle('is-active', isMatch);
      p.hidden = !isMatch;
    });
  }

  tabs.forEach((tab) => {
    tab.onclick = () => activateTab(tab.dataset.tab);
  });

  activateTab(activeDesignTab);
}

export function renderFrameSelector() {
  const container = $('#frame-selector');
  if (!container) return;
  container.innerHTML = Object.values(FRAME_CONFIG)
    .map(
      (f) => `
    <button type="button" class="frame-opt ${
      ugc.frame === f.id ? 'is-active' : ''
    }" data-frame="${f.id}" role="radio" aria-checked="${ugc.frame === f.id}" title="${f.name}">
      <div class="frame-thumb-wrap">
        <img src="${f.src}" alt="${f.name}" class="frame-thumb">
        <span class="frame-check"><i class="ph-bold ph-check" aria-hidden="true"></i></span>
      </div>
      <div class="frame-info">
        <strong class="frame-title">Khung ${f.id}</strong>
        <span class="frame-tag">${f.tag}</span>
      </div>
    </button>
  `
    )
    .join('');

  $$('#frame-selector [data-frame]').forEach((b) => {
    b.addEventListener('click', () => {
      ugc.frame = b.dataset.frame;
      saveUgcSettings();
      $$('#frame-selector [data-frame]').forEach((x) => {
        const isActive = x === b;
        x.classList.toggle('is-active', isActive);
        x.setAttribute('aria-checked', String(isActive));
      });
      drawCard();
    });
  });
}

export function renderColorControls() {
  const bgInput = $('#ugc-bg-color');
  const dotInput = $('#ugc-dot-color');
  const bgHex = $('#ugc-bg-hex');
  const dotHex = $('#ugc-dot-hex');
  const presetList = $('#preset-list');

  if (bgInput) {
    bgInput.value = ugc.bgColor;
    if (bgHex) bgHex.textContent = (ugc.bgColor || '').toUpperCase();
    bgInput.oninput = (e) => {
      ugc.bgColor = e.target.value;
      if (bgHex) bgHex.textContent = ugc.bgColor.toUpperCase();
      saveUgcSettings();
      updatePresetActive();
      drawCard();
    };
  }

  if (dotInput) {
    dotInput.value = ugc.dotColor;
    if (dotHex) dotHex.textContent = (ugc.dotColor || '').toUpperCase();
    dotInput.oninput = (e) => {
      ugc.dotColor = e.target.value;
      if (dotHex) dotHex.textContent = ugc.dotColor.toUpperCase();
      saveUgcSettings();
      updatePresetActive();
      drawCard();
    };
  }

  const swapBtn = $('#btn-swap-colors');
  if (swapBtn) {
    swapBtn.onclick = () => {
      const tmp = ugc.bgColor;
      ugc.bgColor = ugc.dotColor;
      ugc.dotColor = tmp;
      if (bgInput) bgInput.value = ugc.bgColor;
      if (dotInput) dotInput.value = ugc.dotColor;
      if (bgHex) bgHex.textContent = ugc.bgColor.toUpperCase();
      if (dotHex) dotHex.textContent = ugc.dotColor.toUpperCase();
      saveUgcSettings();
      updatePresetActive();
      drawCard();
      toast('Đã đảo màu nền và màu chấm bi', 'ok', 'arrows-left-right');
    };
  }

  if (presetList) {
    presetList.innerHTML = COLOR_PRESETS.map(
      (p, idx) => `
      <button type="button" class="preset-pill ${
        ugc.bgColor.toLowerCase() === p.bg.toLowerCase() &&
        ugc.dotColor.toLowerCase() === p.dot.toLowerCase()
          ? 'is-active'
          : ''
      }" data-preset="${idx}" title="${p.name}">
        <span class="preset-dual-dot" style="background:${p.bg}">
          <span class="inner-dot" style="background:${p.dot}"></span>
        </span>
        <span class="preset-name">${p.name}</span>
      </button>
    `
    ).join('');

    $$('#preset-list [data-preset]').forEach((b) => {
      b.onclick = () => {
        const p = COLOR_PRESETS[+b.dataset.preset];
        if (!p) return;
        ugc.bgColor = p.bg;
        ugc.dotColor = p.dot;
        if (bgInput) bgInput.value = ugc.bgColor;
        if (dotInput) dotInput.value = ugc.dotColor;
        if (bgHex) bgHex.textContent = ugc.bgColor.toUpperCase();
        if (dotHex) dotHex.textContent = ugc.dotColor.toUpperCase();
        saveUgcSettings();
        updatePresetActive();
        drawCard();
      };
    });
  }

  $$('#ratio-seg button').forEach((x) =>
    x.setAttribute('aria-pressed', String(x.dataset.ratio === ugc.ratio))
  );
}

export function updatePresetActive() {
  const bg = (ugc.bgColor || '').toLowerCase();
  const dot = (ugc.dotColor || '').toLowerCase();
  $$('#preset-list [data-preset]').forEach((b) => {
    const p = COLOR_PRESETS[+b.dataset.preset];
    b.classList.toggle(
      'is-active',
      Boolean(p && p.bg.toLowerCase() === bg && p.dot.toLowerCase() === dot)
    );
  });
}

export function renderStickerControls() {
  const tray = $('#sticker-tray');
  if (!tray) return;

  const tabs = $$('.sticker-tab');
  tabs.forEach((tab) => {
    tab.onclick = () => {
      activeStickerCategory = tab.dataset.cat || 'all';
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });
      updateStickerTray();
    };
  });

  const randBtn = $('#btn-random-stickers');
  if (randBtn) {
    randBtn.onclick = () => applyRandomStickers();
  }

  const clearBtn = $('#btn-clear-stickers');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!ugc.stickers || !ugc.stickers.length) return;
      ugc.stickers = [];
      saveUgcSettings();
      updateStickerTray();
      drawCard();
      toast('Đã gỡ tất cả sticker trên vé', 'ok', 'trash');
    };
  }

  updateStickerTray();
  setupCanvasStickerDrag();
}

export function updateStickerTray() {
  const tray = $('#sticker-tray');
  const badge = $('#sticker-active-count');
  const tabBadge = $('#sticker-tab-badge');
  if (!tray) return;

  const count = (ugc.stickers || []).length;
  const activeIds = new Set((ugc.stickers || []).map((s) => s.id));
  if (badge) badge.textContent = `${count}/16`;
  if (tabBadge) {
    tabBadge.textContent = count;
    tabBadge.hidden = count === 0;
  }

  const filtered = STICKER_CATALOG.filter((s) => {
    if (activeStickerCategory === 'all') return true;
    return s.category === activeStickerCategory;
  });

  tray.innerHTML = filtered
    .map((s) => {
      const isActive = activeIds.has(s.id);
      return `
      <button type="button" class="sticker-item ${
        isActive ? 'is-active' : ''
      }" data-sticker-id="${s.id}" title="${s.name} (${s.tag}) - Chạm để ${
        isActive ? 'gỡ' : 'dán'
      }">
        <img src="${s.src}" alt="${s.name}" loading="lazy">
        <span class="sticker-badge"><i class="ph-bold ph-check" aria-hidden="true"></i></span>
        <span class="sticker-name">${s.tag}</span>
      </button>
    `;
    })
    .join('');

  $$('#sticker-tray [data-sticker-id]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.stickerId;
      toggleSticker(id);
    };
  });
}

export function toggleSticker(id) {
  if (!Array.isArray(ugc.stickers)) ugc.stickers = [];
  const existingIndex = ugc.stickers.findIndex((s) => s.id === id);
  if (existingIndex >= 0) {
    ugc.stickers.splice(existingIndex, 1);
    saveUgcSettings();
    updateStickerTray();
    drawCard();
    toast('Đã gỡ sticker', 'info', 'x');
  } else {
    const def = STICKER_CATALOG.find((s) => s.id === id);
    if (!def) return;
    const slotIndex = ugc.stickers.length % STICKER_DEFAULT_SLOTS.length;
    const baseSlot = STICKER_DEFAULT_SLOTS[slotIndex];
    const jitterX = (Math.random() - 0.5) * 0.04;
    const jitterY = (Math.random() - 0.5) * 0.04;
    ugc.stickers.push({
      id: def.id,
      src: def.src,
      name: def.name,
      relX: Math.max(0.06, Math.min(0.94, baseSlot.relX + jitterX)),
      relY: Math.max(0.06, Math.min(0.94, baseSlot.relY + jitterY)),
      relScale: baseSlot.relScale,
      rot: baseSlot.rot
    });
    saveUgcSettings();
    updateStickerTray();
    drawCard();
    toast(`Đã dán ${def.name} lên vé!`, 'ok', 'sticker');
  }
}

export function applyRandomStickers() {
  const carps = STICKER_CATALOG.filter((s) => s.category === 'fish');
  const lotuses = STICKER_CATALOG.filter((s) => s.category === 'lotus');
  const c1 = carps[Math.floor(Math.random() * carps.length)];
  const c2 = carps[(Math.floor(Math.random() * (carps.length - 1)) + 1) % carps.length];
  const l1 = lotuses[Math.floor(Math.random() * lotuses.length)];

  ugc.stickers = [
    { id: c1.id, src: c1.src, name: c1.name, relX: 0.88, relY: 0.08, relScale: 0.22, rot: 14 },
    { id: l1.id, src: l1.src, name: l1.name, relX: 0.12, relY: 0.94, relScale: 0.2, rot: -12 },
    { id: c2.id, src: c2.src, name: c2.name, relX: 0.88, relY: 0.92, relScale: 0.2, rot: 8 }
  ];
  saveUgcSettings();
  updateStickerTray();
  drawCard();
  toast('Đã dán 3 sticker gợi ý đẹp mắt!', 'ok', 'sparkle');
}

export function initUgcUI() {
  initCanvasExporter();
  initShareButtons();
}
