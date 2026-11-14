/**
 * Hiệu ứng chuyển tiếp giữa Đọc sách và Thẻ thông hành
 */
import { $ } from '../core/dom.js';
import { hasGsap, reduceMotion } from '../core/motion.js';

export function initBookPassportTransition() {
  const seam = $('#seam-book-passport');
  const targetSection = $('#tram-trai-nghiem');
  if (targetSection) targetSection.classList.add('cards-ready');
  if (!seam) return;

  if (!('IntersectionObserver' in window)) {
    seam.classList.add('is-active');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          seam.classList.add('is-active');
          // Khi đã kích hoạt mở, giữ cố định trạng thái để loại bỏ hoàn toàn hiện tượng
          // giật frame/nhấp nháy class khi người dùng lướt lên lướt xuống trên điện thoại
          observer.unobserve(seam);
        }
      });
    },
    {
      rootMargin: '120px 0px 60px 0px',
      threshold: 0.02
    }
  );

  observer.observe(seam);
}
