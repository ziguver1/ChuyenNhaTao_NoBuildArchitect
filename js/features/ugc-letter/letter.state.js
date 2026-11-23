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
    pattern: 'dots',
    starSeed: 42,
    stickers: []
  },
  store.get('ugc_settings', {})
);

if (!Array.isArray(ugc.stickers)) ugc.stickers = [];
if (!ugc.pattern) ugc.pattern = 'dots';
if (!ugc.starSeed) ugc.starSeed = 42;

export const saveUgcSettings = () =>
  store.set('ugc_settings', {
    ratio: ugc.ratio,
    frame: ugc.frame,
    bgColor: ugc.bgColor,
    dotColor: ugc.dotColor,
    pattern: ugc.pattern,
    starSeed: ugc.starSeed,
    caption: ugc.caption,
    stickers: ugc.stickers
  });

export const lineOf = (k) =>
  (letter.custom[k] || '').trim() || VALUES[k].lines[letter.picks[k] % VALUES[k].lines.length];

export const saveLetter = () => store.set('letter', letter);
