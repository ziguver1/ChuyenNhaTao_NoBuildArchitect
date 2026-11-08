/**
 * Dữ liệu 4 chương sách điện tử Chuyện Nhà Táo và cấu hình phân trang động
 */

export const CHAPTERS = [
  {
    id: 1,
    short: 'Mái ấm',
    title: 'Gìn giữ mái ấm và hòa thuận',
    meaning: 'Giữ ấm một mái nhà',
    icon: 'house-line',
    locked: false,
    badge: {
      name: 'Huy hiệu Mái Ấm',
      desc: 'Giữ lửa bằng sự lắng nghe và bao dung.',
      img: 'images/huychuong/huychuong2.webp'
    },
    // Danh sách 5 trang ảnh chương 1
    pages: [
      'images/sach/Trang1.webp',
      'images/sach/Trang2.webp',
      'images/sach/Trang3.webp',
      'images/sach/Trang4.webp',
      'images/sach/Trang5.webp'
    ]
  },
  {
    id: 2,
    short: 'Tôn kính',
    title: 'Thành kính và tôn kính cội nguồn',
    meaning: 'Trân trọng cội nguồn',
    icon: 'flower-lotus',
    locked: false,
    badge: {
      name: 'Huy hiệu Nhìn Lại',
      desc: 'Dám nhìn lại thật lòng mình để sống tốt hơn.',
      img: 'images/huychuong/huychuong1.webp'
    },
    // Danh sách 4 trang ảnh chương 2
    pages: [
      'images/sach/c2_trang1.webp',
      'images/sach/c2_trang2.webp',
      'images/sach/c2_trang3.webp',
      'images/sach/c2_trang4.webp'
    ]
  },
  {
    id: 3,
    short: 'Nhìn lại',
    title: 'Tự soi xét và nhìn lại bản thân',
    meaning: 'Nhìn lại chính mình',
    icon: 'sparkle',
    locked: false,
    badge: {
      name: 'Huy hiệu Tôn Kính',
      desc: 'Trân trọng cội nguồn và thành kính với tổ tiên.',
      img: 'images/huychuong/huychuong3.webp'
    },
    // Danh sách 5 trang ảnh chương 3
    pages: [
      'images/sach/c3_trang1.webp',
      'images/sach/c3_trang2.webp',
      'images/sach/c3_trang3.webp',
      'images/sach/c3_trang4.webp',
      'images/sach/c3_trang5.webp'
    ]
  },
  {
    id: 4,
    short: 'Hướng thiện',
    title: 'Khát vọng vươn lên và hướng thiện',
    meaning: 'Mang điều thiện đi tiếp',
    icon: 'fish',
    locked: false,
    badge: {
      name: 'Huy hiệu Hướng Thiện',
      desc: 'Mang tâm thiện và ước mong tốt đẹp đi tiếp sang năm mới.',
      img: 'images/huychuong/huychuong4.webp'
    },
    // Danh sách 5 trang ảnh chương 4
    pages: [
      'images/sach/c4_trang1.webp',
      'images/sach/c4_trang2.webp',
      'images/sach/c4_trang3.webp',
      'images/sach/c4_trang4.webp',
      'images/sach/c4_trang5.webp'
    ]
  }
];

export const ROMAN = ['I', 'II', 'III', 'IV'];

// Cấu trúc phân trang động (tự động tính dựa trên số trang ảnh của từng chương)
export const P = {
  cover: 0,
  intro: 1,
  toc: 2,
  art: (i) => CHAPTERS[i]?.startPage ?? 3,
  text: (i) => CHAPTERS[i]?.startPage ?? 3,
  game: (i) => CHAPTERS[i]?.badgePage ?? 8,
  badge: (i) => CHAPTERS[i]?.badgePage ?? 8,
  summary: 15,
  event: 16,
  back: 17,
  count: 18
};

/**
 * Tính toán chỉ số trang của từng chương và tổng số trang sách
 */
export function computePagination() {
  let cur = 3; // bắt đầu sau cover(0), intro(1), toc(2)
  CHAPTERS.forEach((c) => {
    c.startPage = cur;
    if (c.pages && c.pages.length > 0) {
      c.imagePages = c.pages.map((_, idx) => cur + idx);
      cur += c.pages.length;
      c.badgePage = cur;
      c.endPage = cur;
      cur += 1;
    } else {
      c.imagePages = [];
      c.lockedPage = cur;
      cur += 1;
      c.badgePage = cur;
      c.endPage = cur;
      cur += 1;
    }
  });

  P.summary = cur;
  P.event = cur + 1;
  P.back = cur + 2;
  P.count = cur + 3;
}

// Khởi chạy tính toán ngay khi module nạp
computePagination();

export const chapterOfPage = (p) => {
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    if (typeof c.startPage === 'number' && typeof c.endPage === 'number') {
      if (p >= c.startPage && p <= c.endPage) return i;
    }
  }
  return null;
};

export const folio = (n) => `<span class="pg-folio" aria-hidden="true">${n}</span>`;

export function pageLabel(p) {
  if (p === P.cover) return 'Bìa sách';
  if (p === P.back) return 'Bìa sau';
  const ch = chapterOfPage(p);
  if (ch !== null) {
    const c = CHAPTERS[ch];
    if (p === c.badgePage) return `Chương ${ROMAN[ch]}: ${c.short} · Huy hiệu`;
    if (c.locked) return `Chương ${ROMAN[ch]}: ${c.short} · Đang biên soạn`;
    const imgIdx = c.imagePages ? c.imagePages.indexOf(p) : -1;
    if (imgIdx >= 0) return `Chương ${ROMAN[ch]}: ${c.short} · Trang ${imgIdx + 1}/${c.pages.length}`;
    return `Chương ${ROMAN[ch]}: ${c.short}`;
  }
  const where = p <= P.toc ? (p === 1 ? 'Lời mở đầu' : 'Mục lục') : 'Tổng kết';
  return `${where} · Trang ${p}/${P.count - 2}`;
}
