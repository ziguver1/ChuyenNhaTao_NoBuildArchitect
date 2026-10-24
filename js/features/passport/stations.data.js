/**
 * Hằng số cấu hình 4 Trạm trải nghiệm và Thẻ thông hành (Passport O2O)
 */

export const STATIONS = [
  { id: 1, name: 'Trạm Tôn Kính', code: 'TONKI1', altCodes: ['HUONG1', 'NEPNH3'] },
  { id: 2, name: 'Trạm Mái Ấm', code: 'MAIAM2' },
  { id: 3, name: 'Trạm Nhìn Lại', code: 'NHINL3' },
  { id: 4, name: 'Trạm Hướng Thiện', code: 'HUONG4', altCodes: ['TOTLA4'] }
];

export const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0/O, 1/I/L)

export const randCode = (n) =>
  Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

export const GATE_CODE = 'CONG23';

export const PP = {
  cover: 0,
  data: 1,
  guide: 2,
  visa: (id) => 2 + id,
  done: 7,
  notes: 8,
  back: 9,
  count: 10
};

export const ROMAN_ST = ['I', 'II', 'III', 'IV'];

export const STAMP_STYLE = {
  1: { shape: 'circle', ink: '#b3261e', short: 'TÔN KÍNH', rot: -13, x: 14, y: 6 },
  2: { shape: 'rect', ink: '#1f4e8c', short: 'MÁI ẤM', rot: 7, x: -10, y: 18 },
  3: { shape: 'octagon', ink: '#2e6b3f', short: 'NHÌN LẠI', rot: -5, x: 6, y: -6 },
  4: { shape: 'oval', ink: '#6a2c8a', short: 'HƯỚNG THIỆN', rot: 11, x: -8, y: 10 }
};

export const VISA_TEXT = {
  1: 'Thành kính và trân trọng nếp nhà. Nhớ điều cội nguồn, ông bà trao lại.',
  2: 'Gìn giữ mái ấm và hòa thuận. Giữ lửa bằng lắng nghe và bao dung.',
  3: 'Tự soi xét và nhìn lại bản thân. Trung thực với chính mình để sống tử tế hơn.',
  4: 'Khát vọng vươn lên và hướng thiện. Gieo điều lành, mang tâm thiện đi tiếp sang năm mới.'
};

