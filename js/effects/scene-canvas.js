/**
 * Nền phần sách vẽ bằng canvas từ chính bức tranh cá chép (images/nen/)
 * Tối ưu: Cá bơi, mây trôi, sóng dâng hạ với inpainting vá nền.
 */
import { $, $$ } from '../core/dom.js';
import { reduceMotion } from '../core/motion.js';

export function initSceneCanvas() {
  const cv = $('#scene-canvas');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const W = 2000,
    H = 1116,
    FOCUS_X = 0.505;

  const LAYERS = [
    { src: 'may-d', x: 262, y: 118, w: 400, h: 150, kind: 'cloud', from: 0, amp: 26, sp: 0.16, phase: 0.9 },
    { src: 'may-e', x: 1418, y: 148, w: 582, h: 250, kind: 'cloud', from: 0, amp: 30, sp: 0.13, phase: 2.6 },
    { src: 'may-c', x: 250, y: 356, w: 406, h: 166, kind: 'cloud', from: 0, amp: 24, sp: 0.19, phase: 4.1 },
    { src: 'may-trai', x: 0, y: 243, w: 387, h: 230, kind: 'cloud', from: -1, amp: 64, sp: 0.11, phase: 0.4, delay: 0 },
    { src: 'may-phai', x: 1657, y: 345, w: 327, h: 153, kind: 'cloud', from: 1, amp: 56, sp: 0.14, phase: 2.1, delay: 0.15 },
    { src: 'ca-trai', x: 607, y: 113, w: 374, h: 343, kind: 'fish', tail: 'r', ax: 26, ay: 12, rot: 3, speed: 0.42, phase: 4, wag: 7 },
    { src: 'ca-phai', x: 1169, y: 105, w: 385, h: 198, kind: 'fish', tail: 'r', ax: 34, ay: 10, rot: 3.5, speed: 0.36, phase: 1.3, wag: 6 },
    { src: 'ca-duoi', x: 561, y: 595, w: 412, h: 268, kind: 'fish', tail: 'l', ax: 22, ay: 16, rot: 5, speed: 0.5, phase: 0, wag: 8 }
  ];
  const WAVE = { src: 'song', y: 661, h: 455 };
  const ENTER = 2.2;
  const imgs = {};
  let scale = 1,
    ox = 0,
    oy = 0,
    enterAt = null,
    inView = false,
    raf = 0;
  const wc = document.createElement('canvas'),
    wctx = wc.getContext('2d');

  const load = (name) =>
    new Promise((ok, fail) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = fail;
      im.src = `images/nen/${name}.webp`;
      imgs[name] = im;
    });
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    scale = Math.max(cv.width / W, cv.height / H);
    ox = Math.min(0, Math.max(cv.width - W * scale, cv.width / 2 - W * scale * FOCUS_X));
    oy = (cv.height - H * scale) / 2;
    wc.width = Math.max(1, Math.ceil(W * scale));
    wc.height = Math.max(1, Math.ceil(WAVE.h * scale));
  }

  function drawWaves(t) {
    const im = imgs[WAVE.src];
    if (reduceMotion) {
      ctx.drawImage(im, 0, WAVE.y, W, WAVE.h);
      return;
    }
    const sy = im.naturalHeight / WAVE.h,
      ROW = 5,
      COL = 8,
      PAD = 16;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, wc.width, wc.height);
    wctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (let y = 0; y < WAVE.h; y += ROW) {
      const k = 1 - y / WAVE.h;
      const dx =
        (Math.sin(t * 1.1 + y * 0.021) * 9 + Math.sin(t * 0.55 + y * 0.047) * 4) *
        (0.3 + 0.7 * k * k);
      const h = Math.min(ROW + 1, WAVE.h - y);
      wctx.drawImage(im, 0, y * sy, im.naturalWidth, h * sy, dx - PAD, y, W + PAD * 2, h);
    }
    for (let x = 0; x < W; x += COL) {
      const dy =
        7 * (1 + Math.sin(x * 0.0062 - t * 1.25)) + 2.5 * (1 + Math.sin(x * 0.019 + t * 1.8));
      ctx.drawImage(wc, x * scale, 0, COL * scale + 1, wc.height, x, WAVE.y + dy, COL + 0.6, WAVE.h);
    }
  }

  function drawFish(L, t) {
    const im = imgs[L.src];
    const k = reduceMotion ? 0 : t * L.speed + L.phase;
    const dx = Math.sin(k) * L.ax,
      dy = Math.sin(k * 2) * L.ay * 0.5 + Math.sin(k * 0.7) * L.ay * 0.5;
    const rot = ((Math.sin(k * 1.6 + 0.8) * L.rot * Math.PI) / 180);
    ctx.save();
    ctx.translate(L.x + L.w / 2 + dx, L.y + L.h / 2 + dy);
    ctx.rotate(rot);
    if (reduceMotion) {
      ctx.drawImage(im, -L.w / 2, -L.h / 2, L.w, L.h);
      ctx.restore();
      return;
    }
    const sx = im.naturalWidth / L.w,
      SW = 6;
    for (let x = 0; x < L.w; x += SW) {
      const u = L.tail === 'r' ? x / L.w : 1 - x / L.w;
      const off = L.wag * Math.pow(u, 1.6) * Math.sin(u * 5.2 - t * 4.2 + L.phase);
      const w = Math.min(SW, L.w - x);
      ctx.drawImage(
        im,
        x * sx,
        0,
        w * sx,
        im.naturalHeight,
        -L.w / 2 + x,
        -L.h / 2 + off,
        w + 0.6,
        L.h
      );
    }
    ctx.restore();
  }

  function draw(now) {
    const t = now / 1000;
    const e = enterAt === null ? 0 : reduceMotion ? 1 : (now - enterAt) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.drawImage(imgs.nen, 0, 0, W, H);
    for (const L of LAYERS) {
      if (L.kind !== 'cloud') continue;
      const im = imgs[L.src];
      const p = !L.from || reduceMotion ? 1 : easeOut(Math.min(1, Math.max(0, (e - L.delay) / ENTER)));
      if (p <= 0) continue;
      const fly = (1 - p) * L.from * (L.w + 260);
      const drift = reduceMotion ? 0 : Math.sin(t * L.sp + L.phase) * L.amp * p;
      const bob = reduceMotion ? 0 : Math.sin(t * L.sp * 1.7 + L.phase) * 4;
      ctx.globalAlpha = Math.min(1, p * 1.4);
      ctx.drawImage(im, L.x + fly + drift, L.y + bob, L.w, L.h);
      ctx.globalAlpha = 1;
    }
    drawFish(LAYERS.find((l) => l.src === 'ca-trai'), t);
    drawFish(LAYERS.find((l) => l.src === 'ca-phai'), t);
    drawWaves(t);
    drawFish(LAYERS.find((l) => l.src === 'ca-duoi'), t);
  }

  function loop(now) {
    if (cv.width <= 1) resize();
    draw(now);
    raf =
      inView && !reduceMotion && document.visibilityState === 'visible'
        ? requestAnimationFrame(loop)
        : 0;
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  Promise.all(['nen', WAVE.src, ...LAYERS.map((l) => l.src)].map(load))
    .then(() => {
      resize();
      draw(performance.now());
      $('.scene')?.classList.add('is-live');
      const retry = () => {
        if (cv.width > 1) return;
        resize();
        draw(performance.now());
        if (cv.width <= 1) setTimeout(retry, 400);
      };
      setTimeout(retry, 300);
      new IntersectionObserver(
        (es) => {
          inView = es.some((x) => x.isIntersecting);
          if (inView && enterAt === null) enterAt = performance.now();
          if (inView) kick();
        },
        { threshold: 0.05 }
      ).observe($('#doc-sach'));

      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          resize();
          draw(performance.now());
        }).observe(cv);
      } else {
        window.addEventListener('resize', () => {
          resize();
          draw(performance.now());
        });
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && inView) kick();
      });
    })
    .catch(() => {});
}
