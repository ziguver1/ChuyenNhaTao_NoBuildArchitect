/**
 * Quản lý trạng thái lật sách và tiến trình đọc sách
 */
import { store } from '../../core/storage.js';
import { P } from './chapters.data.js';

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
