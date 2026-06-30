import type { LeaderboardEntry } from '@afterglow/shared';

const STORAGE_KEY_NAME      = 'ag_player_name';
const STORAGE_KEY_CLIENT_ID = 'ag_client_id';

interface Options {
  finalTimeMs:    number;
  coinsCollected: number;
  levelId:        string;
  levelVersion:   string;
  onRestart:      () => void;
}

export class LeaderboardOverlay {
  private readonly root: HTMLDivElement;
  private readonly opts: Options;

  constructor(opts: Options) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.id = 'lb-overlay';
    Object.assign(this.root.style, STYLES.overlay);
    this.root.innerHTML = this.buildHTML();
    document.body.appendChild(this.root);

    this.bindEvents();

    // Auto-fetch leaderboard right away (no submit needed to see current board)
    this.fetchAndRender().catch(() => {});
  }

  destroy(): void {
    this.root.remove();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private buildHTML(): string {
    const savedName = localStorage.getItem(STORAGE_KEY_NAME) ?? '';
    const t = formatMs(this.opts.finalTimeMs);
    const coins = this.opts.coinsCollected > 0
      ? `  ·  ${this.opts.coinsCollected} coins` : '';
    return `
      <div id="lb-panel" style="${styleStr(STYLES.panel)}">
        <div style="${styleStr(STYLES.title)}">LEADERBOARD</div>
        <div style="${styleStr(STYLES.yourTime)}">YOUR TIME  ${t}${coins}</div>

        <div style="${styleStr(STYLES.submitRow)}">
          <input id="lb-name" type="text"
            maxlength="24"
            placeholder="Your name"
            value="${escHtml(savedName)}"
            style="${styleStr(STYLES.input)}" />
          <button id="lb-submit" style="${styleStr(STYLES.btn)}">SUBMIT</button>
        </div>

        <div id="lb-status" style="${styleStr(STYLES.status)}"></div>
        <div id="lb-list"   style="${styleStr(STYLES.list)}">
          <div style="opacity:0.4;font-size:12px">Loading…</div>
        </div>

        <button id="lb-restart" style="${styleStr(STYLES.restartBtn)}">▶  PLAY AGAIN</button>
      </div>
    `;
  }

  private bindEvents(): void {
    const submitBtn  = this.root.querySelector<HTMLButtonElement>('#lb-submit')!;
    const restartBtn = this.root.querySelector<HTMLButtonElement>('#lb-restart')!;
    const nameInput  = this.root.querySelector<HTMLInputElement>('#lb-name')!;

    submitBtn.addEventListener('click', () => { void this.submitRun(nameInput.value); });
    nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { void this.submitRun(nameInput.value); }
      e.stopPropagation(); // don't let Phaser see keystrokes
    });
    restartBtn.addEventListener('click', () => {
      this.destroy();
      this.opts.onRestart();
    });
  }

  private async submitRun(rawName: string): Promise<void> {
    const playerName = rawName.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 32) || 'PLAYER';
    localStorage.setItem(STORAGE_KEY_NAME, playerName);

    const statusEl = this.root.querySelector<HTMLDivElement>('#lb-status')!;
    const submitBtn = this.root.querySelector<HTMLButtonElement>('#lb-submit')!;
    submitBtn.disabled = true;
    statusEl.textContent = 'Submitting…';

    try {
      const clientId = getOrCreateClientId();
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          playerClientId:     clientId,
          levelId:            this.opts.levelId,
          version:            this.opts.levelVersion,
          timeMs:             this.opts.finalTimeMs,
          coins:              this.opts.coinsCollected,
          deathMode:          'reset',
          deaths:             0,
          checkpointRespawns: 0,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { rank } = await res.json() as { runId: string; rank: number; isClean: boolean };
      statusEl.textContent = `Submitted! Your rank: #${rank}`;
      statusEl.style.color = '#00ff88';
      await this.fetchAndRender();
    } catch {
      statusEl.textContent = 'Submit failed — check connection';
      statusEl.style.color = '#ff3333';
      submitBtn.disabled = false;
    }
  }

  private async fetchAndRender(): Promise<void> {
    const listEl = this.root.querySelector<HTMLDivElement>('#lb-list')!;
    try {
      const res = await fetch(`/api/leaderboard/${this.opts.levelId}?limit=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { entries } = await res.json() as { entries: LeaderboardEntry[] };
      const clientId = localStorage.getItem(STORAGE_KEY_CLIENT_ID) ?? '';

      if (entries.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.4;font-size:12px">No runs yet — be the first!</div>';
        return;
      }

      listEl.innerHTML = entries.map(e => {
        const isYou  = e.playerClientId === clientId;
        const rank   = `#${e.rank}`.padEnd(3);
        const name   = e.playerName.slice(0, 20).padEnd(20);
        const time   = formatMs(e.timeMs);
        const you    = isYou ? '  ← YOU' : '';
        const color  = isYou ? '#00f0ff' : '#aaaacc';
        return `<div style="font-size:13px;color:${color};padding:2px 0;white-space:pre">${rank}  ${name}  ${time}${you}</div>`;
      }).join('');
    } catch {
      listEl.innerHTML = '<div style="opacity:0.4;font-size:12px">Could not load leaderboard</div>';
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOrCreateClientId(): string {
  let id = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, id);
  }
  return id;
}

function formatMs(ms: number): string {
  const t  = Math.floor(ms);
  const m  = Math.floor(t / 60_000);
  const s  = Math.floor((t % 60_000) / 1_000);
  const ms2 = t % 1_000;
  return `${m}:${s.toString().padStart(2,'0')}.${ms2.toString().padStart(3,'0')}`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function styleStr(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const STYLES: Record<string, Record<string, string>> = {
  overlay: {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
    'pointer-events': 'all',
    background: 'rgba(0,0,0,0.55)',
  },
  panel: {
    background: '#0d0221',
    border: '1px solid #6060cc',
    padding: '28px 36px',
    'border-radius': '6px',
    'min-width': '380px',
    'max-width': '520px',
    'font-family': 'monospace',
    'box-shadow': '0 0 40px #6060cc44',
  },
  title: {
    color: '#aaff00',
    'font-size': '20px',
    'letter-spacing': '4px',
    'margin-bottom': '8px',
  },
  yourTime: {
    color: '#aaaacc',
    'font-size': '13px',
    'margin-bottom': '20px',
  },
  submitRow: {
    display: 'flex',
    gap: '8px',
    'margin-bottom': '10px',
  },
  input: {
    flex: '1',
    background: '#1a1040',
    border: '1px solid #6060cc',
    color: '#ffffff',
    'font-family': 'monospace',
    'font-size': '14px',
    padding: '6px 10px',
    'border-radius': '3px',
    outline: 'none',
  },
  btn: {
    background: '#6060cc',
    border: 'none',
    color: '#ffffff',
    'font-family': 'monospace',
    'font-size': '13px',
    padding: '6px 14px',
    cursor: 'pointer',
    'border-radius': '3px',
    'letter-spacing': '1px',
  },
  status: {
    'font-size': '12px',
    color: '#aaaacc',
    'min-height': '18px',
    'margin-bottom': '12px',
  },
  list: {
    'border-top': '1px solid #333355',
    'padding-top': '12px',
    'margin-bottom': '20px',
    'min-height': '80px',
  },
  restartBtn: {
    background: 'transparent',
    border: '1px solid #6060cc',
    color: '#6060cc',
    'font-family': 'monospace',
    'font-size': '13px',
    padding: '7px 18px',
    cursor: 'pointer',
    'border-radius': '3px',
    width: '100%',
    'letter-spacing': '2px',
  },
};
