/**
 * Hộp thoại dùng chung (<dialog>): trả về Promise với value của nút được bấm.
 * Esc hoặc nút đầu tiên khi nhấn Enter = huỷ, nên không bao giờ xoá nhầm.
 */
import { $, $$ } from './dom.js';
import { hasGsap, reduceMotion } from './motion.js';

let dlgAbort = null;

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

    dlg.addEventListener('close', () => done(dlg.returnValue), { signal, once: true });

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
