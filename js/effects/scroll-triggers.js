/**
 * Quản lý GSAP ScrollTrigger, Menu mobile và Offline status bar
 */
import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { flushMeter } from '../analytics/meter.js';
import { hasGsap, reduceMotion } from '../core/motion.js';
import { syncPass } from '../features/passport/passport.service.js';
import { getPass } from '../features/passport/passport.state.js';
import { moveIndicator } from '../features/storybook/flipbook.js';

export function initMobileMenu() {
  const menuBtn = $('#menu-toggle'),
    menu = $('#mobile-menu');
  if (!menuBtn || !menu) return;

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menuBtn.innerHTML = `<i class="ph ph-${open ? 'x' : 'list'}" aria-hidden="true"></i>`;
    $('#site-header')?.classList.toggle('is-solid', open || window.scrollY > 40);
  }

  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
}

export function initOfflineBar() {
  const offlineBar = $('#offline-bar');
  if (!offlineBar) return;
  const syncOnline = () => {
    offlineBar.hidden = navigator.onLine;
  };
  window.addEventListener('online', () => {
    syncOnline();
    const pass = getPass();
    if (pass && !pass.synced) syncPass();
    else toast('Đã có mạng lại.', 'ok', 'wifi-high');
    flushMeter();
  });
  window.addEventListener('offline', syncOnline);
  syncOnline();
}

export function initScrollAnimations() {
  if (!window.carpScene && $('#footer-stage')) {
    $('#site-footer')?.classList.add('no-webgl');
  }

  if (!hasGsap || !window.gsap) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const menu = $('#mobile-menu');
  ScrollTrigger.create({
    start: 40,
    end: 'max',
    onToggle: (self) =>
      $('#site-header')?.classList.toggle(
        'is-solid',
        self.isActive || (menu && menu.classList.contains('is-open'))
      )
  });

  ['doc-sach', 'tram-trai-nghiem', 'la-so'].forEach((id) => {
    const el = $('#' + id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) =>
        $$(`.nav-links a[href="#${id}"]`).forEach((a) => a.classList.toggle('is-active', self.isActive))
    });
  });

  if (!reduceMotion) {
    const heroWords = $$('#hero-title .brand-line, #hero-title .word');
    const heroFade = $$('[data-hero-fade]');
    if (heroWords.length || heroFade.length) {
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (heroWords.length) {
        heroTl.from(heroWords, { yPercent: 60, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.15);
      }
      if (heroFade.length) {
        heroTl.from(heroFade, { y: 18, opacity: 0, duration: 0.7, stagger: 0.12 }, 0.35);
      }
    }

    const heroPlate = $('.hero-content, .hero-plate');
    if (heroPlate && $('#hero')) {
      gsap.fromTo(
        heroPlate,
        { y: 0, opacity: 1 },
        {
          y: -60,
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom 10%',
            scrub: true,
            invalidateOnRefresh: true,
            onLeaveBack: () => {
              gsap.set(heroPlate, { y: 0, opacity: 1 });
              if (heroWords.length) gsap.set(heroWords, { opacity: 1, yPercent: 0 });
            },
            onUpdate: (self) => {
              if (self.progress <= 0.02 || window.scrollY <= 15) {
                gsap.set(heroPlate, { y: 0, opacity: 1 });
                if (heroWords.length) gsap.set(heroWords, { opacity: 1, yPercent: 0 });
              }
            }
          }
        }
      );

      window.addEventListener(
        'scroll',
        () => {
          if (window.scrollY <= 15) {
            if (parseFloat(getComputedStyle(heroPlate).opacity) < 0.98) {
              gsap.set(heroPlate, { y: 0, opacity: 1 });
              if (heroWords.length) gsap.set(heroWords, { opacity: 1, yPercent: 0 });
            }
          }
        },
        { passive: true }
      );
    }

    if ($('.site-footer')) {
      ScrollTrigger.create({
        trigger: '.site-footer',
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => window.carpScene && window.carpScene.setScroll(self.progress)
      });
    }

    const revealEls = $$('.reveal');
    if (revealEls.length) {
      gsap.set(revealEls, { opacity: 0, y: 28 });
      ScrollTrigger.batch(revealEls, {
        start: 'top 88%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            overwrite: true
          })
      });
    }

    const flowLines = $$('.flow-line');
    if (flowLines.length && $('.flow')) {
      gsap.from(flowLines, {
        scaleX: 0,
        duration: 0.9,
        stagger: 0.2,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: '.flow', start: 'top 85%' }
      });
    }
    const flowIcons = $$('.flow .ico');
    if (flowIcons.length && $('.flow')) {
      gsap.from(flowIcons, {
        scale: 0.6,
        opacity: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '.flow', start: 'top 85%' }
      });
    }
  } else {
    const heroElements = $$('[data-hero-fade], #hero-title, #hero-title .brand-line');
    if (heroElements.length) {
      gsap.from(heroElements, { opacity: 0, duration: 0.8, stagger: 0.1, ease: 'none' });
    }
    const revealEls = $$('.reveal');
    if (revealEls.length) {
      gsap.set(revealEls, { opacity: 0 });
      ScrollTrigger.batch(revealEls, {
        start: 'top 90%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1,
            duration: 0.6,
            stagger: 0.05,
            ease: 'none',
            overwrite: true
          })
      });
    }
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
      moveIndicator(false);
    });
  }
}
