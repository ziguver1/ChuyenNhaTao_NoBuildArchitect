/**
 * Hiệu ứng nền Bụi vàng kim tuyến & Ánh hào quang lấp lánh (Golden Dust & Shimmer)
 * cho khu vực Chuyện Nhà Đêm 23 (#la-so).
 * Tối ưu 60fps: IntersectionObserver tự ngắt khi ngoài màn hình (0% CPU).
 */
import { $ } from '../core/dom.js';
import { reduceMotion } from '../core/motion.js';

export function initLaSoBackground() {
  const canvas = $('#la-so-bg-canvas');
  const section = $('#la-so');
  if (!canvas || !section) return;

  const ctx = canvas.getContext('2d');
  let width = 0,
    height = 0;
  let particles = [];
  let isVisible = false;
  let animId = null;
  let mouse = { x: -999, y: -999, active: false };

  const GOLD_COLORS = [
    '#ffe082', // Vàng kim sáng
    '#ffd54f', // Vàng hoàng gia
    '#f0b847', // Vàng nghệ truyền thống
    '#ffca28', // Hổ phách sáng
    '#fff8e1', // Ánh kim lấp lánh
    '#e6b800' // Vàng đậm
  ];

  function resize() {
    const rect = section.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
    createParticles();
  }

  let lanterns = [];

  function createParticles() {
    particles = [];
    lanterns = [];
    const count = width < 600 ? 42 : width < 1024 ? 75 : 110;
    const speedMult = reduceMotion ? 0.25 : 1;
    for (let i = 0; i < count; i++) {
      const isSparkle = Math.random() < 0.25;
      const isGlow = !isSparkle && Math.random() < 0.3;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: isGlow
          ? 3.5 + Math.random() * 4
          : isSparkle
          ? 4.5 + Math.random() * 5
          : 1.2 + Math.random() * 2.6,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
        vx: (Math.random() - 0.5) * 0.4 * speedMult,
        vy: -(0.3 + Math.random() * 0.65) * speedMult,
        alpha: Math.random() * 0.6 + 0.35,
        baseAlpha: Math.random() * 0.5 + 0.4,
        twinkleSpeed: 0.025 + Math.random() * 0.045,
        twinklePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.025,
        wobbleAmp: 0.5 + Math.random() * 0.9,
        wobblePhase: Math.random() * Math.PI * 2,
        isSparkle,
        isGlow,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.025 * speedMult
      });
    }

    const lanternCount = width < 600 ? 5 : 8;
    for (let j = 0; j < lanternCount; j++) {
      lanterns.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 7,
        vy: -(0.18 + Math.random() * 0.25) * speedMult,
        wobbleSpeed: 0.01 + Math.random() * 0.015,
        wobbleAmp: 0.3 + Math.random() * 0.5,
        wobblePhase: Math.random() * Math.PI * 2,
        flicker: Math.random() * Math.PI * 2,
        alpha: 0.45 + Math.random() * 0.4
      });
    }
  }

  function drawSparkle(ctx, x, y, size, alpha, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffe082';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const arm = size;
    const inner = size * 0.18;
    ctx.moveTo(0, -arm);
    ctx.quadraticCurveTo(0, -inner, inner, 0);
    ctx.quadraticCurveTo(0, inner, 0, arm);
    ctx.quadraticCurveTo(0, inner, -inner, 0);
    ctx.quadraticCurveTo(0, -inner, 0, -arm);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, alpha * 1.4);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLantern(ctx, x, y, size, alpha, flicker) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.6);
    glow.addColorStop(0, 'rgba(255, 190, 60, 0.55)');
    glow.addColorStop(0.5, 'rgba(255, 110, 30, 0.18)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 135, 35, 0.82)';
    ctx.beginPath();
    const w = size * 0.9,
      h = size * 1.35;
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w * 0.35, h / 2);
    ctx.lineTo(-w * 0.35, h / 2);
    ctx.closePath();
    ctx.fill();

    const fl = Math.min(1, 0.75 + Math.sin(flicker) * 0.25);
    ctx.fillStyle = `rgba(255, 250, 190, ${fl})`;
    ctx.beginPath();
    ctx.arc(0, h * 0.1, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    if (!isVisible) return;
    ctx.clearRect(0, 0, width, height);

    const moonX = width * 0.82,
      moonY = height * 0.12;
    const moonGrad = ctx.createRadialGradient(
      moonX,
      moonY,
      0,
      moonX,
      moonY,
      Math.min(width * 0.45, 380)
    );
    moonGrad.addColorStop(0, 'rgba(255, 240, 190, 0.22)');
    moonGrad.addColorStop(0.35, 'rgba(240, 184, 71, 0.08)');
    moonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, width, height);

    for (let k = 0; k < lanterns.length; k++) {
      const l = lanterns[k];
      l.wobblePhase += l.wobbleSpeed;
      l.x += Math.sin(l.wobblePhase) * l.wobbleAmp;
      l.y += l.vy;
      l.flicker += 0.06;

      let lanternAlpha = l.alpha;
      if (l.y < 90) {
        lanternAlpha *= Math.max(0, l.y / 90);
      }

      if (l.y < -30) {
        l.y = height + 25;
        l.x = Math.random() * width;
      }
      drawLantern(ctx, l.x, l.y, l.size, lanternAlpha, l.flicker);
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.wobblePhase += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobblePhase) * p.wobbleAmp;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      p.twinklePhase += p.twinkleSpeed;
      let curAlpha = p.baseAlpha + Math.sin(p.twinklePhase) * 0.35;
      if (curAlpha < 0.1) curAlpha = 0.1;
      if (curAlpha > 0.98) curAlpha = 0.98;

      if (p.y < 70) {
        curAlpha *= Math.max(0, p.y / 70);
      }
      p.alpha = curAlpha;

      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140 && dist > 0) {
          const force = (140 - dist) / 140;
          p.x -= (dx / dist) * force * 2;
          p.y -= (dy / dist) * force * 2;
          p.alpha = Math.min(1, p.alpha + force * 0.5);
        }
      }

      if (p.y < -20) {
        p.y = height + 15;
        p.x = Math.random() * width;
      }
      if (p.x < -20) p.x = width + 10;
      if (p.x > width + 20) p.x = -10;

      if (p.isSparkle) {
        drawSparkle(ctx, p.x, p.y, p.size, p.alpha, p.color, p.rotation);
      } else if (p.isGlow) {
        ctx.save();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.45, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = p.alpha * 0.65;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    animId = requestAnimationFrame(render);
  }

  section.addEventListener(
    'mousemove',
    (e) => {
      const rect = section.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    },
    { passive: true }
  );

  section.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isVisible) {
              isVisible = true;
              animId = requestAnimationFrame(render);
            }
          } else {
            isVisible = false;
            if (animId) cancelAnimationFrame(animId);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(section);
  } else {
    isVisible = true;
    animId = requestAnimationFrame(render);
  }

  window.addEventListener(
    'resize',
    () => {
      if (isVisible) resize();
    },
    { passive: true }
  );

  resize();
}
