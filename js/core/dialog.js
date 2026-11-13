/**
 * Hộp thoại dùng chung (<dialog>): trả về Promise với value của nút được bấm.
 * Esc hoặc nút đầu tiên khi nhấn Enter = huỷ, nên không bao giờ xoá nhầm.
 */
import { $, $$ } from './dom.js';
import { hasGsap, reduceMotion } from './motion.js';

let dlgAbort = null;
let bodyScrollY = 0;
let lockDepth = 0;

/**
 * Khóa cuộn trang nền tuyệt đối trên mobile (iOS Safari, Android Chrome)
 * Sử dụng position: fixed với top âm để giữ nguyên vị trí xem, không giật layout.
 */
export function lockBodyScroll() {
  if (lockDepth === 0) {
    bodyScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('has-dialog-open');
    document.body.classList.add('has-dialog-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${bodyScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockDepth++;
}

/**
 * Mở khóa cuộn trang và phục hồi chính xác vị trí cuộn trước đó
 */
export function unlockBodyScroll() {
  if (lockDepth > 0) {
    lockDepth--;
  }
  if (lockDepth === 0) {
    document.documentElement.classList.remove('has-dialog-open');
    document.body.classList.remove('has-dialog-open');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    window.scrollTo(0, bodyScrollY);
  }
}

export function forceUnlockBodyScroll() {
  lockDepth = 0;
  document.documentElement.classList.remove('has-dialog-open');
  document.body.classList.remove('has-dialog-open');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('left');
  document.body.style.removeProperty('right');
  document.body.style.removeProperty('width');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  window.scrollTo(0, bodyScrollY);
}

export function ask({ title, html, tone = '', buttons, dismissible = true }) {
  const dlg = $('#dlg');
  if (!dlg) return Promise.resolve('');

  if (dlgAbort) {
    try {
      dlgAbort.abort();
    } catch (e) {
      /* ignore */
    }
    dlgAbort = null;
  }
  if (dlg && dlg.open) {
    try {
      dlg.close('');
    } catch (e) {
      /* ignore */
    }
  }
  dlgAbort = new AbortController();
  const { signal } = dlgAbort;

  return new Promise((resolve) => {
    dlg.className = 'dlg' + (tone ? ' dlg-' + tone : '');
    dlg.innerHTML = `<form method="dialog" class="dlg-box">
      <h3 class="dlg-title" id="dlg-title">${title}</h3>
      <div class="dlg-body">${html}</div>
      <div class="dlg-actions">${buttons
        .map(
          (b) =>
            `<button class="btn ${b.cls || 'btn-ghost'}" type="button" data-dlg-val="${b.value}" value="${b.value}"${
              b.id ? ` id="${b.id}"` : ''
            }${b.disabled ? ' disabled' : ''}>${b.label}</button>`
        )
        .join('')}</div>
    </form>`;
    dlg.returnValue = '';
    let settled = false;

    const done = (v) => {
      if (!settled) {
        settled = true;
        unlockBodyScroll();
        if (dlg && dlg.open) {
          try {
            dlg.close(v || '');
          } catch (e) {
            /* ignore */
          }
        }
        resolve(v || '');
      }
    };

    const f = $('form', dlg);
    if (f) {
      f.addEventListener(
        'submit',
        (e) => {
          e.preventDefault();
          done(e.submitter ? e.submitter.value : dlg.returnValue);
        },
        { signal }
      );
    }

    const actions = $('.dlg-actions', dlg);
    if (actions) {
      actions.addEventListener(
        'click',
        (e) => {
          const btn = e.target.closest('button');
          if (btn && !btn.disabled) {
            done(btn.dataset.dlgVal || btn.value || '');
          }
        },
        { signal }
      );
    }

    dlg.addEventListener(
      'click',
      (e) => {
        if (dismissible && e.target === dlg) done('');
      },
      { signal }
    );

    dlg.addEventListener(
      'cancel',
      (e) => {
        if (!dismissible) {
          e.preventDefault();
          return;
        }
        done('');
      },
      { signal }
    );

    dlg.addEventListener(
      'touchmove',
      (e) => {
        if (e.target === dlg) {
          e.preventDefault();
        }
      },
      { signal, passive: false }
    );

    dlg.addEventListener('close', () => done(dlg.returnValue), { signal, once: true });

    lockBodyScroll();
    try {
      dlg.showModal();
    } catch (err) {
      if (!dlg.open) dlg.setAttribute('open', '');
    }

    const dlgBox = $('.dlg-box', dlg);
    if (hasGsap && !reduceMotion && dlgBox && window.gsap) {
      gsap.from(dlgBox, { y: 18, opacity: 0, duration: 0.3, ease: 'power2.out' });
    }
  });
}
