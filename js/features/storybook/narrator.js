/**
 * Bộ đọc audio giọng kể và câu chuyện cuối chương
 */
import { $, $$ } from '../../core/dom.js';
import { track } from '../../analytics/tracker.js';
import { toast } from '../../core/toast.js';
import { hasGsap, reduceMotion } from '../../core/motion.js';
import { CHAPTERS } from './chapters.data.js';
import { completeChapter } from './badges.js';

let speaking = false;
let audioEl = null;
let voiceBtn = null;

const setVoiceLabel = (btn, on) => {
  if (btn && btn.isConnected) {
    const s = btn.querySelector('span');
    if (s) s.textContent = on ? 'Dừng đọc' : 'Nghe đọc';
    const ic = btn.querySelector('i');
    if (ic) ic.className = on ? 'ph-fill ph-speaker-slash' : 'ph ph-speaker-high';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('title', on ? 'Dừng đọc' : 'Nghe đọc');
  }
};

export function stopVoice() {
  if (speaking && 'speechSynthesis' in window) speechSynthesis.cancel();
  if (audioEl) {
    audioEl.pause();
    audioEl = null;
  }
  if (speaking) setVoiceLabel(voiceBtn, false);
  speaking = false;
}

export function viVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices().filter((v) => /^vi([-_]|$)/i.test(v.lang));
  return vs.find((v) => /natural|online/i.test(v.name)) || vs[0] || null;
}

if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
}

export function speakTTS(c, btn) {
  const voice = viVoice();
  if (!voice) {
    speaking = false;
    setVoiceLabel(btn, false);
    toast(
      'Máy này chưa có giọng đọc tiếng Việt. Mở trang bằng Microsoft Edge để nghe giọng HoaiMy, hoặc thêm gói giọng nói tiếng Việt trong cài đặt Windows.',
      'info',
      'speaker-x'
    );
    track('voice_unavailable');
    return;
  }
  const u = new SpeechSynthesisUtterance(c.title + '. ' + c.story);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.95;
  u.onend = u.onerror = () => {
    speaking = false;
    setVoiceLabel(btn, false);
  };
  speechSynthesis.speak(u);
}

export function voiceOver(btn, i) {
  if (speaking) {
    stopVoice();
    return;
  }
  stopTale();
  const c = CHAPTERS[i];
  voiceBtn = btn;
  speaking = true;
  setVoiceLabel(btn, true);
  track('voice_play', { chapter: i + 1 });
  audioEl = new Audio(`audio/chuong-${i + 1}.mp3`);
  audioEl.onended = () => {
    speaking = false;
    audioEl = null;
    setVoiceLabel(btn, false);
  };
  audioEl.onerror = () => {
    audioEl = null;
    if (speaking) speakTTS(c, btn);
  };
  audioEl.play().catch(() => {});
}

// ----------------------------------------------------------------------
// Lắng nghe câu chuyện cuối chương
// ----------------------------------------------------------------------
export const tale = { i: null, timers: [], audio: null, playing: false };

export function renderListen(i, done) {
  const c = CHAPTERS[i],
    L = c.listen;
  const gameEl = $('#game-' + i);
  if (!gameEl) return;

  gameEl.innerHTML = `
    <div class="listen ${done ? 'is-done' : ''}">
      <p class="listen-prompt">${
        done ? 'Bạn đã nghe câu chuyện này.' : `Chạm vào ${L.object} để nghe một câu chuyện nhỏ.`
      }</p>
      <button class="listen-obj" type="button" data-tale="${i}" aria-label="${
    done ? 'Nghe lại' : 'Chạm để nghe'
  }: ${L.teller}">
        <span class="listen-ring" aria-hidden="true"></span><span class="listen-ring" aria-hidden="true"></span>
        <i class="ph-fill ph-${L.icon}" aria-hidden="true"></i>
      </button>
      <p class="listen-teller"><i class="ph ph-waveform" aria-hidden="true"></i> ${L.teller}</p>
      <ol class="listen-lines" id="lines-${i}">${L.lines
    .map((t) => `<li class="${done ? 'is-on' : ''}">${t}</li>`)
    .join('')}</ol>
      <p class="listen-take ${done ? 'is-on' : ''}" id="take-${i}">${L.takeaway}</p>
      ${
        !done
          ? `<button class="linklike listen-all" type="button" data-tale-all="${i}">Không nghe được? Đọc lời kể</button>`
          : ''
      }
    </div>`;
}

export function stopTale() {
  tale.timers.forEach(clearTimeout);
  tale.timers = [];
  if (tale.audio) {
    tale.audio.pause();
    tale.audio = null;
  }
  if (tale.playing && 'speechSynthesis' in window) speechSynthesis.cancel();
  const obj = tale.i !== null && $(`[data-tale="${tale.i}"]`);
  if (obj) {
    obj.classList.remove('is-playing');
    obj.closest('.listen')?.classList.remove('is-active');
  }
  tale.playing = false;
  tale.i = null;
}

export function showLine(i, k) {
  const list = $$(`#lines-${i} li`);
  const li = list[k];
  if (!li) return;
  list.forEach((el) => el.classList.remove('is-current'));
  li.classList.add('is-on', 'is-current');
}

export function finishTale(i, mode) {
  stopTale();
  const box = $(`[data-tale="${i}"]`);
  if (box) box.closest('.listen')?.classList.add('is-active', 'is-done');
  $$(`#lines-${i} li`).forEach((li) => {
    li.classList.add('is-on');
    li.classList.remove('is-current');
  });
  const take = $('#take-' + i);
  if (take) {
    take.classList.add('is-on');
    if (hasGsap && !reduceMotion && window.gsap) {
      gsap.from(take, { scale: 0.92, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' });
    }
  }
  track('listen_complete', { chapter: i + 1, mode });
  if (i === 3) releaseLantern($(`[data-tale="${i}"]`) || take);
  setTimeout(() => completeChapter(i), 1400);
}

export function playTale(i) {
  if (tale.playing) {
    const same = tale.i === i;
    stopTale();
    if (same) return;
  }
  const L = CHAPTERS[i].listen;
  stopVoice();
  tale.i = i;
  tale.playing = true;

  const btn = $(`[data-tale="${i}"]`);
  if (btn) {
    btn.classList.add('is-playing');
    btn.closest('.listen')?.classList.add('is-active');
  }
  $$(`#lines-${i} li`).forEach((li) => li.classList.remove('is-on', 'is-current'));
  $('#take-' + i)?.classList.remove('is-on');
  track('listen_play', { chapter: i + 1 });

  const byText = () => {
    let t = 0;
    L.lines.forEach((line, k) => {
      tale.timers.push(setTimeout(() => showLine(i, k), t));
      t += Math.max(2200, line.length * 55);
    });
    tale.timers.push(setTimeout(() => finishTale(i, 'text'), t));
  };

  const byVoice = () => {
    const voice = viVoice();
    if (!voice) {
      byText();
      return;
    }
    L.lines.forEach((line, k) => {
      const u = new SpeechSynthesisUtterance(line);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.92;
      u.onstart = () => showLine(i, k);
      if (k === L.lines.length - 1) {
        u.onend = () => {
          if (tale.i === i) finishTale(i, 'voice');
        };
      }
      speechSynthesis.speak(u);
    });
  };

  const a = new Audio(`audio/ke-chuyen-${i + 1}.mp3`);
  tale.audio = a;
  a.onloadedmetadata = () => {
    const step = (a.duration * 1000) / L.lines.length;
    L.lines.forEach((_, k) => tale.timers.push(setTimeout(() => showLine(i, k), k * step)));
  };
  a.onended = () => {
    if (tale.i === i) finishTale(i, 'audio');
  };
  a.onerror = () => {
    if (tale.audio === a) {
      tale.audio = null;
      byVoice();
    }
  };
  a.play().catch(() => {});
}

export function releaseLantern(fromEl) {
  if (!hasGsap || reduceMotion || !window.gsap) return;
  const r = fromEl.getBoundingClientRect();
  for (let k = 0; k < 3; k++) {
    const l = document.createElement('div');
    l.className = 'lantern-fly';
    l.style.left = r.left + r.width / 2 - 18 + (k - 1) * 40 + 'px';
    l.style.top = r.top - 20 + 'px';
    document.body.appendChild(l);
    gsap
      .timeline({ onComplete: () => l.remove() })
      .to(l, { y: -(r.top + 120), duration: 3.2 + k * 0.4, ease: 'power1.in' }, k * 0.15)
      .to(
        l,
        {
          x: (k - 1) * 60 + gsap.utils.random(-30, 30),
          rotation: gsap.utils.random(-12, 12),
          duration: 3.2,
          ease: 'sine.inOut'
        },
        k * 0.15
      )
      .to(l, { opacity: 0, scale: 0.5, duration: 1 }, 2.4 + k * 0.15);
  }
}
