/**
 * Màn chào hỏi nhảy nhót trước khi vào web (Site Intro Animation)
 */
import { reduceMotion } from '../core/motion.js';

export function initSiteIntro() {
  const overlay = document.getElementById('site-intro-overlay');
  if (!overlay) return;

  const skipBtn = document.getElementById('intro-skip-btn');
  const words = overlay.querySelectorAll('.intro-word');
  const fishWrap = document.getElementById('intro-fish-wrapper');
  const fish = document.getElementById('intro-fish');
  const hatWrap = document.getElementById('intro-hat-wrapper');
  const hat = document.getElementById('intro-hat');
  const impactWave = document.getElementById('hat-impact-wave');
  const shimmer = document.getElementById('intro-shimmer');
  const footerHint = overlay.querySelector('.intro-footer-hint');

  let dismissed = false;
  let introMasterTl = null;

  function dismissIntro() {
    if (dismissed) return;
    dismissed = true;
    if (introMasterTl) introMasterTl.kill();
    words.forEach((el) => el.classList.remove('sync-dancing'));
    overlay.classList.add('intro-dismissed');
    setTimeout(() => {
      overlay.style.display = 'none';
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, 900);
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismissIntro();
    });
  }

  if (typeof reduceMotion !== 'undefined' && reduceMotion) {
    setTimeout(dismissIntro, 1200);
    return;
  }

  if (!window.gsap) {
    dismissIntro();
    return;
  }

  const gsap = window.gsap;

  gsap.set(words, { opacity: 0, y: 32, scale: 0.9, filter: 'blur(8px)' });
  gsap.set(fishWrap, { x: -window.innerWidth * 0.9, y: 30, rotation: 12, opacity: 0 });
  gsap.set(hatWrap, { y: -Math.max(window.innerHeight * 0.6, 320), rotation: -12, opacity: 0 });
  if (footerHint) gsap.set(footerHint, { opacity: 0, y: 15 });

  introMasterTl = gsap.timeline();

  introMasterTl.to(
    words,
    {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 1.15,
      stagger: 0.22,
      ease: 'power3.out'
    },
    0.1
  );

  introMasterTl.to(
    '.intro-word-huyen',
    {
      y: -6,
      duration: 1.4,
      repeat: 1,
      yoyo: true,
      ease: 'sine.inOut'
    },
    0.7
  );
  introMasterTl.to(
    '.intro-word-nha',
    {
      y: -5,
      duration: 1.5,
      repeat: 1,
      yoyo: true,
      ease: 'sine.inOut'
    },
    0.85
  );
  introMasterTl.to(
    '.intro-word-tao',
    {
      y: -5,
      duration: 1.5,
      repeat: 1,
      yoyo: true,
      ease: 'sine.inOut'
    },
    0.95
  );

  introMasterTl.to(
    fishWrap,
    {
      opacity: 1,
      duration: 0.45,
      ease: 'power1.out'
    },
    0.75
  );

  introMasterTl.to(
    fishWrap,
    {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 1.55,
      ease: 'power2.out',
      onUpdate: function () {
        const p = this.progress();
        if (p < 0.92) {
          const wave = Math.sin(p * Math.PI * 4.5) * (1 - p) * 20;
          gsap.set(fish, { y: wave, rotation: wave * 0.35 });
        } else {
          gsap.set(fish, { y: 0, rotation: 0 });
        }
      }
    },
    0.75
  );

  introMasterTl.to(
    fish,
    {
      scaleY: 1.1,
      scaleX: 0.92,
      duration: 0.16,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out'
    },
    2.3
  );

  introMasterTl.to(
    hatWrap,
    {
      opacity: 1,
      y: 0,
      rotation: 0,
      duration: 1.05,
      ease: 'bounce.out'
    },
    1.7
  );

  if (impactWave) {
    introMasterTl.fromTo(
      impactWave,
      { scale: 0.2, opacity: 0.9 },
      { scale: 2.2, opacity: 0, duration: 0.45, ease: 'power2.out' },
      2.5
    );
  }
  introMasterTl.to(
    hat,
    {
      scaleY: 0.84,
      scaleX: 1.18,
      duration: 0.14,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out'
    },
    2.5
  );

  const introGroup = [...words, fishWrap, hatWrap].filter(Boolean);
  introMasterTl.to(
    introGroup,
    {
      y: -26,
      scaleY: 1.14,
      scaleX: 0.92,
      duration: 0.28,
      ease: 'power2.out'
    },
    2.85
  );

  introMasterTl.to(
    introGroup,
    {
      y: 0,
      scaleY: 0.92,
      scaleX: 1.08,
      duration: 0.18,
      ease: 'power2.in'
    },
    3.13
  );

  introMasterTl.to(
    introGroup,
    {
      scaleY: 1,
      scaleX: 1,
      duration: 0.32,
      ease: 'elastic.out(1.2, 0.4)'
    },
    3.31
  );

  if (shimmer) {
    introMasterTl.fromTo(
      shimmer,
      { x: '-140%', opacity: 0.8 },
      { x: '180%', opacity: 1, duration: 0.8, ease: 'power2.inOut' },
      3.0
    );
  }

  if (footerHint) {
    introMasterTl.to(footerHint, { opacity: 0.9, y: 0, duration: 0.5 }, 2.9);
  }

  introMasterTl.to(overlay, {
    opacity: 0,
    scale: 1.06,
    duration: 0.85,
    ease: 'power2.inOut',
    delay: 1.2,
    onComplete: dismissIntro
  });
}
