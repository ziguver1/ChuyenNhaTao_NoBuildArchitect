/**
 * Quản lý âm thanh Web Audio API: tiếng lửa bếp lách tách, lật trang, đóng dấu, vòng quay
 */
import { $ } from './dom.js';

export const sound = {
  ctx: null,
  on: false,
  timer: null,
  master: null,

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },

  noise(dur, freq, gain) {
    const c = this.ctx,
      len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  },

  crackle() {
    if (!this.on) return;
    this.noise(
      0.03 + Math.random() * 0.06,
      1500 + Math.random() * 3500,
      0.25 + Math.random() * 0.35
    );
    if (Math.random() < 0.15) this.noise(0.25, 300, 0.12); // tiếng củi nổ trầm
    this.timer = setTimeout(() => this.crackle(), 40 + Math.random() * 260);
  },

  toggle() {
    if (!this.init()) return false;
    this.on = !this.on;
    if (this.on) this.crackle();
    else clearTimeout(this.timer);
    return this.on;
  },

  flip() {
    if (this.ctx && this.on) this.noise(0.18, 900, 0.35);
  },

  stamp(force) {
    if (this.init() && (this.on || force)) {
      this.noise(0.09, 160, 1.3);
      this.noise(0.05, 1200, 0.35);
    }
  },

  // Âm thanh vòng quay: phát sau khi người chơi bấm Quay
  tick() {
    if (this.ctx) this.noise(0.014, 3400, 0.45);
  },

  pop(big) {
    if (!this.ctx) return;
    const c = this.ctx,
      dur = big ? 0.55 : 0.07,
      len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, big ? 4 : 9);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = big ? 'lowpass' : 'highpass';
    f.frequency.value = big ? 900 : 600 + Math.random() * 1600;
    const g = c.createGain();
    g.gain.value = big ? 1.8 : 0.7 + Math.random() * 0.6;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  },

  ting() {
    if (!this.ctx) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, c.currentTime);
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + 0.9);
  },

  chime() {
    if (!this.ctx || !this.on) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(990, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + 0.6);
  }
};

/**
 * Khởi tạo nút bật/tắt tiếng lửa bếp trên Header
 */
export function initSoundToggle() {
  const btn = $('#sound-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const on = sound.toggle();
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Tắt tiếng lửa bếp' : 'Bật tiếng lửa bếp');
    btn.innerHTML = `<i class="ph ph-${on ? 'fire' : 'speaker-slash'}" aria-hidden="true"></i>`;
  });
}
