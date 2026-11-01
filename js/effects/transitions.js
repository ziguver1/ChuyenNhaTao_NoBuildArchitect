/**
 * Hiệu ứng chuyển tiếp giữa Đọc sách và Thẻ thông hành
 */
import { $ } from '../core/dom.js';
import { hasGsap, reduceMotion } from '../core/motion.js';

export function initBookPassportTransition() {
  const seam = $('#seam-book-passport');
  const targetSection = $('#tram-trai-nghiem');
  if (!seam || !targetSection) return;

  if (!('IntersectionObserver' in window)) {
    seam.classList.add('is-active');
    targetSection.classList.add('cards-ready');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          seam.classList.add('is-active');
          targetSection.classList.add('cards-ready');
          if (hasGsap && !reduceMotion && window.gsap) {
            const cards = ['#register', '#ticket-slot'].map((sel) => $(sel)).filter(Boolean);
            if (cards.length) {
              gsap.to(cards, {
                y: 0,
                opacity: 1,
                duration: 0.5,
                stagger: 0.08,
                ease: 'power2.out',
                overwrite: 'auto'
              });
            }
          }
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
