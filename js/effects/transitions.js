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
        const rect = entry.boundingClientRect;
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
        } else {
          if (rect.top > 0) {
            seam.classList.remove('is-active');
          }
        }
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: [0, 0.2]
    }
  );

  observer.observe(seam);
}
