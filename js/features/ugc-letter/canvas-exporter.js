/**
 * Engine vẽ Canvas độ phân giải cao cho Chuyện Nhà Đêm 23 & xuất ảnh PNG
 */
import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { track } from '../../analytics/tracker.js';
import { plain, esc } from '../../core/dom.js';
import { VALUES, FRAME_CONFIG, STICKER_CATALOG } from './values.data.js';
import { ugc, saveUgcSettings, lineOf } from './letter.state.js';
import { getPass, moments, MOMENT_SLOTS, momentCount } from '../passport/passport.state.js';

let drawing = 0;
let isCanvasDragInit = false;
let activeDragSticker = null;
let dragOffset = { x: 0, y: 0 };
let currentTicketBounds = null;

export const loadImg = (src) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

export function drawImageCover(ctx, img, x, y, w, h, radius = 0) {
  if (!img || !img.width || !img.height) return;
  ctx.save();
  ctx.beginPath();
  if (radius > 0 && ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  const sc = Math.max(w / img.width, h / img.height);
  const dw = img.width * sc,
    dh = img.height * sc;
  const dx = x + (w - dw) / 2,
    dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function fitSingleLineText(ctx, text, x, y, maxW) {
  let str = (text || '').trim();
  if (!str) return;
  if (ctx.measureText(str).width <= maxW) {
    ctx.fillText(str, x, y);
    return;
  }
  while (str.length > 2 && ctx.measureText(str + '…').width > maxW) {
    str = str.slice(0, -1).trim();
  }
  ctx.fillText(str + '…', x, y);
}

export function wrapTextIntoTwoLines(ctx, text, maxW) {
  let str = (text || '').trim();
  if (!str) return [''];
  if (ctx.measureText(str).width <= maxW) return [str];
  const words = str.split(/\s+/);
  let line1 = '';
  let splitIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const candidate = line1 ? line1 + ' ' + words[i] : words[i];
    if (ctx.measureText(candidate).width <= maxW) {
      line1 = candidate;
      splitIndex = i;
    } else {
      break;
    }
  }
  if (splitIndex === -1 || splitIndex >= words.length - 1) {
    let single = str;
    while (single.length > 2 && ctx.measureText(single + '…').width > maxW) {
      single = single.slice(0, -1).trim();
    }
    return [single + '…'];
  }
  let line2 = words.slice(splitIndex + 1).join(' ');
  if (ctx.measureText(line2).width > maxW) {
    while (line2.length > 2 && ctx.measureText(line2 + '…').width > maxW) {
      line2 = line2.slice(0, -1).trim();
    }
    line2 += '…';
  }
  return [line1, line2];
}

export function pseudoRnd(col, row, seed = 1) {
  const n = Math.sin(col * 12.9898 + row * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

export function drawSparkle(ctx, cx, cy, size, col1, col2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = col2 || '#fff';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(ang) * size, Math.sin(ang) * size);
    ctx.lineTo(
      Math.cos(ang + Math.PI / 4) * (size * 0.28),
      Math.sin(ang + Math.PI / 4) * (size * 0.28)
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPolkaDotsBackground(ctx, W, H, bgColor, dotColor, tall) {
  ctx.fillStyle = bgColor || '#faeb77';
  ctx.fillRect(0, 0, W, H);

  // Cấu trúc chấm bi so le chuẩn mực theo hình mẫu (Geometric Staggered Polka Dot Lattice)
  // Các chấm tròn đều 100%, đồng kích thước, thẳng hàng so le chuẩn xác, không có chấm rỗng hay ngôi sao ngẫu nhiên
  // Tỷ lệ khớp 1:1 theo ảnh mẫu: stepX ~180px, stepY ~88px, bán kính r ~20px (đường kính 40px)
  const baseR = tall ? 22 : 20;
  const stepX = tall ? 190 : 180;
  const stepY = tall ? 92 : 88;

  ctx.fillStyle = dotColor || '#4ec5cb';

  let rowIndex = 0;
  // Bắt đầu từ toạ độ âm để mép trên/dưới/trái/phải luôn được phủ kín tự nhiên
  for (let cy = -baseR; cy <= H + stepY; cy += stepY) {
    const xOffset = rowIndex % 2 === 0 ? 0 : stepX / 2;
    for (let cx = -stepX; cx <= W + stepX; cx += stepX) {
      const x = cx + xOffset;
      const y = cy;

      ctx.beginPath();
      ctx.arc(x, y, baseR, 0, Math.PI * 2);
      ctx.fill();
    }
    rowIndex++;
  }
}


export function drawPhotoPlaceholder(ctx, x, y, w, h, r, title, sub, inkMuted) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r || 6);
  else ctx.rect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fill();
  ctx.strokeStyle = inkMuted || 'rgba(0, 0, 0, 0.2)';
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = inkMuted || '#333';
  const cy = y + h / 2;
  const titleSz = Math.max(12, Math.round(w * 0.07));
  ctx.font = '600 ' + titleSz + 'px "Be Vietnam Pro", sans-serif';
  ctx.fillText(title, x + w / 2, cy - (sub ? titleSz * 0.58 : 0));
  if (sub) {
    const subSz = Math.max(10, Math.round(titleSz * 0.78));
    ctx.font = 'italic 400 ' + subSz + 'px "EB Garamond", serif';
    ctx.fillText(sub, x + w / 2, cy + titleSz * 0.72);
  }
  ctx.restore();
}

export async function drawCard() {
  const ticket = ++drawing;
  const cv = $('#ugc-canvas');
  if (!cv || $('#letter-open')?.hidden) return;
  const W = 1080,
    H = ugc.ratio === '9:16' ? 1920 : 1080,
    tall = H > W;

  try {
    await Promise.all([
      document.fonts.load('700 60px "Playfair Display"'),
      document.fonts.load('italic 600 40px "EB Garamond"'),
      document.fonts.load('600 30px "Be Vietnam Pro"'),
      document.fonts.load('800 30px "Be Vietnam Pro"')
    ]);
  } catch (e) {}

  const frameCfg = FRAME_CONFIG[ugc.frame] || FRAME_CONFIG['1'];
  const activeStickers = Array.isArray(ugc.stickers) ? ugc.stickers : [];
  const [frameImg, loadedPhotos, loadedStickerImgs] = await Promise.all([
    loadImg(frameCfg.src),
    Promise.all(
      MOMENT_SLOTS.map(async (slot) => {
        if (!moments[slot]) return null;
        return await loadImg(moments[slot]);
      })
    ),
    Promise.all(
      activeStickers.map(async (s) => {
        return await loadImg(s.src);
      })
    )
  ]);

  const photoMap = {};
  MOMENT_SLOTS.forEach((slot, idx) => {
    if (loadedPhotos[idx]) photoMap[slot] = loadedPhotos[idx];
  });

  if (ticket !== drawing) return;
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const serif = (w, sz, it) => `${it ? 'italic ' : ''}${w} ${sz}px "EB Garamond", Georgia, serif`;
  const sans = (w, sz) => `${w} ${sz}px "Be Vietnam Pro", system-ui, sans-serif`;

  drawPolkaDotsBackground(ctx, W, H, ugc.bgColor, ugc.dotColor, tall);

  const ticketW = tall ? 980 : Math.round(920 * (2290 / 3090));
  const ticketH = tall ? Math.round(ticketW * (3090 / 2290)) : 920;
  const ticketX = Math.round((W - ticketW) / 2);
  const ticketY = tall ? Math.round((H - ticketH) / 2 - 30) : Math.round((H - ticketH) / 2 - 15);
  const scale = ticketW / 2290;

  currentTicketBounds = { ticketX, ticketY, ticketW, ticketH };

  const drawX = ticketX - 55 * scale;
  const drawY = ticketY - 55 * scale;
  const drawW = 2400 * scale;
  const drawH = 3200 * scale;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = Math.round(32 * (scale / 0.42));
  ctx.shadowOffsetY = Math.round(14 * (scale / 0.42));
  if (frameImg) ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
  ctx.restore();

  const pass = getPass();
  const nick = pass && pass.nickname ? pass.nickname : 'người giữ lửa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = frameCfg.ink;
  ctx.font = serif(600, Math.round(48 * scale), true);
  ctx.fillText(`Nhà của ${nick} kính gửi Táo`, ticketX + ticketW / 2, drawY + 520 * scale);

  const PHOTO_BOXES = [
    { slot: '1', name: 'Tôn Kính', x: 202, y: 580, w: 644, h: 558 },
    { slot: '2', name: 'Mái Ấm', x: 878, y: 580, w: 644, h: 558 },
    { slot: '3', name: 'Nhìn Lại', x: 1554, y: 580, w: 644, h: 558 },
    { slot: '4', name: 'Hướng Thiện', x: 202, y: 1186, w: 644, h: 558 },
    { slot: 'x1', name: 'Kỷ niệm 1', x: 878, y: 1186, w: 644, h: 558 },
    { slot: 'x2', name: 'Kỷ niệm 2', x: 1554, y: 1186, w: 644, h: 558 }
  ];
  const photoR = Math.round(28 * scale);
  PHOTO_BOXES.forEach((box) => {
    const bx = drawX + box.x * scale;
    const by = drawY + box.y * scale;
    const bw = box.w * scale;
    const bh = box.h * scale;
    const img = photoMap[box.slot];
    if (img) {
      drawImageCover(ctx, img, bx, by, bw, bh, photoR);
    } else {
      drawPhotoPlaceholder(
        ctx,
        bx,
        by,
        bw,
        bh,
        photoR,
        box.name,
        'Chạm thêm ảnh',
        frameCfg.inkMuted
      );
    }
  });

  const STRIP_Y = [2018, 2274, 2530, 2786];
  const stripX = drawX + 202 * scale;
  const stripW = 1996 * scale;
  const stripH = 220 * scale;
  const ROMAN_VALUES = ['I', 'II', 'III', 'IV'];

  for (let k = 0; k < 4; k++) {
    const sy = drawY + STRIP_Y[k] * scale;
    const cy = sy + stripH / 2;
    const padX = 48 * scale;
    const contentX = stripX + padX;
    const maxTextW = stripW - padX * 2;
    const quoteText = `“${lineOf(k)}”`;

    const stampLabel = `${ROMAN_VALUES[k]} · ${VALUES[k].name.toUpperCase()}`;
    const stampFont = sans(800, Math.max(10, Math.round(23 * scale)));
    ctx.font = stampFont;
    const tw = ctx.measureText(stampLabel).width;
    const stampPadX = 13 * scale;
    const stampW = tw + stampPadX * 2 + 14 * scale;
    const stampH = Math.round(38 * scale);
    const stampX = stripX + stripW - stampW - 20 * scale;
    const stampY = sy + stripH - stampH - 12 * scale;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(stampX, stampY, stampW, stampH, 6 * scale);
    else ctx.rect(stampX, stampY, stampW, stampH);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = frameCfg.inkMuted;
    ctx.lineWidth = Math.max(1, 1.2 * (scale / 0.42));
    ctx.setLineDash([3 * (scale / 0.42), 2.5 * (scale / 0.42)]);
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(
        stampX + 2 * scale,
        stampY + 2 * scale,
        stampW - 4 * scale,
        stampH - 4 * scale,
        5 * scale
      );
    else ctx.rect(stampX + 2 * scale, stampY + 2 * scale, stampW - 4 * scale, stampH - 4 * scale);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = frameCfg.ink;
    ctx.font = stampFont;
    ctx.fillText(`✦  ${stampLabel}`, stampX + stampPadX, stampY + stampH / 2);
    ctx.restore();

    const largeQuoteSz = Math.round(84 * scale);
    ctx.font = serif(600, largeQuoteSz, true);
    const fitsSingleLine = ctx.measureText(quoteText).width <= maxTextW;

    if (fitsSingleLine) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = frameCfg.ink;
      ctx.font = serif(600, largeQuoteSz, true);
      ctx.fillText(quoteText, contentX, cy - 6 * scale);
    } else {
      const mediumQuoteSz = Math.round(62 * scale);
      ctx.font = serif(600, mediumQuoteSz, true);
      const lines = wrapTextIntoTwoLines(ctx, quoteText, maxTextW);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = frameCfg.ink;
      ctx.font = serif(600, mediumQuoteSz, true);
      ctx.fillText(lines[0], contentX, cy - 24 * scale);
      if (lines[1]) {
        ctx.fillText(lines[1], contentX, cy + 22 * scale);
      }
    }
  }

  if (activeStickers.length > 0 && loadedStickerImgs) {
    activeStickers.forEach((s, idx) => {
      const img = loadedStickerImgs[idx];
      if (!img || !img.width || !img.height) return;
      const cx = ticketX + s.relX * ticketW;
      const cy = ticketY + s.relY * ticketH;
      const stickerW = ticketW * (s.relScale || 0.2);
      const aspect = img.height / img.width;
      const stickerH = stickerW * aspect;

      ctx.save();
      ctx.translate(cx, cy);
      if (s.rot) {
        ctx.rotate((s.rot * Math.PI) / 180);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
      ctx.shadowBlur = Math.round(14 * (scale / 0.42));
      ctx.shadowOffsetX = Math.round(2 * (scale / 0.42));
      ctx.shadowOffsetY = Math.round(7 * (scale / 0.42));

      ctx.drawImage(img, -stickerW / 2, -stickerH / 2, stickerW, stickerH);
      ctx.restore();
    });
  }

  const tagText = '#ChuyenNhaTao   #YearInValues';
  const tagFontSize = tall ? 22 : 18;
  ctx.font = sans(700, tagFontSize);
  const tw = ctx.measureText(tagText).width;
  const badgePadX = 24,
    badgePadY = 9;
  const badgeW = tw + badgePadX * 2;
  const badgeH = tagFontSize + badgePadY * 2;
  const bx = W / 2 - badgeW / 2;
  const by = (tall ? H - 90 : H - 55) - badgePadY;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeW, badgeH, 999);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#1e1c24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = sans(700, tagFontSize);
  ctx.fillText(tagText, W / 2, by + badgePadY + tagFontSize * 0.85);

  renderCaptions();
}

export function captionsFor() {
  const pass = getPass();
  const name = (pass && pass.nickname) || 'nhà mình';
  return [
    `Chuyện Nhà Đêm 23 năm nay của nhà ${name}: tôn kính, mái ấm, nhìn lại, hướng thiện. Nhờ ông Táo mang lên trời giúp nhé! #ChuyenNhaTao #YearInValues`,
    `Bếp đỏ giữ lửa, nếp nhà đoàn viên. Một năm của nhà mình gói trong bốn giá trị. Còn Chuyện Nhà Đêm 23 nhà bạn viết gì? #ChuyenNhaTao #YearInValues`,
    `Đi đủ bốn trạm ở sự kiện Chuyện Nhà Táo, và đây là Chuyện Nhà Đêm 23 nhà mình gửi ông Táo. #ChuyenNhaTao #YearInValues`
  ];
}

export function renderCaptions() {
  const box = $('#captions');
  if (!box) return;
  box.innerHTML = captionsFor()
    .map(
      (c, i) =>
        `<button class="caption" type="button" data-c="${i}"><i class="ph ph-copy" aria-hidden="true"></i><span>${esc(
          c
        )}</span></button>`
    )
    .join('');
  $$('#captions .caption').forEach((b) =>
    b.addEventListener('click', () => copyCaption(+b.dataset.c))
  );
}

export async function copyCaption(i) {
  const text = captionsFor()[i];
  ugc.caption = i;
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã sao chép caption. Dán vào bài đăng là xong.', 'ok', 'copy');
  } catch (e) {
    toast('Chưa sao chép được tự động. Bạn giữ và chọn đoạn caption để sao chép nhé.', 'info');
  }
  track('copy_caption', { version: i + 1 });
}

export function cardBlob() {
  return new Promise((res) => {
    const cv = $('#ugc-canvas');
    if (!cv) res(null);
    else cv.toBlob(res, 'image/png');
  });
}

export async function downloadCardImage() {
  const blob = await cardBlob();
  if (!blob) return null;
  const pass = getPass();
  const nick = pass && pass.nickname ? plain(pass.nickname).replace(/\s+/g, '-') : 'la-so';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ChuyenNhaTao-${nick}-${ugc.ratio.replace(':', 'x')}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  track('download', { ratio: ugc.ratio, photos: momentCount() });
  return blob;
}

export function setupCanvasStickerDrag() {
  const cv = $('#ugc-canvas');
  if (!cv || isCanvasDragInit) return;
  isCanvasDragInit = true;

  function getCanvasPos(e) {
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function hitTestSticker(pos) {
    if (!currentTicketBounds || !ugc.stickers || !ugc.stickers.length) return null;
    const { ticketX, ticketY, ticketW, ticketH } = currentTicketBounds;
    for (let i = ugc.stickers.length - 1; i >= 0; i--) {
      const s = ugc.stickers[i];
      const cx = ticketX + s.relX * ticketW;
      const cy = ticketY + s.relY * ticketH;
      const stickerW = ticketW * (s.relScale || 0.2);
      const radius = stickerW * 0.65;
      const dist = Math.hypot(pos.x - cx, pos.y - cy);
      if (dist <= radius) {
        return { sticker: s, cx, cy };
      }
    }
    return null;
  }

  cv.addEventListener('pointerdown', (e) => {
    const pos = getCanvasPos(e);
    const hit = hitTestSticker(pos);
    if (hit) {
      activeDragSticker = hit.sticker;
      dragOffset.x = pos.x - hit.cx;
      dragOffset.y = pos.y - hit.cy;
      cv.classList.add('is-dragging-sticker');
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  });

  cv.addEventListener('pointermove', (e) => {
    const pos = getCanvasPos(e);
    if (activeDragSticker && currentTicketBounds) {
      const { ticketX, ticketY, ticketW, ticketH } = currentTicketBounds;
      const targetX = pos.x - dragOffset.x;
      const targetY = pos.y - dragOffset.y;
      activeDragSticker.relX = (targetX - ticketX) / ticketW;
      activeDragSticker.relY = (targetY - ticketY) / ticketH;
      drawCard();
    } else {
      const hit = hitTestSticker(pos);
      cv.classList.toggle('is-hovering-sticker', Boolean(hit));
    }
  });

  const endDrag = (e) => {
    if (activeDragSticker) {
      activeDragSticker = null;
      cv.classList.remove('is-dragging-sticker');
      saveUgcSettings();
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
}

export function initCanvasExporter() {
  $$('#ratio-seg button').forEach((b) =>
    b.addEventListener('click', () => {
      ugc.ratio = b.dataset.ratio;
      saveUgcSettings();
      $$('#ratio-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      drawCard();
    })
  );

  $('#btn-download')?.addEventListener('click', async () => {
    await downloadCardImage();
    const text = captionsFor()[ugc.caption];
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {}
    toast('Đã lưu ảnh vào máy và sao chép sẵn caption kèm hashtag!', 'ok', 'download-simple');
  });
}
