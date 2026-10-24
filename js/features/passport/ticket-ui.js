/**
 * Giao diện Hộ chiếu thông hành, Form đăng ký, Modal QR và Bàn Check-out
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { ask } from '../../core/dialog.js';
import { toast } from '../../core/toast.js';
import { sound } from '../../core/audio.js';
import { track } from '../../analytics/tracker.js';
import { measure, meter, setPassGetter } from '../../analytics/meter.js';
import { plain, esc } from '../../core/dom.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import {
  STATIONS,
  PP,
  ROMAN_ST,
  STAMP_STYLE,
  VISA_TEXT,
  randCode
} from './stations.data.js';
import {
  getPass,
  setPass,
  server,
  moments,
  momentCount,
  saveMoments,
  savePassToHistory
} from './passport.state.js';
import {
  setPassportServiceCallbacks,
  pushPass,
  pullPass,
  stampByCode,
  startPolling,
  checkedIn,
  isTaken,
  withSuffix,
  openRestore
} from './passport.service.js';
import { PRIZES, spinOf, openWheel, setWheelCallbacks } from './lucky-wheel.js';

export const pp = { flip: null, pageEls: [], timers: [] };

export const fmtDate = (ts, withTime) => {
  const d = new Date(ts || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}` +
    (withTime ? ` ${p(d.getHours())}:${p(d.getMinutes())}` : '')
  );
};

export function stampSVG(id, ts) {
  const s = STAMP_STYLE[id],
    ink = s.ink,
    f = `ink-${id}-${(ts || 0) % 1000}`;
  const date = fmtDate(ts),
    roman = ROMAN_ST[id - 1];
  const T = (x, y, size, text, w = 800, ls = 1.5) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="${size}" font-weight="${w}" letter-spacing="${ls}" fill="${ink}">${text}</text>`;
  let body = '';
  if (s.shape === 'circle') {
    body = `<circle cx="100" cy="100" r="84" fill="none" stroke="${ink}" stroke-width="5"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="${ink}" stroke-width="1.6"/>
      <path id="arc-${f}" d="M 34 100 A 66 66 0 0 1 166 100" fill="none"/>
      <text font-family="Be Vietnam Pro, Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.8" fill="${ink}"><textPath href="#arc-${f}" startOffset="50%" text-anchor="middle">CHUYỆN NHÀ TÁO · TRẠM ${roman}</textPath></text>
      ${T(100, 104, 15.5, s.short, 800, 0.4)}${T(100, 125, 12.5, date, 600, 1)}${T(
      100,
      146,
      9.5,
      '★ ĐÃ ĐÓNG DẤU ★',
      700,
      1.2
    )}`;
  } else if (s.shape === 'rect') {
    body = `<rect x="14" y="40" width="172" height="120" rx="6" fill="none" stroke="${ink}" stroke-width="5"/>
      <rect x="24" y="50" width="152" height="100" rx="3" fill="none" stroke="${ink}" stroke-width="1.6"/>
      ${T(100, 72, 12, 'VISA · TRẠM ' + roman, 700, 2.5)}${T(100, 104, 24, s.short)}
      <line x1="40" y1="114" x2="160" y2="114" stroke="${ink}" stroke-width="1.4"/>${T(
      100,
      132,
      13,
      date,
      600,
      1
    )}${T(100, 146, 9, 'CHUYỆN NHÀ TÁO', 700, 2)}`;
  } else if (s.shape === 'octagon') {
    body = `<polygon points="66,20 134,20 180,66 180,134 134,180 66,180 20,134 20,66" fill="none" stroke="${ink}" stroke-width="5"/>
      <polygon points="72,32 128,32 168,72 168,128 128,168 72,168 32,128 32,72" fill="none" stroke="${ink}" stroke-width="1.6"/>
      ${T(100, 64, 12, 'TRẠM ' + roman, 700, 3)}${T(100, 102, 22, s.short)}${T(
      100,
      124,
      13,
      date,
      600,
      1
    )}${T(100, 146, 10, 'ĐÃ ĐÓNG DẤU', 700, 2)}`;
  } else {
    body = `<ellipse cx="100" cy="100" rx="88" ry="62" fill="none" stroke="${ink}" stroke-width="5"/>
      <ellipse cx="100" cy="100" rx="76" ry="50" fill="none" stroke="${ink}" stroke-width="1.6"/>
      ${T(100, 76, 11, 'CHUYỆN NHÀ TÁO · ' + roman, 700, 2)}${T(100, 104, 22, s.short)}${T(
      100,
      125,
      13,
      date,
      600,
      1
    )}`;
  }
  return `<svg class="pp-stamp-svg" viewBox="0 0 200 200" role="img" aria-label="Dấu ${
    s.short
  }, ngày ${date}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="${f}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="${
        id * 7
      }" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="holes"/>
      <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn"/>
      <feDisplacementMap in="worn" in2="t" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>
    <g filter="url(#${f})" opacity=".88">${body}</g></svg>`;
}

export function goldStampSVG(ts) {
  const ink = '#a87b16';
  return `<svg class="pp-stamp-svg" viewBox="0 0 200 200" role="img" aria-label="Dấu hoàn thành bốn trạm" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="ink-gold"><feTurbulence type="fractalNoise" baseFrequency="1" numOctaves="2" seed="11" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.8" result="h"/><feComposite in="SourceGraphic" in2="h" operator="in"/></filter></defs>
    <g filter="url(#ink-gold)">
      <circle cx="100" cy="100" r="88" fill="none" stroke="${ink}" stroke-width="4" stroke-dasharray="2 4"/>
      <circle cx="100" cy="100" r="78" fill="none" stroke="${ink}" stroke-width="5"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="${ink}" stroke-width="1.6"/>
      <text x="100" y="84" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="12" font-weight="700" letter-spacing="2.5" fill="${ink}">HOÀN THÀNH</text>
      <text x="100" y="116" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="32" font-weight="800" fill="${ink}">4/4</text>
      <text x="100" y="138" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="12" font-weight="600" fill="${ink}">${fmtDate(
    ts
  )}</text>
    </g></svg>`;
}

export const stampedAt = (id) => {
  const pass = getPass();
  return (pass && pass.stampedAt && pass.stampedAt[id]) || null;
};

export function ppHead(left, right) {
  return `<div class="pp-head"><span>${left}</span><span>${right}</span></div>`;
}

export function pickMoment(slot) {
  const momentInput = $('#moment-input');
  if (momentInput) {
    momentInput.dataset.slot = slot;
    momentInput.value = '';
    momentInput.click();
  }
}

export function ppPageHTML(n) {
  const pass = getPass();
  if (!pass) return '';
  const total = pass.stamps.length;

  if (n === PP.cover)
    return `
    <div class="pp-cover pp-cover-front">
      <img class="pp-cover-img" src="images/passport/biapassport.webp" alt="Thẻ Thông Hành - Vân Du Ký - Chuyện Nhà Táo" draggable="false">
    </div>`;

  if (n === PP.data) {
    const nameMRZ = pass.nickname
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'D')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '<');
    const l1 = ('P<TAO<<' + nameMRZ + '<'.repeat(44)).slice(0, 44);
    const l2 = (
      pass.id.replace('-', '') +
      '<<VNM' +
      fmtDate(pass.issuedAt).replace(/\./g, '') +
      '<<' +
      total +
      '/4' +
      '<'.repeat(44)
    ).slice(0, 44);
    return `<div class="pp-page">
      ${ppHead('THẺ THÔNG HÀNH', 'TRANG THÔNG TIN')}
      <div class="pp-data">
        <div class="pp-photo" aria-hidden="true">${esc(
          pass.nickname.trim().charAt(0).toUpperCase()
        )}</div>
        <dl class="pp-fields">
          <div><dt>Họ tên / Nickname</dt><dd>${esc(pass.nickname)}</dd></div>
          <div><dt>Mã thẻ</dt><dd class="mono">${pass.id}${
      pass.synced
        ? ''
        : '<span class="pp-off" title="Tạo khi mất mạng, chưa đồng bộ">CHƯA ĐỒNG BỘ</span>'
    }</dd></div>
          <div><dt>Ngày cấp</dt><dd>${fmtDate(pass.issuedAt)}</dd></div>
          <div><dt>Nơi cấp</dt><dd>Bếp lửa nhà mình</dd></div>
        </dl>
      </div>
      <div class="pp-qr-row">
        <div class="pp-qr" id="pp-qr" role="img" aria-label="Mã QR của thẻ ${pass.id}"></div>
        <p>${
          pass.synced
            ? checkedIn()
              ? 'Đã check-in sự kiện. Quét mã ở mỗi trạm để đóng dấu.'
              : 'Đến sự kiện, quét mã ở mỗi trạm để đóng dấu.'
            : 'Thẻ tạo lúc mất mạng (mã OFF-). Nhân sự vẫn quét và đóng dấu được, thẻ tự đồng bộ khi có mạng.'
        }</p>
      </div>
      <div class="pp-mrz" aria-hidden="true"><span>${esc(l1)}</span><span>${esc(l2)}</span></div>
    </div>`;
  }

  if (n === PP.guide)
    return `<div class="pp-page">
      ${ppHead('HÀNH TRÌNH', 'TRANG 2')}
      <h4 class="pp-title">Bốn trạm, bốn dấu</h4>
      <p class="pp-note">Mỗi trạm đóng một dấu vào trang visa riêng và được quay thưởng một lần. Đủ bốn dấu thì nhận quà ở bàn check-out.</p>
      <ol class="pp-route">${STATIONS.map((s) => {
        const on = pass.stamps.includes(s.id);
        return `<li class="${on ? 'is-on' : ''}"><button type="button" data-ppgo="${PP.visa(
          s.id
        )}">
          <span class="pp-route-n">${ROMAN_ST[s.id - 1]}</span>
          <span class="pp-route-t">${s.name}<small>${
          on ? 'Đã đóng dấu ' + fmtDate(stampedAt(s.id), true) : 'Chưa đóng dấu'
        }</small></span>
          <i class="ph${on ? '-fill' : ''} ph-${
          on ? 'seal-check' : 'circle-dashed'
        }" aria-hidden="true"></i></button></li>`;
      }).join('')}</ol>
      <p class="pp-progress"><strong>${total}/4</strong> trạm đã đóng dấu</p>
    </div>`;

  const id = n - 2;
  if (id >= 1 && id <= 4) {
    const s = STATIONS[id - 1],
      on = pass.stamps.includes(id),
      st = STAMP_STYLE[id],
      photo = moments[String(id)],
      spin = spinOf(id);
    return `<div class="pp-page pp-visa" style="--ink:${st.ink}">
      ${ppHead('VISA · TRẠM ' + ROMAN_ST[id - 1], 'TRANG ' + n)}
      <h4 class="pp-title">${s.name}</h4>
      <p class="pp-note">${VISA_TEXT[id]}</p>
      <div class="pp-stamp-zone ${on ? 'is-on' : ''} ${
      on && photo ? 'has-photo' : ''
    }" data-zone="${id}">
        ${
          on
            ? `<div class="pp-stamp" data-stamp="${id}" style="--rot:${st.rot}deg;--dx:${st.x}px;--dy:${st.y}px">${stampSVG(
                id,
                stampedAt(id)
              )}</div>`
            : `<p class="pp-empty"><i class="ph ph-stamp" aria-hidden="true"></i>Chỗ đóng dấu<small>Đến ${s.name} và đưa mã QR cho nhân sự</small></p>`
        }
        ${
          on && photo
            ? `<figure class="pp-polaroid" style="--r:${
                id % 2 ? 4 : -5
              }deg"><img src="${photo}" alt="Khoảnh khắc ở ${
                s.name
              }"><button class="pp-polaroid-btn" type="button" data-moment="${id}" aria-label="Đổi ảnh khoảnh khắc ở ${
                s.name
              }"><i class="ph ph-camera" aria-hidden="true"></i></button></figure>`
            : ''
        }
      </div>
      ${
        on
          ? `<div class="pp-visa-foot">
        ${
          spin
            ? `<p class="pp-prize ${spin.prize === 'none' ? 'is-miss' : ''}"><i class="ph-fill ph-${
                PRIZES[spin.prize].icon
              }" aria-hidden="true"></i>${PRIZES[spin.prize].label}${
                pass.given && pass.given[id] && spin.prize !== 'none' ? ' · đã nhận' : ''
              }</p>`
            : `<button class="pp-photo-add pp-spin" type="button" data-spin="${id}"><i class="ph ph-spiral" aria-hidden="true"></i> Quay thưởng</button>`
        }
        ${
          photo
            ? ''
            : `<button class="pp-photo-add" type="button" data-moment="${id}"><i class="ph ph-camera-plus" aria-hidden="true"></i> Lưu ảnh</button>`
        }
      </div>`
          : ''
      }
    </div>`;
  }

  if (n === PP.done)
    return `<div class="pp-page">
      ${ppHead('HOÀN THÀNH', 'TRANG 7')}
      <h4 class="pp-title">${
        total === 4 ? 'Bạn đã đi đủ bốn trạm' : `Còn ${4 - total} trạm nữa`
      }</h4>
      <div class="pp-stamp-zone ${total === 4 ? 'is-on' : ''}">
        ${
          total === 4
            ? `<div class="pp-stamp pp-gold" data-stamp="gold" style="--rot:-8deg;--dx:0px;--dy:0px">${goldStampSVG(
                Math.max(...STATIONS.map((s) => stampedAt(s.id) || 0))
              )}</div>`
            : `<p class="pp-empty"><i class="ph ph-medal" aria-hidden="true"></i>Dấu hoàn thành<small>Sẽ hiện khi đủ bốn dấu</small></p>`
        }
      </div>
      <p class="pp-note">${
        total === 4
          ? 'Mời bạn đến bàn check-out, đưa mã nhận quà bên dưới cho nhân sự.'
          : 'Mỗi trạm chỉ đóng dấu một lần.'
      }</p>
    </div>`;

  if (n === PP.notes)
    return `<div class="pp-page pp-notes">
      ${ppHead('GHI CHÚ', 'TRANG 8')}
      <p class="pp-note">Ở mỗi trang visa, bạn lưu được một ảnh khoảnh khắc của trạm đó. Đủ bốn dấu, các ảnh sẽ được dán vào Chuyện Nhà Đêm 23 gửi Táo.</p>
      <div class="pp-lines" aria-hidden="true">${'<span></span>'.repeat(9)}</div>
    </div>`;

  return `<div class="pp-cover pp-cover-back">
    <img class="pp-cover-img" src="images/passport/biasaupassport.webp" alt="Bìa sau Thẻ Thông Hành - Chuyện Nhà Táo" draggable="false">
  </div>`;
}

export function ppStatus(p) {
  const label =
    p === PP.cover
      ? 'Bìa hộ chiếu'
      : p === PP.back
      ? 'Bìa sau'
      : p === PP.data
      ? 'Trang thông tin'
      : p === PP.guide
      ? 'Hành trình 4 trạm'
      : p <= 6
      ? `Visa ${STATIONS[p - 3].name}`
      : p === PP.done
      ? 'Hoàn thành'
      : 'Ghi chú';
  const statusEl = $('#pp-status');
  if (statusEl) statusEl.textContent = label;
  const prevBtn = $('#pp-prev');
  if (prevBtn) prevBtn.disabled = p <= 0;
  const nextBtn = $('#pp-next');
  if (nextBtn) nextBtn.disabled = p >= PP.count - 1;
  store.set('pp_page', p);
}

export function ppRefresh(pages) {
  pages.forEach((n) => {
    if (pp.pageEls[n]) pp.pageEls[n].innerHTML = ppPageHTML(n);
  });
  if (pages.includes(PP.data)) ppQR();
}

export function ppQR() {
  const el = $('#pp-qr');
  const pass = getPass();
  if (!el || !pass) return;
  if (typeof window.QRCode !== 'undefined') {
    el.innerHTML = '';
    new window.QRCode(el, {
      text: location.origin + '/?the=' + pass.id,
      width: 112,
      height: 112,
      colorDark: '#1b120c',
      colorLight: '#fffdf7',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  } else {
    el.innerHTML = `<span class="mono" style="font-size:11px">${pass.id}</span>`;
  }
}

export function ppGo(p) {
  if (pp.flip) {
    if (reduceMotion) {
      pp.flip.turnToPage(p);
      ppStatus(p);
    } else {
      pp.flip.flip(p);
    }
  } else if (pp.pageEls[p]) {
    pp.pageEls[p].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    ppStatus(p);
  }
}

export function destroyPassport() {
  if (pp.flip) {
    try {
      pp.flip.destroy();
    } catch (e) {}
  }
  pp.flip = null;
  pp.pageEls = [];
}

export function renderTicket(animate) {
  const pass = getPass();
  const slot = $('#ticket-slot');
  if (!slot) return;

  if (!pass) {
    destroyPassport();
    slot.innerHTML = `<div class="ticket ticket-empty">
      <i class="ph ph-identification-card" aria-hidden="true"></i>
      <strong>Hộ chiếu của bạn sẽ hiện ở đây</strong>
      <span>Gồm mã QR riêng và bốn trang visa để đóng dấu ở bốn trạm.</span>
      <div style="display:grid;gap:8px;width:100%;max-width:260px;margin-top:8px" aria-hidden="true">
        <div class="skeleton" style="height:12px"></div><div class="skeleton" style="height:12px;width:70%"></div>
      </div></div>`;
    const chk = $('#checkout');
    if (chk) chk.hidden = true;
    return;
  }

  if (!pass.issuedAt) {
    pass.issuedAt = Date.now();
    setPass(pass);
  }
  destroyPassport();

  slot.innerHTML = `
    <div class="pp-stage" id="pp-stage" tabindex="0" aria-roledescription="hộ chiếu lật trang" aria-label="Hộ chiếu thông hành. Dùng phím mũi tên để lật trang.">
      <div class="pp-book" id="pp-book"></div>
    </div>
    <div class="flip-controls pp-controls">
      <button class="icon-btn" type="button" id="pp-prev" aria-label="Trang trước"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
      <p class="flip-status" id="pp-status" aria-live="polite">Bìa hộ chiếu</p>
      <button class="icon-btn" type="button" id="pp-next" aria-label="Trang sau"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
    </div>`;

  const bookEl = $('#pp-book');
  pp.pageEls = Array.from({ length: PP.count }, (_, k) => {
    const el = document.createElement('div');
    const hard = k === PP.cover || k === PP.back;
    el.className = 'pp-pg' + (hard ? ' pp-hard' : '');
    if (hard) el.dataset.density = 'hard';
    el.innerHTML = ppPageHTML(k);
    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a')) e.stopPropagation();
    });
    el.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, a')) e.stopPropagation();
    }, { passive: true });
    bookEl.appendChild(el);
    return el;
  });

  bookEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ppgo]');
    if (b) {
      ppGo(+b.dataset.ppgo);
      return;
    }
    const m = e.target.closest('[data-moment]');
    if (m) {
      pickMoment(m.dataset.moment);
      return;
    }
    const w = e.target.closest('[data-spin]');
    if (w) openWheel(+w.dataset.spin);
  });

  const PF = window.St && window.St.PageFlip;
  const start = animate ? PP.cover : Math.min(store.get('pp_page', PP.data), PP.count - 1);
  if (PF) {
    pp.flip = new PF(bookEl, {
      width: 320,
      height: 450,
      size: 'stretch',
      minWidth: 240,
      maxWidth: 360,
      minHeight: 340,
      maxHeight: 506,
      showCover: true,
      usePortrait: true,
      autoSize: true,
      drawShadow: true,
      maxShadowOpacity: 0.3,
      flippingTime: reduceMotion ? 1 : 800,
      mobileScrollSupport: true,
      disableFlipByClick: true,
      showPageCorners: !reduceMotion,
      swipeDistance: 30,
      startPage: start
    });
    pp.flip.loadFromHTML(pp.pageEls);

    const ctrl = pp.flip.getFlipController();
    if (ctrl) {
      ctrl.flipPrev = function (t = 'top') {
        const r = this.render.getRect();
        this.flip({
          x: (r.left || 0) + 12,
          y: t === 'top' ? 1 : r.height - 2
        });
      };
    }

    pp.flip.on('flip', (e) => {
      isPpFlipping = false;
      sound.flip();
      ppStatus(e.data);
    });
  } else {
    $('#pp-stage')?.classList.add('is-fallback');
  }

  ppQR();
  ppStatus(start);

  let isPpFlipping = false;
  $('#pp-prev')?.addEventListener('click', () => {
    if (isPpFlipping) return;
    const cur = pp.flip ? pp.flip.getCurrentPageIndex() : store.get('pp_page', 0);
    if (cur <= 0) return;
    isPpFlipping = true;
    if (pp.flip) {
      if (reduceMotion) {
        pp.flip.turnToPage(cur - 1);
        ppStatus(cur - 1);
      } else {
        try {
          pp.flip.flipPrev();
        } catch (err) {
          pp.flip.flip(cur - 1);
        }
      }
    } else {
      ppGo(Math.max(0, cur - 1));
    }
    setTimeout(() => {
      isPpFlipping = false;
    }, reduceMotion ? 50 : 850);
  });

  $('#pp-next')?.addEventListener('click', () => {
    if (isPpFlipping) return;
    const cur = pp.flip ? pp.flip.getCurrentPageIndex() : store.get('pp_page', 0);
    if (cur >= PP.count - 1) return;
    isPpFlipping = true;
    if (pp.flip) {
      if (reduceMotion) {
        pp.flip.turnToPage(cur + 1);
        ppStatus(cur + 1);
      } else {
        try {
          pp.flip.flipNext();
        } catch (err) {
          pp.flip.flip(cur + 1);
        }
      }
    } else {
      ppGo(Math.min(PP.count - 1, cur + 1));
    }
    setTimeout(() => {
      isPpFlipping = false;
    }, reduceMotion ? 50 : 850);
  });

  $('#pp-stage')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      $('#pp-next')?.click();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      $('#pp-prev')?.click();
    }
  });

  if (animate) {
    if (hasGsap && !reduceMotion && window.gsap) {
      gsap.from('#pp-stage', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' });
    }
    setTimeout(() => ppGo(PP.data), reduceMotion ? 0 : 900);
  }
  renderCheckout();
}

export function playStamp(sel) {
  const wrap = $(`[data-stamp="${sel}"]`);
  const el = wrap && wrap.firstElementChild;
  if (!el) return;
  if (!hasGsap || reduceMotion || !window.gsap) {
    sound.stamp();
    return;
  }
  gsap.fromTo(
    el,
    { scale: 2.6, opacity: 0, rotation: -22, filter: 'blur(3px)' },
    {
      scale: 1,
      opacity: 1,
      rotation: 0,
      filter: 'blur(0px)',
      duration: 0.42,
      ease: 'power4.in',
      onComplete: () => {
        sound.stamp();
        gsap.fromTo(
          wrap.closest('.pp-stamp-zone') || wrap,
          { x: 0 },
          { x: 3, duration: 0.05, yoyo: true, repeat: 3, clearProps: 'x' }
        );
      }
    }
  );
}

export function addStamp(raw) {
  const pass = getPass();
  if (!pass) return;
  const code = String(raw || '').trim().toUpperCase();
  const input = $('#qr-f-otp') || $('#f-code');
  const st = STATIONS.find((s) => s.code === code || (s.altCodes && s.altCodes.includes(code)));
  track('qr_scan', { station: st ? st.id : null, valid: !!st });
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    toast('Mã trạm gồm 6 ký tự, in dưới mã QR của trạm.', 'err');
    input && input.classList.add('shake');
    return;
  }
  if (!st) {
    toast('Mã này chưa khớp với trạm nào. Bạn kiểm tra lại hoặc nhờ nhân sự quét giúp nhé.', 'err');
    input && input.classList.add('shake');
    return;
  }
  if (pass.stamps.includes(st.id)) {
    toast(`${st.name} đã đóng dấu cho bạn rồi.`, 'info', 'seal-check');
    ppGo(PP.visa(st.id));
    return;
  }
  if (input) input.value = '';
  doStamp(st.id);
}

export function doStamp(id, ts, fromServer) {
  const pass = getPass();
  if (!pass) return;
  const st = STATIONS[id - 1];
  if (pass.stamps.includes(id)) return;
  pass.stamps.push(id);
  pass.stampedAt = Object.assign({}, pass.stampedAt, { [id]: ts || Date.now() });
  setPass(pass);
  savePassToHistory(pass);
  renderRegister();
  track('stamp_added', { station: id, by: fromServer ? 'staff' : 'self' });
  if (!fromServer) measure('stamp', { st: id });
  const complete = pass.stamps.length === 4;
  const hint = $('#pp-staff-hint');
  if (hint && complete) hint.hidden = true;

  ppRefresh([PP.data, PP.guide, PP.visa(st.id), PP.done]);
  const target = PP.visa(st.id);
  const cur = store.get('pp_page', 0);
  const visible = pp.flip
    ? pp.flip.getOrientation() === 'landscape'
      ? [cur, cur % 2 ? cur + 1 : cur - 1]
      : [cur]
    : [target];
  const wait = visible.includes(target) || reduceMotion ? 80 : 950;
  ppGo(target);

  setTimeout(() => {
    playStamp(st.id);
    setTimeout(() => {
      openWheel(st.id).then(() => {
        if (complete) {
          ppGo(PP.done);
          setTimeout(() => playStamp('gold'), reduceMotion ? 80 : 950);
        }
      });
    }, reduceMotion ? 300 : 1100);
  }, wait);

  if (complete) {
    track('passport_complete');
    toast('Đủ bốn dấu rồi. Mời bạn đến bàn check-out nhận quà.', 'gold', 'gift');
    const fc = $('#form-code');
    if (fc) fc.remove();
    renderCheckout();
  } else {
    toast(`Đã đóng dấu ${st.name}. Còn ${4 - pass.stamps.length} trạm nữa.`, 'ok', 'seal-check');
  }
}

export function wonList() {
  const won = STATIONS.map((s) => [s, spinOf(s.id)]).filter(([, x]) => x && x.prize !== 'none');
  if (!won.length) return '';
  return `<div class="won"><strong><i class="ph ph-gift" aria-hidden="true"></i> Quà vòng quay</strong>
    <ul>${won
      .map(
        ([s, x]) => `<li><span>${PRIZES[x.prize].label}</span><small>${s.name}</small></li>`
      )
      .join('')}</ul></div>`;
}

export function renderCheckout() {
  const pass = getPass();
  const box = $('#checkout');
  if (!box) return;
  if (typeof window.renderLetter === 'function' && $('#letter-lock')) window.renderLetter();
  if (!pass || pass.stamps.length < 4) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = `
    <div><h3>Chúc mừng, bạn đã đi đủ bốn trạm</h3>
    <p style="color:var(--text-muted);margin-top:6px">${
      pass.claimed
        ? 'Quà đã được trao. Cảm ơn bạn đã đồng hành.'
        : 'Đưa mã này cho nhân sự tại bàn check-out. Mã chỉ dùng được một lần.'
    }</p></div>
    <p class="gift-code ${pass.claimed ? 'is-claimed' : ''}" aria-label="Mã nhận quà ${pass.giftCode
    .split('')
    .join(' ')}">${pass.giftCode}</p>
    ${
      pass.claimed
        ? ''
        : server.on
        ? '<p class="help"><i class="ph ph-qr-code" aria-hidden="true"></i> Nhân sự quét QR hộ chiếu của bạn ở bàn check-out để xác nhận trao quà.</p><button class="btn btn-primary" type="button" data-show-qr><i class="ph ph-qr-code" aria-hidden="true"></i> Mở mã QR</button>'
        : '<button class="btn btn-ghost" type="button" id="btn-claim"><i class="ph ph-hand-heart" aria-hidden="true"></i> Nhân sự xác nhận đã trao quà</button>'
    }
    ${wonList()}
    <div class="optin">
      <strong>Viết Chuyện Nhà Đêm 23 gửi Táo</strong>
      <p style="color:var(--text-muted);font-size:15px">Chuyện Nhà Đêm 23 đã mở. Ghi bốn lời gửi ông Táo và dán ảnh khoảnh khắc ở các trạm.</p>
      <div class="optin-actions">
        <a class="btn btn-primary btn-sm" href="#la-so" id="optin-yes">Viết Chuyện Nhà Đêm 23</a>
        <button class="btn btn-quiet" type="button" id="optin-no">Để sau</button>
      </div>
    </div>`;

  const cb = $('#btn-claim');
  if (cb) {
    cb.addEventListener('click', () => {
      if (pass.claimed) {
        toast('Mã quà này đã được dùng. Nếu có nhầm lẫn, bạn báo nhân sự giúp nhé.', 'info');
        return;
      }
      pass.claimed = true;
      setPass(pass);
      track('reward_claimed');
      measure('claim');
      toast('Đã ghi nhận trao quà. Chúc bạn một năm mới thật ấm.', 'gold', 'gift');
      renderCheckout();
    });
  }
  $('#optin-yes')?.addEventListener('click', () => track('optin_yes'));
  $('#optin-no')?.addEventListener('click', () => {
    track('optin_no');
    toast('Không sao. Chuyện Nhà Đêm 23 luôn chờ bạn ở cuối trang.', 'info');
  });
  if (hasGsap && !reduceMotion && window.gsap) {
    gsap.from(box, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
  }
}

export function renderRegister() {
  const pass = getPass();
  const has = Boolean(pass) && !store.get('new_pass', false);
  const bar = $('#passport-bar');
  const regCard = $('#register');
  const grid = $('.passport-grid');

  if (has) {
    if (regCard) regCard.hidden = true;
    if (grid) grid.classList.add('has-passport');
    if (bar) {
      bar.hidden = false;
      bar.innerHTML = `
        <div class="pb-info">
          <span class="pb-badge" aria-hidden="true"><i class="ph ph-identification-card"></i></span>
          <div class="pb-details">
            <div class="pb-name-row">
              <span class="pb-name">${esc(pass.nickname)}</span>
              <span class="pb-tag">${pass.stamps.length}/4 dấu</span>
            </div>
            <span class="pb-meta"><span class="mono">${esc(pass.id)}</span></span>
          </div>
        </div>
        <div class="pb-actions">
          <button class="btn btn-primary btn-sm pb-qr-btn" type="button" data-show-qr><i class="ph ph-qr-code" aria-hidden="true"></i> Mở mã QR</button>
          <button class="btn btn-ghost btn-sm pb-new-btn" type="button" id="btn-new-pass"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i> Tạo thẻ khác</button>
        </div>`;
      const btnNew = $('#btn-new-pass', bar);
      if (btnNew) {
        btnNew.addEventListener('click', async () => {
          const v = await ask({
            tone: 'danger',
            title: 'Tạo thẻ khác trên máy này?',
            html: `<p>Thẻ <strong>${esc(pass.id)}</strong> cùng ${
              pass.stamps.length
            }/4 dấu sẽ không còn trên máy này. Nên chụp lại mã thẻ trước để nhân sự hỗ trợ lấy lại khi cần.</p>`,
            buttons: [
              { label: 'Giữ thẻ hiện tại', value: 'cancel', cls: 'btn-primary' },
              { label: 'Tạo thẻ khác', value: 'ok', cls: 'btn-danger' }
            ]
          });
          if (v !== 'ok') return;
          store.set('new_pass', true);
          track('new_pass_requested');
          renderRegister();
          renderTicket(false);
          $('#f-nickname')?.focus();
        });
      }
    }
  } else {
    if (bar) bar.hidden = true;
    if (regCard) regCard.hidden = false;
    if (grid) grid.classList.remove('has-passport');
    const openBox = $('#register-open');
    if (openBox) openBox.hidden = false;
    const box = $('#register-has');
    if (box) box.hidden = true;
  }
}

export function initPassportUI() {
  setPassportServiceCallbacks({
    renderTicket,
    renderRegister,
    renderCheckout,
    ppRefresh,
    ppGo,
    doStamp
  });
  setWheelCallbacks({
    onRefreshVisa: (id) => ppRefresh([PP.visa(id)]),
    onRenderCheckout: renderCheckout
  });
  setPassGetter(getPass);

  const fName = $('#f-nickname'),
    fEmail = $('#f-email'),
    fConsent = $('#f-consent');

  function validateName() {
    if (!fName) return false;
    const v = fName.value.trim();
    const msg = !v
      ? 'Bạn nhập một cái tên để in lên thẻ nhé.'
      : v.length < 2
      ? 'Tên cần ít nhất 2 ký tự.'
      : '';
    setFieldError(fName, $('#f-nickname-err'), msg);
    return !msg;
  }
  function validateEmail() {
    if (!fEmail) return false;
    const v = fEmail.value.trim();
    const msg =
      v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
        ? 'Email chưa đúng định dạng, ví dụ: ban@email.com'
        : '';
    setFieldError(fEmail, $('#f-email-err'), msg);
    return !msg;
  }
  function setFieldError(input, out, msg) {
    if (!input) return;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) out.innerHTML = msg ? `<i class="ph ph-warning-circle" aria-hidden="true"></i>${msg}` : '';
  }

  if (fName) {
    fName.addEventListener('blur', validateName);
    fName.addEventListener('input', () => {
      if (fName.getAttribute('aria-invalid') === 'true') validateName();
    });
  }
  if (fEmail) {
    fEmail.addEventListener('blur', validateEmail);
    fEmail.addEventListener('input', () => {
      if (fEmail.getAttribute('aria-invalid') === 'true') validateEmail();
    });
  }

  $('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const okName = validateName(),
      okEmail = validateEmail();
    const summary = $('#error-summary');
    if (!okName || !okEmail) {
      const items = [];
      if (!okName) items.push('<a href="#f-nickname">Nhập tên hoặc nickname</a>');
      if (!okEmail) items.push('<a href="#f-email">Kiểm tra lại email</a>');
      const sumList = $('#error-summary-list');
      if (sumList) sumList.innerHTML = items.join('');
      if (summary) {
        summary.hidden = false;
        summary.focus();
      }
      return;
    }
    if (summary) summary.hidden = true;
    let nickname = fName.value.trim();
    const offline = !navigator.onLine;

    if (!offline && isTaken(nickname)) {
      const suffix = withSuffix(nickname);
      const choice = await ask({
        title: `Tên “${esc(nickname)}” đã có người dùng`,
        html: `<p>Nếu <strong>bạn đã từng tạo thẻ</strong>, hãy lấy lại thẻ cũ để giữ các dấu trạm đã đóng.</p>
          <p>Nếu <strong>bạn là người mới</strong>, dùng tên có thêm số để nhân sự không nhầm hai người:</p>
          <p class="dlg-chip">${esc(suffix)}</p>`,
        buttons: [
          { label: 'Đổi tên khác', value: 'edit', cls: 'btn-quiet' },
          { label: 'Lấy lại thẻ cũ', value: 'restore', cls: 'btn-ghost' },
          { label: `Dùng tên ${esc(suffix)}`, value: 'suffix', cls: 'btn-primary' }
        ]
      });
      track('nickname_conflict', { choice: choice || 'dismiss' });
      if (choice === 'restore') {
        openRestore(nickname);
        return;
      }
      if (choice !== 'suffix') {
        fName.focus();
        fName.select();
        return;
      }
      nickname = suffix;
    }

    const btn = $('#btn-register');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Đang tạo thẻ…</span>';
    }

    const consent = fConsent ? fConsent.checked : false;
    const email = fEmail ? fEmail.value.trim() : '';

    setTimeout(() => {
      const pass = {
        id: (offline ? 'OFF-' : 'TAO-') + randCode(6),
        nickname,
        email: consent && email ? email : null,
        consent,
        stamps: [],
        giftCode: 'QUA-' + randCode(4),
        claimed: false,
        synced: !offline
      };
      setPass(pass);
      savePassToHistory(pass);
      if (!offline)
        store.set('registry', [...new Set([...store.get('registry', []), plain(nickname)])]);
      measure('register');
      store.set('new_pass', false);
      renderRegister();
      if (!offline) pushPass().catch(() => {});
      startPolling();
      track('form_submit');
      track(consent ? 'consent_accepted' : 'consent_declined');
      track('virtual_id_created', { offline });
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-label">Tạo thẻ thông hành</span>';
      }
      if (offline)
        toast(
          `Đang mất mạng nên thẻ được tạo trên máy với mã ${pass.id}. Có mạng lại, thẻ tự đồng bộ sang mã chính thức.`,
          'info',
          'wifi-slash'
        );
      else if (!consent && email)
        toast('Thẻ đã sẵn sàng. Vì bạn chưa đồng ý, chúng tôi không lưu email.', 'ok');
      else
        toast(
          'Thẻ thông hành đã sẵn sàng. Đưa mã QR cho nhân sự ở mỗi trạm nhé.',
          'ok',
          'identification-card'
        );
      $('#form-register')?.reset();
      renderTicket(true);
      if (window.innerWidth < 1000)
        ($('#passport-bar') || $('#ticket-slot'))?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      const pending = store.get('pending_stamp', null);
      if (pending) {
        store.set('pending_stamp', null);
        setTimeout(() => addStamp(pending), 1800);
      }
    }, 700);
  });

  $('#btn-restore')?.addEventListener('click', () => openRestore());

  // Bấm Mở mã QR
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-show-qr]')) return;
    const pass = getPass();
    if (!pass) return;
    const canStamp = pass.stamps.length < 4;
    ask({
      title: 'Mã QR hộ chiếu',
      html: `<div class="qr-big" id="qr-big" role="img" aria-label="Mã QR của thẻ ${esc(
        pass.id
      )}"></div>
        <p class="qr-big-id">${esc(pass.id)} · ${esc(pass.nickname)}</p>
        <p class="help" style="text-align:center">Đưa màn hình cho nhân sự quét. Quét chậm thì tăng độ sáng màn hình.</p>
        ${
          canStamp
            ? `
        <div class="qr-fallback-section">
          <p class="qr-fallback-title"><i class="ph ph-warning-circle" aria-hidden="true"></i> Không quét được? Nhập mã 6 số hoặc mã trạm:</p>
          <div class="qr-fallback-form" id="qr-form-otp" style="display:flex;gap:8px;align-items:center;width:100%">
            <input class="input" id="qr-f-otp" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="6 chữ số / mã trạm" aria-label="Mã đóng dấu" style="flex:1;min-width:0;height:42px;margin:0">
            <button class="btn btn-primary" type="button" id="qr-btn-submit" style="flex:none;white-space:nowrap;padding:0 16px;height:42px;margin:0">Đóng dấu</button>
          </div>
          <p class="help" style="margin:4px 0 0;font-size:12px;text-align:left">${
            server.on
              ? 'Nhập mã 6 số do nhân sự đọc, hoặc mã trạm chạy thử (HUONG1, MAIAM2...).'
              : 'Bản thử nghiệm: mã các trạm là HUONG1, MAIAM2, NEPNH3, TOTLA4.'
          }</p>
        </div>`
            : ''
        }`,
      buttons: [{ label: 'Đóng', value: 'ok', cls: 'btn-ghost' }]
    });

    const box = $('#qr-big');
    if (box && typeof window.QRCode !== 'undefined') {
      new window.QRCode(box, {
        text: location.origin + '/?the=' + pass.id,
        width: 260,
        height: 260,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else if (box) {
      box.textContent = pass.id;
    }
    track('show_qr');
    pullPass();

    const doSubmitOtp = async () => {
      const inputVal = $('#qr-f-otp') ? $('#qr-f-otp').value : '';
      const ok = await stampByCode(inputVal);
      if (ok) {
        const dlg = $('#dlg');
        if (dlg && dlg.open) dlg.close('ok');
      }
    };
    $('#qr-btn-submit')?.addEventListener('click', doSubmitOtp);
    $('#qr-f-otp')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        doSubmitOtp();
      }
    });
  });

  // Chọn ảnh khoảnh khắc
  const momentInput = $('#moment-input');
  if (momentInput) {
    momentInput.addEventListener('change', () => {
      const file = momentInput.files && momentInput.files[0],
        slot = momentInput.dataset.slot;
      if (!file || !slot) return;
      if (!/^image\//.test(file.type)) {
        toast('Tệp này không phải ảnh. Bạn chọn ảnh JPG hoặc PNG nhé.', 'err');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast('Ảnh lớn hơn 20MB. Bạn chọn ảnh nhỏ hơn giúp nhé.', 'err');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const prev = moments[slot];
        moments[slot] = c.toDataURL('image/jpeg', 0.78);
        if (!saveMoments()) {
          if (prev) moments[slot] = prev;
          else delete moments[slot];
          toast(
            'Bộ nhớ trên máy đã đầy, không lưu thêm ảnh này được.',
            'err',
            'warning-circle'
          );
          return;
        }
        track('moment_saved', { slot });
        toast('Đã lưu ảnh khoảnh khắc!', 'ok', 'camera');
        const stNum = Number(slot);
        if (stNum >= 1 && stNum <= 4) ppRefresh([PP.visa(stNum)]);
        if (typeof window.renderLetter === 'function') window.renderLetter();
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Nút xoá dữ liệu trên máy
  $('#btn-clear-local')?.addEventListener('click', async () => {
    let pass = getPass();
    const lose = [];
    if (pass) lose.push(`Thẻ thông hành <strong>${esc(pass.id)}</strong> mang tên ${esc(pass.nickname)}`);
    if (pass && pass.stamps.length) lose.push(`${pass.stamps.length}/4 dấu trạm đã đóng`);
    if (pass && pass.stamps.length === 4 && !pass.claimed)
      lose.push(`Mã nhận quà <strong>${esc(pass.giftCode)}</strong> (chưa nhận quà)`);
    const nPhoto = momentCount();
    if (nPhoto) lose.push(`${nPhoto} ảnh khoảnh khắc ở sự kiện`);
    lose.push('Tiến độ đọc sách và Chuyện Nhà Đêm 23 đang soạn');

    const p = ask({
      tone: 'danger',
      title: 'Xoá dữ liệu trên máy này?',
      html: `<p>Những thứ sau sẽ mất và <strong>không khôi phục được</strong> trên máy này:</p>
        <ul class="dlg-list">${lose.map((x) => `<li>${x}</li>`).join('')}</ul>
        ${
          pass
            ? `<p class="dlg-note"><i class="ph ph-camera" aria-hidden="true"></i><span>Nên chụp lại mã thẻ <strong>${esc(
                pass.id
              )}</strong> trước, để nhân sự có thể hỗ trợ lấy lại.</span></p>`
            : ''
        }
        <label class="dlg-label" for="dlg-type">Gõ <strong>XOÁ</strong> để xác nhận</label>
        <input class="input" id="dlg-type" autocomplete="off" spellcheck="false" placeholder="XOÁ">`,
      buttons: [
        { label: 'Giữ lại dữ liệu', value: 'cancel', cls: 'btn-primary' },
        { label: 'Xoá vĩnh viễn', value: 'ok', cls: 'btn-danger', id: 'dlg-ok', disabled: true }
      ]
    });

    const input = $('#dlg-type');
    if (input) {
      input.addEventListener('input', () => {
        const okBtn = $('#dlg-ok');
        if (okBtn) okBtn.disabled = plain(input.value) !== 'XOA';
      });
      input.focus();
    }
    const v = await p;
    track('clear_data', { confirmed: v === 'ok' });
    if (v !== 'ok') return;

    store.clear();
    setPass(null);
    renderTicket();
    renderRegister();
    if (typeof window.resetMedals === 'function') window.resetMedals();
    if (typeof window.renderLetter === 'function') window.renderLetter();
    toast('Đã xoá dữ liệu trên máy này.', 'ok');
  });
}
