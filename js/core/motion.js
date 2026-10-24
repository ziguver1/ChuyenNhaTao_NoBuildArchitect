/**
 * Quản lý giảm chuyển động (Reduced Motion) & GSAP
 */
import { $ } from './dom.js';

export const hasGsap = typeof window.gsap !== 'undefined';

export const osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let motionPref = null;
try {
  motionPref = localStorage.getItem('cnt_motion');
} catch (e) {
  /* bỏ qua */
}

export const reduceMotion = motionPref ? motionPref === 'reduced' : osReduce;

// Đánh dấu class lên html ngay lập tức
document.documentElement.classList.toggle('motion-reduced', reduceMotion);

// Khôi phục vị trí cuộn nếu vừa reload do đổi chế độ motion
try {
  const y = sessionStorage.getItem('cnt_scroll');
  if (y !== null) {
    sessionStorage.removeItem('cnt_scroll');
    requestAnimationFrame(() => window.scrollTo(0, +y));
  }
} catch (e) {
  /* bỏ qua */
}

/**
 * Khởi tạo nút chuyển đổi chế độ chuyển động trên Header
 * @param {Function} trackFn Hàm tracking sự kiện
 */
export function initMotionToggle(trackFn) {
  const motionBtn = $('#motion-toggle');
  if (!motionBtn) return;

  function paintMotionBtn() {
    motionBtn.setAttribute('aria-pressed', String(!reduceMotion));
    motionBtn.setAttribute(
      'aria-label',
      reduceMotion ? 'Bật hiệu ứng chuyển động' : 'Giảm hiệu ứng chuyển động'
    );
    motionBtn.title = reduceMotion ? 'Bật hiệu ứng chuyển động' : 'Giảm hiệu ứng chuyển động';
    motionBtn.innerHTML = `<i class="ph ph-${reduceMotion ? 'pause-circle' : 'sparkle'}" aria-hidden="true"></i>`;
  }

  paintMotionBtn();

  motionBtn.addEventListener('click', () => {
    try {
      localStorage.setItem('cnt_motion', reduceMotion ? 'full' : 'reduced');
    } catch (e) {
      /* bỏ qua */
    }
    if (typeof trackFn === 'function') {
      trackFn('motion_toggle', { to: reduceMotion ? 'full' : 'reduced' });
    }
    try {
      sessionStorage.setItem('cnt_scroll', String(window.scrollY));
    } catch (e) {
      /* bỏ qua */
    }
    location.reload();
  });
}
