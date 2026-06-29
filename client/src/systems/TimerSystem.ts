export class TimerSystem {
  private ms = 0;
  private running = false;

  get elapsed(): number  { return this.ms; }
  get active(): boolean  { return this.running; }

  start():  void { this.running = true; }
  stop():   void { this.running = false; }
  reset():  void { this.ms = 0; this.running = false; }

  /** Call once per fixed tick with the fixed delta (ms). */
  tick(dt: number): void {
    if (this.running) this.ms += dt;
  }

  format(): string {
    const total = Math.floor(this.ms);
    const m   = Math.floor(total / 60_000);
    const s   = Math.floor((total % 60_000) / 1_000);
    const ms  = total % 1_000;
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}
