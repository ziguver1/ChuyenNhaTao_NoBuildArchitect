/**
 * Thông báo Toast — microcopy giọng ấm áp, không phán xét
 */
import { $ } from './dom.js';
import { hasGsap, reduceMotion } from './motion.js';

export function toast(msg, type = 'info', icon) {
  const box = $('#toasts');
  if (!box) return;

  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const ic =
    icon ||
    (type === 'ok'
      ? 'check-circle'
      : type === 'gold'
      ? 'medal'
      : type === 'err'
      ? 'warning-circle'
      : 'info');
  t.innerHTML = `<i class="ph ph-${ic}" aria-hidden="true"></i><span>${msg}</span>`;
  box.appendChild(t);

  if (hasGsap && !reduceMotion && window.gsap) {
    gsap.from(t, { y: 16, opacity: 0, duration: 0.3, ease: 'power2.out' });
  }

  setTimeout(() => {
    if (hasGsap && !reduceMotion && window.gsap) {
      gsap.to(t, { y: 8, opacity: 0, duration: 0.2, onComplete: () => t.remove() });
    } else {
      t.remove();
    }
  }, 4200);
}
