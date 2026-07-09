export type SoundId =
  | 'jump' | 'land' | 'dash'
  | 'coin' | 'powerup'
  | 'kill' | 'death' | 'finish';

class AudioSystem {
  private ctx: AudioContext | null = null;

  private get enabled(): boolean {
    return localStorage.getItem('ag_sound') !== 'off';
  }

  private ctx_(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(id: SoundId): void {
    if (!this.enabled) return;
    const ctx = this.ctx_();
    if (!ctx) return;

    switch (id) {
      // Springy ascending chirp
      case 'jump':    this.tone(ctx, 240, 420,  0.10, 'sine',     0.12); break;
      // Soft thud on landing
      case 'land':    this.noise(ctx, 0.06, 0.05); break;
      // Sawtooth swoosh down
      case 'dash':    this.tone(ctx, 780, 160,  0.09, 'sawtooth', 0.10); break;
      // Bright double-ping
      case 'coin':    this.arpeggio(ctx, [880, 1320], 0.07, 'sine', 0.07); break;
      // Ascending 4-note reward sting
      case 'powerup': this.arpeggio(ctx, [330, 415, 494, 659], 0.09, 'sine', 0.09); break;
      // Crunchy bandpass noise
      case 'kill':    this.noise(ctx, 0.13, 0.09); break;
      // Descending sawtooth — "you died"
      case 'death':   this.tone(ctx, 400, 75,   0.13, 'sawtooth', 0.40); break;
      // Ascending 5-note fanfare
      case 'finish':  this.arpeggio(ctx, [330, 415, 494, 659, 880], 0.09, 'sine', 0.09); break;
    }
  }

  // Oscillator tone with optional pitch sweep
  private tone(
    ctx: AudioContext,
    startHz: number, endHz: number,
    vol: number, type: OscillatorType, dur: number,
    delay = 0,
  ): void {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(startHz, t);
    osc.frequency.exponentialRampToValueAtTime(endHz, t + dur * 0.85);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Bandpass-filtered white noise burst
  private noise(ctx: AudioContext, vol: number, dur: number): void {
    const n   = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const f    = ctx.createBiquadFilter();
    f.type     = 'bandpass';
    f.frequency.value = 700;
    f.Q.value  = 0.7;
    const gain = ctx.createGain();
    src.connect(f);
    f.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // Sequential short tones
  private arpeggio(
    ctx: AudioContext,
    freqs: number[], vol: number, type: OscillatorType, step: number,
  ): void {
    freqs.forEach((f, i) =>
      this.tone(ctx, f, f, vol, type, step * 1.1, i * step * 0.75),
    );
  }
}

export const audioSystem = new AudioSystem();
