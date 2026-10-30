/**
 * Quản lý trạng thái lật sách và tiến trình đọc sách
 */
import { store } from '../../core/storage.js';
import { P } from './chapters.data.js';

// Phiên bản dữ liệu sách mới: Chương 1 là Mái Ấm (5 trang truyện tranh WebP)
const STORYBOOK_VERSION = 'v2_comic_mai_am_badge';

// Tự động làm mới nếu người dùng còn lưu cache phiên bản cũ, đảm bảo mở khóa Huy hiệu Mái Ấm chính xác
if (store.get('storybook_ver') !== STORYBOOK_VERSION) {
  store.set('storybook_ver', STORYBOOK_VERSION);
  store.set('chapters_done', []);
  store.set('chapter', 0);
  store.set('page', 0);
}

export const book = {
  idx: Math.min(store.get('chapter', 0), 3),
  page: Math.min(Math.max(store.get('page', 0), 0), P.count - 1),
  done: new Set(store.get('chapters_done', [])),
  started: new Set(),
  flip: null
};

export function saveBookProgress() {
  store.set('chapter', book.idx);
  store.set('page', book.page);
  store.set('chapters_done', [...book.done]);
}
