/**
 * book-community.js
 * Quản lý tương tác cá chép và bình luận theo từng trang sách:
 * 1. Tùy chọn 4 icon cá chép (Mái Ấm, Tôn Kính, Nhìn Lại, Hướng Thiện) thay thế tim & lồng đèn.
 * 2. Hiệu ứng cá chép bơi lượn bay lên trời khi thả cảm xúc.
 * 3. Mỗi trang sách có lượt reaction và danh sách bình luận riêng biệt.
 * 4. Ở trang nhận huy chương: chỉ giữ lại nút chia sẻ.
 * 5. Ngăn kéo bình luận chuẩn Instagram (Bottom Sheet) + Smart Sync tên sang Thẻ Thông Hành.
 */
import { $, $$, esc } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { toast } from '../../core/toast.js';
import { getPass } from '../passport/passport.state.js?v=4.5';
import { CHAPTERS, P, chapterOfPage, pageLabel } from '../storybook/chapters.data.js';

// Danh mục 4 icon cá chép độc bản
export const REACTION_ICONS = {
  maiam: {
    id: 'maiam',
    name: 'Mái Ấm',
    desc: 'Bếp ấm sum họp',
    img: 'images/reaction/maiam.webp',
    color: '#e86a38'
  },
  tonkinh: {
    id: 'tonkinh',
    name: 'Tôn Kính',
    desc: 'Biết ơn cội nguồn',
    img: 'images/reaction/tonkinh.webp',
    color: '#c49742'
  },
  nhinlai: {
    id: 'nhinlai',
    name: 'Nhìn Lại',
    desc: 'Thấu hiểu bản thân',
    img: 'images/reaction/nhinlai.webp',
    color: '#2b8a9e'
  },
  huongthien: {
    id: 'huongthien',
    name: 'Hướng Thiện',
    desc: 'Gieo mầm điều lành',
    img: 'images/reaction/huongthien.webp',
    color: '#d93829'
  }
};

let currentReactionType = store.get('user_reaction', 'maiam');
let currentPageIndex = 3;
let currentPageKey = 'p_3';
let currentComments = [];

// Âm thanh chime nhẹ nhàng khi thả cảm xúc (Web Audio API)
let audioCtx = null;
function playReactChime() {
  try {
    const isMuted = store.get('sound_muted', false);
    if (isMuted) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {}
}

// Bảng tên chương
const CHAPTER_LABELS = {
  chung: { icon: '📖', name: 'Chung' },
  ch1: { icon: '🏠', name: 'Chương 1' },
  ch2: { icon: '🪷', name: 'Chương 2' },
  ch3: { icon: '✨', name: 'Chương 3' },
  ch4: { icon: '🔥', name: 'Chương 4' }
};

function timeAgo(ts) {
  if (!ts) return 'Vừa xong';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

const AVATAR_ICONS = ['🐟', '🌸', '🪷', '🧧', '⭐', '🍲', '🎋', '🎁'];
function getAvatarIcon(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_ICONS[Math.abs(hash) % AVATAR_ICONS.length];
}

// =========================================================================
// 1. ĐỒNG BỘ 2 CHIỀU TÊN / NICKNAME VỚI THẺ THÔNG HÀNH
// =========================================================================
export function getUserNickname() {
  const pass = getPass();
  if (pass && pass.nickname) return pass.nickname.trim();
  return (store.get('user_nickname', '') || '').trim();
}

export function setUserNickname(name) {
  const trimmed = (name || '').trim().slice(0, 24);
  if (!trimmed) return;
  store.set('user_nickname', trimmed);

  const myAv = $('#ig-my-avatar');
  if (myAv) myAv.textContent = getAvatarIcon(trimmed);

  const gbInput = $('#gb-name-input');
  if (gbInput && gbInput.value !== trimmed) gbInput.value = trimmed;

  const fNick = $('#f-nickname');
  if (fNick && fNick.value !== trimmed) fNick.value = trimmed;
}

function initNameSync() {
  const current = getUserNickname();
  const gbInput = $('#gb-name-input');
  const fNick = $('#f-nickname');
  const myAv = $('#ig-my-avatar');

  if (current) {
    if (gbInput && !gbInput.value) gbInput.value = current;
    if (fNick && !fNick.value) fNick.value = current;
    if (myAv) myAv.textContent = getAvatarIcon(current);
  }

  gbInput?.addEventListener('input', () => {
    const val = gbInput.value.trim();
    if (val) {
      store.set('user_nickname', val);
      if (fNick) fNick.value = val;
      if (myAv) myAv.textContent = getAvatarIcon(val);
    }
  });

  fNick?.addEventListener('input', () => {
    const val = fNick.value.trim();
    if (val) {
      store.set('user_nickname', val);
      if (gbInput) gbInput.value = val;
      if (myAv) myAv.textContent = getAvatarIcon(val);
    }
  });
}

// =========================================================================
// 2. THẢ CẢM XÚC CÁ CHÉP & BẢNG CHỌN 4 ICON (REACTION PICKER)
// =========================================================================
// Preload toàn bộ 4 icon cá chép vào RAM/GPU ngay lập tức để không bao giờ bị delay/lag hiển thị
function preloadReactionAssets() {
  Object.values(REACTION_ICONS).forEach((item) => {
    const img = new Image();
    img.src = item.img;
  });
}
preloadReactionAssets();

// Lấy ID tài khoản người dùng (từ Thẻ Thông Hành hoặc Visitor ID duy nhất)
export function getAccountId() {
  const pass = getPass();
  if (pass && pass.id) return pass.id;
  let vid = store.get('vid', null);
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    store.set('vid', vid);
  }
  return vid;
}

function updatePickerActiveItem(activeType) {
  const picker = $('#ig-reaction-picker');
  if (!picker) return;
  $$('.ig-picker-item', picker).forEach((el) => {
    const isSel = el.dataset.type === activeType;
    el.classList.toggle('is-selected', isSel);
    el.setAttribute('aria-selected', String(isSel));
  });
}

function triggerBigCarpPop(imgSrc, customPos = null) {
  let centerX = window.innerWidth / 2;
  let centerY = window.innerHeight / 2;

  if (customPos && typeof customPos.x === 'number' && typeof customPos.y === 'number') {
    centerX = customPos.x;
    centerY = customPos.y;
  } else {
    const stage = $('#flip-stage');
    if (stage) {
      const rect = stage.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      }
    }
  }

  // Dọn bớt nếu có pop cũ đang hiển thị để tránh tràn DOM khi spam nhiều lần
  const oldPops = document.querySelectorAll('.ig-big-carp-burst');
  if (oldPops.length >= 2) {
    oldPops[0].remove();
  }

  const burst = document.createElement('div');
  burst.className = 'ig-big-carp-burst';
  burst.style.left = `${centerX}px`;
  burst.style.top = `${centerY}px`;

  burst.innerHTML = `
    <div class="ig-big-carp-glow" aria-hidden="true"></div>
    <img src="${imgSrc}" alt="" width="124" height="124" draggable="false">
  `;

  document.body.appendChild(burst);

  burst.addEventListener('animationend', () => {
    burst.remove();
  }, { once: true });

  // Fallback dọn dẹp nếu animationend không kích hoạt
  setTimeout(() => {
    if (burst.parentNode) burst.remove();
  }, 950);
}

function createFloatingCarpParticle(originEl, imgSrc) {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const particle = document.createElement('div');
  particle.className = 'floating-carp-particle';
  const size = Math.floor(38 + Math.random() * 12);
  particle.innerHTML = `<img src="${imgSrc}" alt="carp" width="${size}" height="${size}" draggable="false">`;

  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const startX = rect.left + rect.width / 2 + scrollLeft + (Math.random() * 24 - 12);
  const startY = rect.top + scrollTop - 8;

  particle.style.left = `${startX}px`;
  particle.style.top = `${startY}px`;

  const driftX = (Math.random() * 70 - 35).toFixed(0);
  particle.style.setProperty('--drift-x', `${driftX}px`);

  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 1400);
}

export async function sendCarpReaction(type = currentReactionType, options = {}) {
  const iconData = REACTION_ICONS[type] || REACTION_ICONS.maiam;
  const uid = getAccountId();
  const pageReactions = store.get('user_page_reactions', {}) || {};
  const prevType = pageReactions[currentPageKey] || null;
  const isAlreadyReacted = Boolean(prevType);
  const isSwitch = Boolean(options.isExplicitSwitch || (isAlreadyReacted && prevType !== type));
  const isRepeatedTap = isAlreadyReacted && !isSwitch && prevType === type;

  // Luôn cập nhật icon hiển thị hiện tại & đồng bộ
  currentReactionType = type;
  store.set('user_reaction', type);
  const curImg = $('#ig-current-reaction-img');
  if (curImg) curImg.src = iconData.img;
  updatePickerActiveItem(type);

  // 1. Luôn kích hoạt hiệu ứng hình ảnh & âm thanh sống động (kể cả khi ấn nhiều lần liên tiếp)
  const btn = $('#btn-ig-reaction');
  triggerBigCarpPop(iconData.img, options.tapPos || null);
  createFloatingCarpParticle(btn, iconData.img);
  playReactChime();

  if (btn) {
    btn.classList.remove('is-tapping');
    void btn.offsetWidth;
    btn.classList.add('is-tapping');
    setTimeout(() => btn.classList.remove('is-tapping'), 300);
  }

  // 2. NẾU ẤN NHIỀU LẦN CÙNG 1 ICON: Giữ hiệu ứng bay lên nhưng KHÔNG ĐẾM, không gửi spam server
  if (isRepeatedTap) {
    return;
  }

  const countEl = $('#count-reactions');

  // 3. ĐỔI ICON QUA LẠI: Tổng số đếm trên trang GIỮ NGUYÊN (1 icon cũ đổi thành 1 icon mới)
  if (isSwitch) {
    pageReactions[currentPageKey] = type;
    store.set('user_page_reactions', pageReactions);
    btn?.classList.add('is-reacted');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          page: currentPageKey,
          type,
          oldType: prevType,
          uid,
          isSwitch: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.count && countEl) countEl.textContent = data.count;
      }
    } catch (err) {}
    return;
  }

  // 4. THẢ LẦN ĐẦU TIÊN TRÊN TRANG: Mỗi tài khoản được tính đúng 1 lượt đếm duy nhất
  pageReactions[currentPageKey] = type;
  store.set('user_page_reactions', pageReactions);
  btn?.classList.add('is-reacted');

  if (countEl) {
    const cur = Number(countEl.textContent || 0);
    countEl.textContent = cur + 1;
    countEl.classList.remove('count-pop');
    void countEl.offsetWidth;
    countEl.classList.add('count-pop');
  }

  try {
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'react',
        page: currentPageKey,
        type,
        uid,
        isSwitch: false
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.count && countEl) countEl.textContent = data.count;
    }
  } catch (err) {}
}

function initReactionPicker() {
  const picker = $('#ig-reaction-picker');
  const btn = $('#btn-ig-reaction');
  const wrap = $('#ig-reaction-wrap');
  if (!btn || !picker) return;

  // Khởi tạo icon ban đầu theo trang hiện tại (hoặc icon ưa thích)
  const pageReactions = store.get('user_page_reactions', {}) || {};
  const initialType = pageReactions[currentPageKey] || store.get('user_reaction', 'maiam');
  currentReactionType = initialType;
  const initialIcon = REACTION_ICONS[initialType] || REACTION_ICONS.maiam;
  const curImg = $('#ig-current-reaction-img');
  if (curImg) curImg.src = initialIcon.img;
  if (pageReactions[currentPageKey]) btn.classList.add('is-reacted');
  updatePickerActiveItem(initialType);

  function clearHoverStates() {
    picker.classList.remove('is-dragging');
    $$('.ig-picker-item', picker).forEach((el) => {
      el.classList.remove('is-hovered');
    });
  }

  function togglePicker(show) {
    const isHidden = picker.hidden;
    const next = typeof show === 'boolean' ? show : isHidden;
    picker.hidden = !next;
    btn.setAttribute('aria-expanded', String(next));
    if (next) {
      const pReacts = store.get('user_page_reactions', {}) || {};
      const actType = pReacts[currentPageKey] || currentReactionType;
      updatePickerActiveItem(actType);
    } else {
      clearHoverStates();
    }
  }

  // --- HIT-TEST: Xác định icon cá chép nào đang được ngón tay rà trúng ---
  function getHoveredItem(clientX, clientY) {
    const items = $$('.ig-picker-item', picker);
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      // Mở rộng vùng nhận diện (hit-padding) để ngón tay di chuyển tự nhiên
      if (
        clientX >= rect.left - 10 &&
        clientX <= rect.right + 10 &&
        clientY >= rect.top - 45 &&
        clientY <= rect.bottom + 30
      ) {
        return item;
      }
    }
    return null;
  }

  // --- A. CƠ CHẾ GIỮ & VUỐT CHỌN ICON KIỂU FACEBOOK TRÊN MOBILE ---
  let pressTimer = null;
  let isDragMode = false;
  let hoveredItem = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let didDragSelect = false;

  btn.addEventListener('touchstart', (e) => {
    // Ngăn chặn sự kiện chạm lan ra khung lật sách
    e.stopPropagation();
    didDragSelect = false;
    isDragMode = false;
    hoveredItem = null;

    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }

    clearTimeout(pressTimer);
    // Nhấn giữ 200ms kích hoạt bảng biểu tượng kèm haptic rung nhẹ
    pressTimer = setTimeout(() => {
      isDragMode = true;
      togglePicker(true);
      picker.classList.add('is-dragging');
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch (_) {}
      }
    }, 200);
  }, { passive: false });

  btn.addEventListener('touchmove', (e) => {
    // CHẶN TUYỆT ĐỐI KHÔNG CHO CUỘN HAY LẬT TRANG SÁCH KHI ĐANG THAO TÁC REACTION
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    if (!e.touches || !e.touches[0]) return;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const dy = clientY - touchStartY;
    const dx = Math.abs(clientX - touchStartX);

    // Vuốt lên trên (dy < -8px) hoặc di chuyển ngón tay: lập tức mở bảng picker mà không cần đợi hết 200ms
    if (!isDragMode && (dy < -8 || Math.hypot(dx, dy) > 14)) {
      clearTimeout(pressTimer);
      isDragMode = true;
      togglePicker(true);
      picker.classList.add('is-dragging');
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch (_) {}
      }
    }

    if (!isDragMode && picker.hidden) return;

    // Rà trúng icon cá chép nào theo toạ độ ngón tay (Facebook reaction style)
    const hit = getHoveredItem(clientX, clientY);
    if (hit !== hoveredItem) {
      if (hoveredItem) hoveredItem.classList.remove('is-hovered');
      hoveredItem = hit;
      if (hoveredItem) {
        hoveredItem.classList.add('is-hovered');
        if (navigator.vibrate) {
          try { navigator.vibrate(12); } catch (_) {}
        }
      }
    }
  }, { passive: false });

  btn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    clearTimeout(pressTimer);

    // Trường hợp 1: Ngón tay đang hover trên 1 icon -> Chọn ngay và bắn cảm xúc
    if (hoveredItem) {
      if (e.cancelable) e.preventDefault();
      const type = hoveredItem.dataset.type;
      didDragSelect = true;
      togglePicker(false);
      sendCarpReaction(type, { isExplicitSwitch: true });
      if (navigator.vibrate) {
        try { navigator.vibrate(22); } catch (_) {}
      }
      setTimeout(() => { didDragSelect = false; }, 350);
      return;
    }

    // Trường hợp 2: Bảng đang mở ở chế độ kéo thả (isDragMode)
    if (isDragMode) {
      if (e.cancelable) e.preventDefault();
      const elapsed = Date.now() - touchStartTime;
      const curTouch = e.changedTouches && e.changedTouches[0];
      const curX = curTouch ? curTouch.clientX : touchStartX;
      const curY = curTouch ? curTouch.clientY : touchStartY;
      const moveDist = Math.hypot(curX - touchStartX, curY - touchStartY);

      // Nếu chỉ chạm nhanh tại chỗ mà không trượt lên các icon
      if (elapsed < 240 && moveDist < 12) {
        togglePicker(false);
        const pageReacts = store.get('user_page_reactions', {}) || {};
        const type = pageReacts[currentPageKey] || currentReactionType;
        sendCarpReaction(type);
      } else {
        // Đã trượt ra ngoài: huỷ chọn
        togglePicker(false);
      }
      didDragSelect = true;
      setTimeout(() => { didDragSelect = false; }, 350);
      return;
    }
  }, { passive: false });

  btn.addEventListener('touchcancel', () => {
    clearTimeout(pressTimer);
    togglePicker(false);
    clearHoverStates();
    isDragMode = false;
    hoveredItem = null;
  });

  // --- B. XỬ LÝ CLICK CHUỘT / TAP NHANH ---
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (didDragSelect) {
      didDragSelect = false;
      return;
    }
    if (!picker.hidden) {
      togglePicker(false);
      return;
    }
    const pageReacts = store.get('user_page_reactions', {}) || {};
    const type = pageReacts[currentPageKey] || currentReactionType;
    sendCarpReaction(type);
  });

  // --- C. DESKTOP HOVER & MOUSE SUPPORT ---
  let hoverTimer = null;
  wrap?.addEventListener('mouseenter', () => {
    if (window.matchMedia('(hover: hover)').matches) {
      hoverTimer = setTimeout(() => togglePicker(true), 240);
    }
  });
  wrap?.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    togglePicker(false);
  });

  // --- D. CHỌN TRỰC TIẾP TRÊN BẢNG CHỌN (KHI CLICK BẰNG CHUỘT HOẶC TAP BÌNH THƯỜNG) ---
  $$('.ig-picker-item', picker).forEach((item) => {
    const handlePick = (e) => {
      e.stopPropagation();
      const type = item.dataset.type;
      togglePicker(false);
      sendCarpReaction(type, { isExplicitSwitch: true });
    };
    item.addEventListener('click', handlePick);
  });

  // Ngăn chặn triệt để mọi sự kiện chạm từ thanh tương tác lan ra khung lật sách
  const actionsBar = $('#ig-book-actions');
  const guardActions = (el) => {
    if (!el) return;
    const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'mousedown'];
    events.forEach((evt) => {
      el.addEventListener(evt, (e) => {
        e.stopPropagation();
      }, { passive: false });
    });
  };
  guardActions(actionsBar);
  guardActions(picker);

  // Đóng khi click/touch ra ngoài thanh tương tác
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ig-book-actions')) {
      togglePicker(false);
    }
  });

  // --- D. DOUBLE-TAP TRÊN SÁCH ĐỂ THẢ CÁ CHÉP ---
  const stage = $('#flip-stage');
  let lastTapTime = 0;
  let lastTapPos = null;

  const isNoReactionPage = () => (
    currentPageIndex === P.cover ||
    currentPageIndex === P.intro ||
    currentPageIndex === P.toc ||
    currentPageIndex === P.summary ||
    currentPageIndex === P.event ||
    currentPageIndex === P.back ||
    CHAPTERS.some((c) => c.badgePage === currentPageIndex)
  );

  stage?.addEventListener('touchend', (e) => {
    if (e.target.closest('#ig-book-actions') || e.target.closest('.flip-controls') || e.target.closest('#ig-comment-sheet')) return;
    if (isNoReactionPage()) return;
    const now = Date.now();
    const touch = e.changedTouches && e.changedTouches[0];
    const tapPos = touch ? { x: touch.clientX, y: touch.clientY } : null;

    if (now - lastTapTime < 350 && tapPos && lastTapPos) {
      const dist = Math.hypot(tapPos.x - lastTapPos.x, tapPos.y - lastTapPos.y);
      if (dist < 60) {
        if (e.cancelable) e.preventDefault();
        const pReacts = store.get('user_page_reactions', {}) || {};
        const type = pReacts[currentPageKey] || currentReactionType;
        sendCarpReaction(type, { tapPos });
        lastTapTime = 0;
        lastTapPos = null;
        return;
      }
    }
    lastTapTime = now;
    lastTapPos = tapPos;
  });

  stage?.addEventListener('dblclick', (e) => {
    if (e.target.closest('#ig-book-actions') || e.target.closest('.flip-controls') || e.target.closest('#ig-comment-sheet')) return;
    if (isNoReactionPage()) return;
    const pReacts = store.get('user_page_reactions', {}) || {};
    const type = pReacts[currentPageKey] || currentReactionType;
    sendCarpReaction(type, { tapPos: { x: e.clientX, y: e.clientY } });
  });
}

// =========================================================================
// 3. SỰ KIỆN CHUYỂN TRANG SÁCH & ĐIỀU CHỈNH THEO TRANG HUY CHƯƠNG / MỤC LỤC / LỜI MỞ ĐẦU
// =========================================================================
export function onFlipbookPageChanged(pageIndex) {
  currentPageIndex = pageIndex;
  currentPageKey = `p_${pageIndex}`;

  const actionsBar = $('#ig-book-actions');
  const isBadge = CHAPTERS.some((c) => c.badgePage === pageIndex);
  const isSpecialNonStory =
    pageIndex === P.cover ||
    pageIndex === P.intro ||
    pageIndex === P.toc ||
    pageIndex === P.summary ||
    pageIndex === P.event ||
    pageIndex === P.back;
  const isShareOnly = isBadge || isSpecialNonStory;

  // Đóng bảng reaction picker nếu đang mở khi chuyển trang
  const picker = $('#ig-reaction-picker');
  if (picker) picker.hidden = true;

  // Ở trang bìa, nhận huy chương, lời mở đầu, mục lục hoặc tổng kết: chỉ giữ lại nút chia sẻ
  if (actionsBar) {
    actionsBar.classList.toggle('is-badge-page', isBadge);
    actionsBar.classList.toggle('is-share-only', isShareOnly);
  }

  // Nếu là trang đặc biệt (Bìa, Lời mở đầu, Mục lục, v.v.): ẩn hoàn toàn cảm xúc và bình luận, không tải dữ liệu
  if (isSpecialNonStory) {
    return;
  }

  // Cập nhật trạng thái reaction của trang mới
  const pageReactions = store.get('user_page_reactions', {}) || {};
  const pageReact = pageReactions[currentPageKey];
  const btn = $('#btn-ig-reaction');
  const curImg = $('#ig-current-reaction-img');

  if (pageReact && REACTION_ICONS[pageReact]) {
    currentReactionType = pageReact;
    if (curImg) curImg.src = REACTION_ICONS[pageReact].img;
    btn?.classList.add('is-reacted');
    updatePickerActiveItem(pageReact);
  } else {
    // Chưa react trên trang này: hiển thị icon ưa thích
    const favType = store.get('user_reaction', 'maiam');
    currentReactionType = favType;
    if (curImg && REACTION_ICONS[favType]) curImg.src = REACTION_ICONS[favType].img;
    btn?.classList.remove('is-reacted');
    updatePickerActiveItem(favType);
  }

  // Cập nhật tiêu đề trang trong Bottom Sheet
  const curPageLabel = pageLabel(pageIndex);
  const sheetTitle = $('#ig-sheet-title');
  if (sheetTitle) {
    sheetTitle.innerHTML = `Bình luận <span class="ig-page-badge">${curPageLabel}</span> (<span id="ig-sheet-count">0</span>)`;
  }
  const pagePillText = $('#gb-page-pill-text');
  if (pagePillText) {
    pagePillText.textContent = curPageLabel;
  }

  // Tải dữ liệu riêng của trang này
  fetchPageCommunityData(currentPageKey);
}

// =========================================================================
// 4. INSTAGRAM COMMENT BOTTOM SHEET (DRAWER)
// =========================================================================
function openCommentSheet() {
  const sheet = $('#ig-comment-sheet');
  const backdrop = $('#ig-sheet-backdrop');
  if (!sheet || !backdrop) return;

  const name = getUserNickname();
  const nameInput = $('#gb-name-input');
  if (nameInput && !nameInput.value && name) nameInput.value = name;

  const myAv = $('#ig-my-avatar');
  if (myAv) myAv.textContent = getAvatarIcon(name || 'Bạn đọc');

  backdrop.hidden = false;
  sheet.hidden = false;
  backdrop.setAttribute('aria-hidden', 'false');
  sheet.setAttribute('aria-hidden', 'false');

  void sheet.offsetWidth;
  backdrop.classList.add('is-open');
  sheet.classList.add('is-open');
  document.body.classList.add('sheet-locked');

  setTimeout(() => {
    $('#gb-content-input')?.focus();
  }, 350);
}

function closeCommentSheet() {
  const sheet = $('#ig-comment-sheet');
  const backdrop = $('#ig-sheet-backdrop');
  if (!sheet || !backdrop) return;

  sheet.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.body.classList.remove('sheet-locked');

  setTimeout(() => {
    sheet.hidden = true;
    backdrop.hidden = true;
    sheet.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
  }, 280);
}

function renderCommentItem(c, isNew = false) {
  const avatar = getAvatarIcon(c.name);
  const safeName = esc(c.name || 'Bạn đọc');
  const safeContent = esc(c.content || '');
  const timeStr = timeAgo(c.ts);

  const row = document.createElement('div');
  row.className = `ig-comment-row ${isNew ? 'ig-row-new' : ''}`;
  row.id = `ig-c-${c.id || Math.random().toString(36).slice(2)}`;
  row.innerHTML = `
    <div class="ig-c-avatar" aria-hidden="true">${avatar}</div>
    <div class="ig-c-body">
      <div class="ig-c-meta-top">
        <span class="ig-c-username">${safeName}</span>
      </div>
      <div class="ig-c-text">${safeContent}</div>
      <div class="ig-c-meta-bottom">
        <time class="ig-c-time">${timeStr}</time>
        <button class="ig-c-like-btn" type="button" aria-label="Thích bình luận">
          <i class="ph-fill ph-heart"></i>
          <span class="ig-c-likes-count">${c.likes || ''}</span>
        </button>
      </div>
    </div>
  `;

  const likeBtn = row.querySelector('.ig-c-like-btn');
  likeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    likeBtn.classList.toggle('is-liked');
    const countSpan = likeBtn.querySelector('.ig-c-likes-count');
    if (countSpan) {
      let num = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = likeBtn.classList.contains('is-liked') ? num + 1 : num > 0 ? num - 1 : '';
    }
  });

  return row;
}

function updateCommentsCount(total) {
  if ($('#count-comments')) $('#count-comments').textContent = total;
  if ($('#ig-sheet-count')) $('#ig-sheet-count').textContent = total;
}

function renderCommentList(comments) {
  const listEl = $('#ig-feed-list');
  if (!listEl) return;

  if (!comments || comments.length === 0) {
    listEl.innerHTML = `
      <div class="ig-empty-box">
        <img src="images/reaction/maiam.webp" alt="" width="56" height="56" class="ig-empty-carp">
        <p class="ig-empty-title">Chưa có bình luận cho trang này</p>
        <p class="ig-empty-sub">Hãy là người đầu tiên để lại cảm nghĩ nhé!</p>
      </div>
    `;
    updateCommentsCount(0);
    return;
  }

  listEl.innerHTML = '';
  comments.forEach((c) => {
    listEl.appendChild(renderCommentItem(c));
  });

  updateCommentsCount(comments.length);
}

async function fetchPageCommunityData(pageKey) {
  const uid = getAccountId();
  try {
    const res = await fetch(`/api/community?page=${encodeURIComponent(pageKey)}&uid=${encodeURIComponent(uid)}`);
    if (!res.ok) throw new Error('Fetch page community failed');
    const data = await res.json();

    if (data.reactions) {
      const countEl = $('#count-reactions');
      if (countEl) countEl.textContent = data.reactions.total || 0;
    }

    // Nếu server có ghi nhận reaction của user trên trang này -> đồng bộ trạng thái
    if (data.userReaction && REACTION_ICONS[data.userReaction]) {
      const pageReactions = store.get('user_page_reactions', {}) || {};
      pageReactions[pageKey] = data.userReaction;
      store.set('user_page_reactions', pageReactions);

      if (currentPageKey === pageKey) {
        currentReactionType = data.userReaction;
        const curImg = $('#ig-current-reaction-img');
        if (curImg) curImg.src = REACTION_ICONS[data.userReaction].img;
        $('#btn-ig-reaction')?.classList.add('is-reacted');
        updatePickerActiveItem(data.userReaction);
      }
    }

    if (Array.isArray(data.comments)) {
      currentComments = data.comments;
      renderCommentList(currentComments);
    }
  } catch (err) {
    const fallbackList = store.get(`offline_comm_${pageKey}`, []);
    currentComments = fallbackList;
    renderCommentList(currentComments);
    const countEl = $('#count-reactions');
    const pReacts = store.get('user_page_reactions', {}) || {};
    if (countEl) countEl.textContent = pReacts[pageKey] ? 1 : 0;
  }
}

function initCommentForm() {
  const form = $('#gb-comment-form');
  const nameInput = $('#gb-name-input');
  const contentInput = $('#gb-content-input');
  const submitBtn = $('#gb-submit-btn');

  contentInput?.addEventListener('input', () => {
    const val = contentInput.value.trim();
    if (submitBtn) submitBtn.disabled = val.length === 0;
    contentInput.style.height = 'auto';
    contentInput.style.height = Math.min(contentInput.scrollHeight, 80) + 'px';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawContent = (contentInput?.value || '').trim();
    if (!rawContent || rawContent.length < 2) {
      toast('Vui lòng viết vài dòng cảm nghĩ của bạn nhé!');
      contentInput?.focus();
      return;
    }

    let name = (nameInput?.value || '').trim();
    if (!name) {
      name = 'Bạn đọc';
    } else {
      setUserNickname(name);
    }

    const ch = chapterOfPage(currentPageIndex);
    const chapter = ch !== null ? `ch${ch + 1}` : 'chung';
    const newComment = {
      id: 'local_' + Date.now().toString(36),
      page: currentPageKey,
      name,
      content: rawContent,
      chapter,
      ts: Date.now(),
      likes: 0
    };

    const listEl = $('#ig-feed-list');
    const emptyBox = listEl?.querySelector('.ig-empty-box');
    if (emptyBox) emptyBox.remove();

    if (listEl) {
      const itemEl = renderCommentItem(newComment, true);
      listEl.insertBefore(itemEl, listEl.firstChild);
      listEl.scrollTop = 0;
    }

    currentComments.unshift(newComment);
    updateCommentsCount(currentComments.length);

    if (contentInput) {
      contentInput.value = '';
      contentInput.style.height = 'auto';
    }
    if (submitBtn) submitBtn.disabled = true;

    playReactChime();
    toast('Đã đăng bình luận của bạn! ✨');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          page: currentPageKey,
          name,
          content: rawContent,
          chapter
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comment && data.comment.id) {
          newComment.id = data.comment.id;
        }
      }
    } catch (err) {
      const saved = store.get(`offline_comm_${currentPageKey}`, []);
      saved.unshift(newComment);
      store.set(`offline_comm_${currentPageKey}`, saved.slice(0, 30));
    }
  });

  $('#btn-ig-comment')?.addEventListener('click', openCommentSheet);
  $('#ig-sheet-close')?.addEventListener('click', closeCommentSheet);
  $('#ig-sheet-backdrop')?.addEventListener('click', closeCommentSheet);

  const handle = $('#ig-sheet-handle');
  let startY = 0;
  handle?.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  handle?.addEventListener('touchmove', (e) => {
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 60) closeCommentSheet();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommentSheet();
  });
}

// =========================================================================
// 5. CHIA SẺ SÁCH (SHARE MODAL & WEB SHARE)
// =========================================================================
function initShare() {
  const shareModal = $('#share-modal');
  const btnOpen = $('#btn-ig-share');
  const btnClose = $('#share-modal-close');
  const inputLink = $('#share-link-input');
  const btnCopy = $('#btn-share-copy');
  const btnFb = $('#btn-share-fb');
  const btnZalo = $('#btn-share-zalo');
  const btnNative = $('#btn-share-native');

  const shareTitle = 'Chuyện Nhà Táo · Sách Tương Tác Đêm 23';
  const shareText = 'Cùng mình đọc cuốn sách Chuyện Nhà Táo và nhận Thẻ Thông Hành O2O nhé!';

  function recordShare(channel) {
    const page = currentPageKey;
    const uid = getAccountId();

    // Lưu vào local cache để hỗ trợ offline & test
    try {
      const s = store.get('cnt_shares', { total: 0, channels: {}, pages: {} }) || {};
      s.total = (s.total || 0) + 1;
      s.channels = s.channels || {};
      s.channels[channel] = (s.channels[channel] || 0) + 1;
      s.pages = s.pages || {};
      s.pages[page] = (s.pages[page] || 0) + 1;
      store.set('cnt_shares', s);
    } catch (e) {}

    // Gửi lên máy chủ
    try {
      fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share', channel, page, uid })
      }).catch(() => {});
    } catch (e) {}
  }

  function getShareUrl() {
    return window.location.origin + window.location.pathname;
  }

  function openModal() {
    if (!shareModal) return;
    const url = getShareUrl();
    if (inputLink) inputLink.value = url;
    if (navigator.share && btnNative) btnNative.hidden = false;

    shareModal.hidden = false;
    shareModal.setAttribute('aria-hidden', 'false');
    shareModal.classList.add('is-open');
  }

  function closeModal() {
    if (!shareModal) return;
    shareModal.classList.remove('is-open');
    setTimeout(() => {
      shareModal.hidden = true;
      shareModal.setAttribute('aria-hidden', 'true');
    }, 200);
  }

  btnOpen?.addEventListener('click', () => {
    if (navigator.share && window.innerWidth <= 768) {
      recordShare('mobile');
      navigator.share({ title: shareTitle, text: shareText, url: getShareUrl() }).catch(() => {});
      return;
    }
    openModal();
  });

  btnClose?.addEventListener('click', closeModal);
  shareModal?.addEventListener('click', (e) => {
    if (e.target === shareModal) closeModal();
  });

  btnCopy?.addEventListener('click', async () => {
    const url = getShareUrl();
    recordShare('web');
    try {
      await navigator.clipboard.writeText(url);
      toast('Đã sao chép liên kết vào bộ nhớ tạm! 📋');
    } catch (e) {
      if (inputLink) {
        inputLink.select();
        document.execCommand('copy');
        toast('Đã sao chép liên kết! 📋');
      }
    }
  });

  btnFb?.addEventListener('click', () => {
    recordShare('web');
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400');
  });

  btnZalo?.addEventListener('click', () => {
    recordShare('web');
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://zalo.me/share?url=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400');
  });

  btnNative?.addEventListener('click', () => {
    if (navigator.share) {
      recordShare('mobile');
      navigator.share({ title: shareTitle, text: shareText, url: getShareUrl() });
    }
  });
}

// =========================================================================
// KHỞI TẠO TỔNG THỂ
// =========================================================================
export function initBookCommunity() {
  initNameSync();
  initReactionPicker();
  initCommentForm();
  initShare();
  onFlipbookPageChanged(currentPageIndex);
}
