/**
 * Dịch vụ giao tiếp API máy chủ cho thẻ thông hành (/api/pass, polling, đóng dấu, đồng bộ)
 */
import { $, $$ } from '../../core/dom.js';
import { store } from '../../core/storage.js';
import { ask } from '../../core/dialog.js';
import { toast } from '../../core/toast.js';
import { track } from '../../analytics/tracker.js';
import { measure, meter } from '../../analytics/meter.js';
import { plain, esc } from '../../core/dom.js';
import { reduceMotion } from '../../core/motion.js';
import { STATIONS, GATE_CODE, PP, randCode } from './stations.data.js';
import {
  getPass,
  setPass,
  server,
  savePassToHistory
} from './passport.state.js';

let uiCallbacks = {
  renderTicket: (animate) => {},
  renderRegister: () => {},
  renderCheckout: () => {},
  ppRefresh: (pages) => {},
  ppGo: (p) => {},
  doStamp: (id, ts, fromServer) => {}
};

export function setPassportServiceCallbacks(callbacks) {
  uiCallbacks = Object.assign(uiCallbacks, callbacks);
}

export const isJson = (r) => (r.headers.get('content-type') || '').includes('json');

export function setServer(on) {
  if (server.on === on) return;
  server.on = on;
  const fc = $('#form-code'),
    fo = $('#form-otp'),
    hint = $('#pp-staff-hint');
  if (fc) fc.hidden = on;
  if (fo) fo.hidden = !on;
  if (hint) hint.hidden = !on;
  uiCallbacks.renderCheckout();
  uiCallbacks.renderRegister();
}

export async function pushPass(tries = 0) {
  const pass = getPass();
  if (!pass || !pass.synced) return false;
  try {
    const r = await fetch('/api/pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pid: pass.id,
        name: pass.nickname,
        vid: meter.vid,
        gift: pass.giftCode
      })
    });
    if (!isJson(r)) return false;
    if (r.status === 409 && tries < 3) {
      pass.id = 'TAO-' + randCode(6);
      setPass(pass);
      uiCallbacks.renderTicket();
      return pushPass(tries + 1);
    }
    if (!r.ok) return false;
    mergeServer(await r.json());
    return true;
  } catch (e) {
    return false;
  }
}

export async function pullPass() {
  const pass = getPass();
  if (!pass || !pass.synced || server.busy || !navigator.onLine) return;
  server.busy = true;
  try {
    const r = await fetch('/api/pass?id=' + encodeURIComponent(pass.id), { cache: 'no-store' });
    if (r.status === 404 && isJson(r)) setServer(await pushPass());
    else if (r.ok && isJson(r)) {
      setServer(true);
      mergeServer(await r.json());
    } else setServer(false);
  } catch (e) {
    /* mất mạng: thử lại lần sau */
  }
  server.busy = false;
}

export async function stampByCode(raw) {
  const pass = getPass();
  if (!pass) return false;
  const input = $('#qr-f-otp') || $('#f-otp');
  const shake = () => {
    if (input) {
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
    }
  };

  const directCode = String(raw || '').trim().toUpperCase();
  const stDirect = STATIONS.find((s) => s.code === directCode || (s.altCodes && s.altCodes.includes(directCode)));
  if (stDirect) {
    if (pass.stamps.includes(stDirect.id)) {
      toast(`${stDirect.name} đã đóng dấu cho bạn rồi.`, 'info', 'seal-check');
      uiCallbacks.ppGo(PP.visa(stDirect.id));
      return true;
    }
    if (input) input.value = '';
    uiCallbacks.doStamp(stDirect.id);
    return true;
  }

  if (!server.on) {
    toast('Mã này chưa khớp trạm nào (thử HUONG1, MAIAM2, NEPNH3, TOTLA4).', 'err');
    shake();
    return false;
  }

  const code = String(raw || '').replace(/\D/g, '');
  if (code.length !== 6) {
    toast('Mã gồm 6 chữ số, nhân sự sẽ đọc cho bạn.', 'err');
    shake();
    return false;
  }
  let r,
    data = {};
  try {
    r = await fetch('/api/pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'code', pid: pass.id, code })
    });
    data = await r.json().catch(() => ({}));
  } catch (e) {
    toast(
      'Mất mạng nên chưa đóng dấu được. Nhờ nhân sự quét QR hoặc thử lại khi có mạng.',
      'err',
      'wifi-slash'
    );
    return false;
  }
  track('stamp_by_code', { ok: r.ok });
  if (r.status === 429) {
    toast('Nhập sai quá nhiều lần. Thử lại sau 15 phút, hoặc nhờ nhân sự quét QR.', 'err');
    shake();
    return false;
  }
  if (!r.ok) {
    toast(
      data.error === 'code'
        ? 'Mã chưa đúng hoặc đã hết hạn. Hỏi nhân sự mã mới nhất nhé.'
        : 'Chưa đóng dấu được, nhờ nhân sự quét QR giúp bạn.',
      'err'
    );
    shake();
    return false;
  }
  if (input) input.value = '';
  if (data.note === 'already') {
    toast(`${STATIONS[data.station - 1].name} đã đóng dấu cho bạn rồi.`, 'info', 'seal-check');
    uiCallbacks.ppGo(PP.visa(data.station));
    return true;
  }
  mergeServer(data.pass);
  return true;
}

export function mergeServer(v) {
  const pass = getPass();
  if (!v || !pass || v.pid !== pass.id) return;
  const beforeGiven = JSON.stringify(pass.given || {}),
    wasClaimed = pass.claimed;
  pass.serverPrizes = v.prizes || {};
  pass.given = v.given || {};
  if (v.claimed) pass.claimed = true;
  const fresh = Object.keys(v.stamps || {})
    .map(Number)
    .filter((st) => !pass.stamps.includes(st))
    .sort((a, b) => a - b);
  setPass(pass);

  fresh.slice(0, -1).forEach((st) => {
    pass.stamps.push(st);
    pass.stampedAt = Object.assign({}, pass.stampedAt, { [st]: v.stamps[st] });
  });
  if (fresh.length) {
    uiCallbacks.doStamp(fresh[fresh.length - 1], v.stamps[fresh[fresh.length - 1]], true);
    return;
  }
  if (JSON.stringify(pass.given) !== beforeGiven) uiCallbacks.ppRefresh([3, 4, 5, 6]);
  if (pass.claimed && !wasClaimed) {
    uiCallbacks.renderCheckout();
    toast('Nhân sự đã xác nhận trao quà cuối. Chúc bạn năm mới thật ấm!', 'gold', 'gift');
  }
}

export const waiting = () => {
  const pass = getPass();
  return pass && (pass.stamps.length < 4 || !pass.claimed);
};

export function startPolling() {
  clearInterval(server.timer);
  server.timer = setInterval(() => {
    if (document.visibilityState === 'visible' && server.inView && waiting()) pullPass();
  }, 6000);
  pullPass();
}

export function initPollingObserver() {
  const sec = $('#tram-trai-nghiem');
  if ('IntersectionObserver' in window && sec) {
    new IntersectionObserver((es) => {
      server.inView = es.some((e) => e.isIntersecting);
      if (server.inView) pullPass();
    }).observe(sec);
  } else {
    server.inView = true;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && server.inView && waiting()) pullPass();
  });
}

export const checkedIn = () => Boolean(store.get('checkin', null));

export function enterGate(raw) {
  if (String(raw || '').trim().toUpperCase() !== GATE_CODE) return;
  const pass = getPass();
  if (!checkedIn()) {
    store.set('checkin', { at: Date.now() });
    track('gate_checkin');
    measure('checkin');
    if (pass) uiCallbacks.ppRefresh([PP.data]);
  }
  toast(
    pass
      ? 'Chào mừng bạn đến sự kiện. Đưa hộ chiếu đi quét mã ở bốn trạm nhé.'
      : 'Chào mừng bạn đến sự kiện. Tạo thẻ thông hành rồi đi quét mã ở bốn trạm nhé.',
    'ok',
    'door-open'
  );
  setTimeout(() => {
    $(pass ? '#ticket-slot' : '#register')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    if (!pass) $('#f-nickname')?.focus({ preventScroll: true });
  }, 400);
}

export const DEMO_TAKEN = [
  'MINH',
  'BE NA',
  'NA',
  'AN',
  'LAN',
  'MINH KHOI',
  'KHOI',
  'TAO',
  'NGOC',
  'LINH'
];

export const isTaken = (name) =>
  DEMO_TAKEN.includes(plain(name)) || store.get('registry', []).includes(plain(name));

export const withSuffix = (name) =>
  name.slice(0, 18).trim() + '_' + String(Math.floor(1000 + Math.random() * 9000));

export function syncPass() {
  let pass = getPass();
  if (!pass || pass.synced || !navigator.onLine) return;
  const old = pass.id;
  pass.offlineId = old;
  pass.id = 'TAO-' + old.slice(4);
  pass.synced = true;
  let renamed = false;
  if (isTaken(pass.nickname)) {
    pass.nickname = withSuffix(pass.nickname);
    renamed = true;
  }
  setPass(pass);
  store.set('registry', [...new Set([...store.get('registry', []), plain(pass.nickname)])]);
  track('offline_id_synced', { renamed });
  uiCallbacks.renderTicket();
  uiCallbacks.renderRegister();
  startPolling();
  toast(
    `Đã đồng bộ thẻ. Mã chính thức của bạn: ${pass.id}.` +
      (renamed ? ` Tên bị trùng nên được đổi thành "${esc(pass.nickname)}".` : ''),
    'ok',
    'wifi-high'
  );
}

export async function restorePass(raw, silent) {
  let pass = getPass();
  const v = String(raw || '').trim();
  if (!v) return false;
  const isEmail = v.includes('@');
  track('restore_request', { by: isEmail ? 'email' : 'code_or_name' });

  if (
    !isEmail &&
    pass &&
    (pass.id === v.toUpperCase() ||
      pass.offlineId === v.toUpperCase() ||
      plain(pass.nickname) === plain(v))
  ) {
    toast('Thẻ này đang mở trên máy rồi.', 'info', 'identification-card');
    setTimeout(
      () =>
        ($('#passport-bar') || $('#ticket-slot'))?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        }),
      300
    );
    return true;
  }

  if (isEmail) {
    const history = store.get('saved_passes', []);
    const found =
      pass && pass.email && pass.email.toLowerCase() === v.toLowerCase()
        ? pass
        : history.find((x) => x && x.email && x.email.toLowerCase() === v.toLowerCase());
    if (found) {
      pass = found;
      setPass(pass);
      store.set('new_pass', false);
      uiCallbacks.renderRegister();
      uiCallbacks.renderTicket(true);
      uiCallbacks.renderCheckout();
      startPolling();
      toast(
        `Đã khôi phục thành công thẻ ${pass.id} (${pass.nickname})!`,
        'ok',
        'identification-card'
      );
      setTimeout(
        () =>
          ($('#passport-bar') || $('#ticket-slot'))?.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
          }),
        300
      );
      return true;
    }
    toast(
      'Hệ thống không lưu công khai email trên máy chủ để bảo mật. Bạn hãy nhập mã thẻ (dạng TAO-XXXXXX) hoặc tên nickname nhé.',
      'info',
      'shield-check'
    );
    return false;
  }

  let code = v.toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(code)) {
    code = 'TAO-' + code;
  }
  const isCode = /^(TAO|OFF)-[A-Z0-9]{6}$/.test(code);

  if (!silent) {
    toast(
      isCode ? `Đang tra cứu thẻ ${code} trên hệ thống…` : `Đang tìm thẻ của “${v}” trên hệ thống…`,
      'info',
      'spinner'
    );
  }

  let serverData = null;
  try {
    const queryParam = isCode ? 'id=' + encodeURIComponent(code) : 'name=' + encodeURIComponent(v);
    const r = await fetch('/api/pass?' + queryParam, { cache: 'no-store' });
    if (r.ok && isJson(r)) {
      serverData = await r.json();
    }
  } catch (e) {}

  if (serverData && serverData.pid) {
    const serverStamps = serverData.stamps || {};
    const serverPrizes = serverData.prizes || {};
    const serverGiven = serverData.given || {};
    pass = {
      id: serverData.pid,
      nickname: serverData.name || v,
      email: pass && pass.id === serverData.pid ? pass.email : null,
      consent: true,
      stamps: Object.keys(serverStamps)
        .map(Number)
        .sort((a, b) => a - b),
      stampedAt: serverStamps,
      giftCode: serverData.gift || 'QUA-' + randCode(4),
      claimed: Boolean(serverData.claimed),
      synced: true,
      serverPrizes: serverPrizes,
      given: serverGiven,
      spins: Object.fromEntries(
        Object.entries(serverPrizes).map(([st, pz]) => [
          st,
          { prize: pz, at: serverStamps[st] || Date.now() }
        ])
      )
    };
    setPass(pass);
    store.set('new_pass', false);
    savePassToHistory(pass);
    setServer(true);
    uiCallbacks.renderRegister();
    uiCallbacks.renderTicket(true);
    uiCallbacks.renderCheckout();
    startPolling();
    toast(`Đã đồng bộ thành công thẻ ${pass.id} (${pass.nickname})!`, 'ok', 'seal-check');
    setTimeout(
      () =>
        ($('#passport-bar') || $('#ticket-slot'))?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        }),
      300
    );
    return true;
  }

  const history = store.get('saved_passes', []);
  const localFound = isCode
    ? history.find((x) => x && (x.id === code || x.offlineId === code))
    : history.find((x) => x && plain(x.nickname) === plain(v));

  if (localFound) {
    pass = localFound;
    setPass(pass);
    store.set('new_pass', false);
    uiCallbacks.renderRegister();
    uiCallbacks.renderTicket(true);
    uiCallbacks.renderCheckout();
    startPolling();
    toast(
      `Đã khôi phục thẻ ${pass.id} (${pass.nickname}) từ bộ nhớ máy!`,
      'ok',
      'identification-card'
    );
    setTimeout(
      () =>
        ($('#passport-bar') || $('#ticket-slot'))?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start'
        }),
      300
    );
    if (navigator.onLine) pushPass();
    return true;
  }

  if (isCode) {
    toast(
      `Không tìm thấy thẻ có mã ${code} trên hệ thống. Bạn vui lòng kiểm tra lại mã hoặc tạo thẻ mới nhé.`,
      'err',
      'warning-circle'
    );
  } else {
    toast(
      `Không tìm thấy thẻ nào có tên “${v}” trên hệ thống. Bạn vui lòng kiểm tra lại tên hoặc nhập mã thẻ (dạng TAO-XXXXXX) nhé.`,
      'err',
      'warning-circle'
    );
  }
  return false;
}

export async function openRestore(preset) {
  const defaultVal = typeof preset === 'string' ? preset.trim() : '';
  const p = ask({
    title: 'Lấy lại thẻ đã tạo',
    html: `<p>Nhập <strong>mã thẻ</strong> (dạng TAO-XXXXXX hoặc 6 ký tự), <strong>tên nickname</strong> hoặc <strong>email</strong> bạn đã dùng.</p>
      <label class="dlg-label" for="dlg-restore">Mã thẻ, tên hoặc email</label>
      <input class="input" id="dlg-restore" autocomplete="off" spellcheck="false" value="${esc(
        defaultVal
      )}" placeholder="TAO-D5KBP8, Bé Na hoặc email">
      <p class="error-text" id="dlg-restore-err" aria-live="polite"></p>`,
    buttons: [
      { label: 'Huỷ', value: 'cancel', cls: 'btn-quiet' },
      { label: 'Lấy lại thẻ', value: 'ok', cls: 'btn-primary', id: 'dlg-restore-ok' }
    ]
  });
  const input = $('#dlg-restore');
  if (input) {
    input.focus();
    if (defaultVal) input.select();
  }

  $('#dlg-restore-ok')?.addEventListener('click', (e) => {
    const v = input ? input.value.trim() : '';
    if (!v || v.length < 2) {
      e.preventDefault();
      const err = $('#dlg-restore-err');
      if (err)
        err.innerHTML =
          '<i class="ph ph-warning-circle" aria-hidden="true"></i>Vui lòng nhập mã thẻ, tên hoặc email (ít nhất 2 ký tự).';
      if (input) input.focus();
    }
  });

  if ((await p) !== 'ok') return;
  const v = input ? input.value.trim() : '';
  await restorePass(v);
}
