/**
 * Quản lý trạng thái Thẻ thông hành (Passport State) và Server sync state
 */
import { store } from '../../core/storage.js';

let currentPass = store.get('pass', null);

export function getPass() {
  return currentPass;
}

export function setPass(newPass) {
  currentPass = newPass;
  if (newPass) {
    store.set('pass', newPass);
  } else {
    try {
      localStorage.removeItem('cnt_pass');
    } catch (e) {}
  }
}

export const server = {
  on: false,
  busy: false,
  timer: 0,
  inView: false
};

export const MOMENT_SLOTS = ['1', '2', '3', '4', 'x1', 'x2'];
export let moments = store.get('moments', {});

export const momentCount = () => MOMENT_SLOTS.filter((k) => moments[k]).length;

export function saveMoments() {
  try {
    localStorage.setItem('cnt_moments', JSON.stringify(moments));
    return true;
  } catch (e) {
    return false;
  }
}

export function savePassToHistory(p) {
  if (!p || !p.id) return;
  try {
    const history = store.get('saved_passes', []);
    const idx = history.findIndex(
      (x) => x && (x.id === p.id || (p.offlineId && x.offlineId === p.offlineId))
    );
    if (idx >= 0) history[idx] = Object.assign({}, history[idx], p);
    else history.unshift(p);
    store.set('saved_passes', history.slice(0, 10));
  } catch (e) {
    /* ignore */
  }
}
