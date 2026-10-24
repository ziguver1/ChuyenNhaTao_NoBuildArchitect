/**
 * Dữ liệu cấu hình cho Chuyện Nhà Đêm 23 (UGC Year in Values)
 */

export const VALUES = [
  {
    name: 'Tôn Kính',
    icon: 'flower-lotus',
    lines: [
      'Giữ nén hương ông bà vẫn thắp mỗi chiều cuối năm.',
      'Trân trọng nếp nhà và cội nguồn tổ tiên.',
      'Kính trên nhường dưới, khắc ghi điều ông bà dạy.'
    ]
  },
  {
    name: 'Mái Ấm',
    icon: 'bowl-food',
    lines: [
      'Bữa cơm nào cũng có người chờ nhau về.',
      'Nói với nhau nhẹ nhàng hơn một chút.',
      'Nhường nhau một bước để nhà luôn ấm.'
    ]
  },
  {
    name: 'Nhìn Lại',
    icon: 'sparkle',
    lines: [
      'Tự nhìn lại bản thân một năm qua bằng sự thật lòng.',
      'Năm nay nhà mình dám nhận lỗi và sửa sai.',
      'Soi xét chính mình để sống tử tế và bao dung hơn.'
    ]
  },
  {
    name: 'Hướng Thiện',
    icon: 'fire',
    lines: [
      'Gieo thêm việc thiện, lan tỏa điều lành cho người quanh mình.',
      'Khát vọng vươn lên, sống hướng thiện mỗi ngày.',
      'Mang tâm thiện và điều tốt lành đi tiếp sang năm mới.'
    ]
  }
];


export const FRAME_CONFIG = {
  '1': {
    id: '1',
    name: 'Khung 1: Xanh Dương',
    tag: 'Pastel Sky',
    src: 'images/chuyendem23/khungnoidung/1.webp',
    ink: '#1c3558',
    inkMuted: '#365784'
  },
  '2': {
    id: '2',
    name: 'Khung 2: Xanh Cốm',
    tag: 'Pastel Mint',
    src: 'images/chuyendem23/khungnoidung/2.webp',
    ink: '#163830',
    inkMuted: '#35675b'
  },
  '3': {
    id: '3',
    name: 'Khung 3: Kem Cổ Điển',
    tag: 'Vintage Sepia',
    src: 'images/chuyendem23/khungnoidung/3.webp',
    ink: '#422312',
    inkMuted: '#8b5035'
  },
  '4': {
    id: '4',
    name: 'Khung 4: Tím Mộng Mơ',
    tag: 'Pastel Lavender',
    src: 'images/chuyendem23/khungnoidung/4.webp',
    ink: '#2e1948',
    inkMuted: '#61417e'
  },
  '5': {
    id: '5',
    name: 'Khung 5: Hồng Phấn',
    tag: 'Pastel Pink',
    src: 'images/chuyendem23/khungnoidung/5.webp',
    ink: '#3b1232',
    inkMuted: '#642557'
  }
};

export const COLOR_PRESETS = [
  { name: 'Vàng Chanh & Xanh Tiffany', bg: '#faeb77', dot: '#4ec5cb' },
  { name: 'Xanh Tiffany & Vàng Chanh', bg: '#4ec5cb', dot: '#faeb77' },
  { name: 'Hồng Phấn & Tím Mận', bg: '#f9d2de', dot: '#70224d' },
  { name: 'Kem Dó & Rêu Xanh', bg: '#fbf4e2', dot: '#2d6046' },
  { name: 'Tím Tử Đinh Hương & Nho', bg: '#e4d2f5', dot: '#531b78' },
  { name: 'Đỏ Son & Vàng Kim', bg: '#bf3322', dot: '#f7ca48' },
  { name: 'Trời Đêm & Vàng Sao', bg: '#18192a', dot: '#ffd166' }
];

// 16 Sticker Trang trí Tết (8 Cá Chép, 8 Hoa Sen)
export const STICKER_CATALOG = [
  { id: 'cachep1', name: 'Cá Chép 1', tag: 'Vượt Vũ Môn', category: 'fish', src: 'images/chuyendem23/sticker/cachep1.webp' },
  { id: 'cachep2', name: 'Cá Chép 2', tag: 'Vẫy Đuôi', category: 'fish', src: 'images/chuyendem23/sticker/cachep2.webp' },
  { id: 'cachep3', name: 'Cá Chép 3', tag: 'Cá Vàng', category: 'fish', src: 'images/chuyendem23/sticker/cachep3.webp' },
  { id: 'cachep4', name: 'Cá Chép 4', tag: 'Trông Trăng', category: 'fish', src: 'images/chuyendem23/sticker/cachep4.webp' },
  { id: 'cachep5', name: 'Cá Chép 5', tag: 'Tài Lộc', category: 'fish', src: 'images/chuyendem23/sticker/cachep5.webp' },
  { id: 'cachep6', name: 'Cá Chép 6', tag: 'Bay Lượn', category: 'fish', src: 'images/chuyendem23/sticker/cachep6.webp' },
  { id: 'cachep7', name: 'Cá Chép 7', tag: 'Nghinh Xuân', category: 'fish', src: 'images/chuyendem23/sticker/cachep7.webp' },
  { id: 'cachep8', name: 'Cá Chép 8', tag: 'Đại Cát', category: 'fish', src: 'images/chuyendem23/sticker/cachep8.webp' },
  { id: 'hoasen1', name: 'Hoa Sen 1', tag: 'Nở Rộ', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen1.webp' },
  { id: 'hoasen2', name: 'Hoa Sen 2', tag: 'Búp Sen', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen2.webp' },
  { id: 'hoasen3', name: 'Hoa Sen 3', tag: 'Thanh Khiết', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen3.webp' },
  { id: 'hoasen4', name: 'Hoa Sen 4', tag: 'Cánh Sen', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen4.webp' },
  { id: 'hoasen5', name: 'Hoa Sen 5', tag: 'Duyên Dáng', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen5.webp' },
  { id: 'hoasen6', name: 'Hoa Sen 6', tag: 'Nụ Sen', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen6.webp' },
  { id: 'hoasen7', name: 'Hoa Sen 7', tag: 'Hồng Phúc', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen7.webp' },
  { id: 'hoasen8', name: 'Hoa Sen 8', tag: 'Viên Mãn', category: 'lotus', src: 'images/chuyendem23/sticker/hoasen8.webp' }
];


export const STICKER_DEFAULT_SLOTS = [
  { relX: 0.88, relY: 0.08, relScale: 0.22, rot: 14 },
  { relX: 0.12, relY: 0.94, relScale: 0.2, rot: -12 },
  { relX: 0.88, relY: 0.92, relScale: 0.2, rot: 8 },
  { relX: 0.1, relY: 0.08, relScale: 0.19, rot: -15 },
  { relX: 0.89, relY: 0.52, relScale: 0.2, rot: 10 },
  { relX: 0.11, relY: 0.52, relScale: 0.2, rot: -8 },
  { relX: 0.5, relY: 0.95, relScale: 0.18, rot: 0 },
  { relX: 0.8, relY: 0.16, relScale: 0.19, rot: 6 }
];
