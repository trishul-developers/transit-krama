// ============================================================================
// 2. WEB AUDIO API PROCEDURAL SYNTHESIZER & HAPTICS
// ============================================================================
class ProceduralAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.hapticsEnabled = true;
    this.scale = [329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99];
  }
  ensureCtx() {
    if (!this.enabled || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }
  vibrate(pattern) {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof window !== "undefined" && window.AndroidBridge && window.AndroidBridge.vibrate) {
        const ms = Array.isArray(pattern) ? (pattern[0] || 20) : (Number(pattern) || 20);
        window.AndroidBridge.vibrate(ms);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }
  playPopNote(idx) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = this.scale[idx % this.scale.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.92, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.065);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }
  playHornThump() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(210, now);
    osc1.frequency.exponentialRampToValueAtTime(145, now + 0.11);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.13);
  }
  playBlockedBump() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.11);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }
  playFullDepart() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + i * 0.038);
      g.gain.setValueAtTime(0.001, now + i * 0.038);
      g.gain.linearRampToValueAtTime(0.11, now + i * 0.038 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.038 + 0.16);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.038);
      osc.stop(now + i * 0.038 + 0.17);
    });
  }
  playPowerUpSfx() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.20);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }
  playVictoryChord() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];
    freqs.forEach((f, idx) => {
      const start = ctx.currentTime + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.50);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.52);
    });
  }
}

const audio = new ProceduralAudio();
