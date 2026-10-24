/**
 * Quản lý trạng thái tùy chỉnh của Chuyện Nhà Đêm 23 (UGC State)
 */
import { store } from '../../core/storage.js';
import { VALUES } from './values.data.js';

export const letter = Object.assign(
  { picks: [0, 0, 0, 0], custom: ['', '', '', ''] },
  store.get('letter', {})
);

export const ugc = Object.assign(
  {
    ratio: '1:1',
    caption: 0,
    frame: '1',
    bgColor: '#faeb77',
    dotColor: '#4ec5cb',
    stickers: []
  },
  store.get('ugc_settings', {})
);

if (!Array.isArray(ugc.stickers)) ugc.stickers = [];

export const saveUgcSettings = () =>
  store.set('ugc_settings', {
    ratio: ugc.ratio,
    frame: ugc.frame,
    bgColor: ugc.bgColor,
    dotColor: ugc.dotColor,
    caption: ugc.caption,
    stickers: ugc.stickers
  });

export const lineOf = (k) =>
  (letter.custom[k] || '').trim() || VALUES[k].lines[letter.picks[k] % VALUES[k].lines.length];

export const saveLetter = () => store.set('letter', letter);
