/**
 * Ghi chú hướng dẫn kiểu bóng thoại truyện tranh (phần thẻ thông hành)
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { track } from '../../analytics/tracker.js';
import { reduceMotion } from '../../core/motion.js';

export function initGuideNote() {
  const g = $('#guide');
  if (!g) return;
  const note = $('#guide-note'),
    bubble = $('#guide-bubble'),
    bar = $('.guide-timer i', g);
  const DUR = 8000;
  let timer = 0,
    cloudTimer = 0,
    left = DUR,
    startedAt = 0;

  function runTimer() {
    clearTimeout(timer);
    startedAt = Date.now();
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${left / DUR})`;
    void bar.offsetWidth;
    bar.style.transition = `transform ${left}ms linear`;
    bar.style.transform = 'scaleX(0)';
    timer = setTimeout(dock, left);
  }
  function pauseTimer() {
    if (!g.classList.contains('is-open')) return;
    clearTimeout(timer);
    left = Math.max(800, left - (Date.now() - startedAt));
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${left / DUR})`;
  }
  function open(auto) {
    clearTimeout(cloudTimer);
    g.hidden = false;
    g.classList.remove('is-docked', 'show-cloud');
    g.classList.add('is-open');
    bubble.setAttribute('aria-expanded', 'true');
    left = DUR;
    runTimer();
    if (!auto) note.focus({ preventScroll: true });
    track('guide_open', { auto: !!auto });
  }
  function dock() {
    clearTimeout(timer);
    const wasOpen = g.classList.contains('is-open');
    g.classList.remove('is-open');
    g.classList.add('is-docked', 'show-cloud');
    bubble.setAttribute('aria-expanded', 'false');
    store.set('guide_seen', true);
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => g.classList.remove('show-cloud'), 5000);
    if (wasOpen && note.contains(document.activeElement)) bubble.focus({ preventScroll: true });
  }

  note.addEventListener('mouseenter', pauseTimer);
  note.addEventListener('mouseleave', () => {
    if (g.classList.contains('is-open')) runTimer();
  });
  note.addEventListener('touchstart', pauseTimer, { passive: true });
  note.addEventListener('focusin', pauseTimer);
  $('.guide-x', g)?.addEventListener('click', dock);
  bubble.addEventListener('click', () => (g.classList.contains('is-open') ? dock() : open(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && g.classList.contains('is-open')) dock();
  });

  const intro = $('#pp-intro');
  if (intro) {
    const introBar = $('.pp-intro-timer i', intro);
    let introLeft = DUR,
      introAt = 0,
      introTimer = 0,
      introDone = false,
      introVisible = false;

    function introRun() {
      if (introDone) return;
      clearTimeout(introTimer);
      introAt = Date.now();
      introBar.style.transition = 'none';
      introBar.style.transform = `scaleX(${introLeft / DUR})`;
      void introBar.offsetWidth;
      introBar.style.transition = `transform ${introLeft}ms linear`;
      introBar.style.transform = 'scaleX(0)';
      introTimer = setTimeout(collapseIntro, introLeft);
    }
    function introPause() {
      if (introDone || !introAt) return;
      clearTimeout(introTimer);
      introLeft = Math.max(1200, introLeft - (Date.now() - introAt));
      introBar.style.transition = 'none';
      introBar.style.transform = `scaleX(${introLeft / DUR})`;
    }
    function collapseIntro() {
      if (introDone) return;
      introDone = true;
      clearTimeout(introTimer);
      const finish = () => {
        intro.hidden = true;
        g.hidden = false;
        dock();
      };
      const inner = intro.firstElementChild;
      if (reduceMotion || !introVisible || !inner.animate) {
        finish();
        return;
      }
      const r = inner.getBoundingClientRect();
      const dx = 48 - (r.left + r.width / 2),
        dy = innerHeight - 46 - (r.top + r.height / 2);
      const h = intro.offsetHeight;
      intro.style.overflow = 'visible';
      inner.animate(
        [
          { transform: 'none', opacity: 1 },
          {
            transform: `translate(${dx * 0.5}px, ${dy * 0.45}px) scale(.4) rotate(-4deg)`,
            opacity: 0.85,
            offset: 0.55
          },
          { transform: `translate(${dx}px, ${dy}px) scale(.04) rotate(-10deg)`, opacity: 0 }
        ],
        { duration: 900, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' }
      );
      intro.animate([{ height: h + 'px' }, { height: '0px' }], {
        duration: 650,
        delay: 250,
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'forwards'
      });
      setTimeout(finish, 900);
    }
    intro.addEventListener('mouseenter', introPause);
    intro.addEventListener('mouseleave', introRun);

    new IntersectionObserver(
      (es) => {
        introVisible = es[0].isIntersecting;
        if (introVisible && !introAt && !introDone) setTimeout(introRun, 300);
      },
      { threshold: 0.5 }
    ).observe(intro);
  }

  new IntersectionObserver(
    (es) => {
      const inZone = es[0].isIntersecting;
      g.classList.toggle('in-zone', inZone);
      if (!inZone && g.classList.contains('is-open')) dock();
    },
    { threshold: 0.12 }
  ).observe($('#tram-trai-nghiem'));
}
