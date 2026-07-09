import { loadSettings, saveSetting } from '../systems/settings';

type ToggleKey = 'sound' | 'shake' | 'glow';

const ROWS: { key: ToggleKey; label: string }[] = [
  { key: 'sound', label: 'SOUND EFFECTS' },
  { key: 'shake', label: 'SCREEN SHAKE'  },
  { key: 'glow',  label: 'GLOW EFFECTS'  },
];

export class SettingsOverlay {
  private readonly root: HTMLDivElement;
  private readonly onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.root    = document.createElement('div');
    this.root.id = 'settings-overlay';
    Object.assign(this.root.style, STYLES.overlay);
    this.root.innerHTML = this.buildHTML();
    document.body.appendChild(this.root);
    this.bindEvents();
  }

  destroy(): void {
    this.root.remove();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private buildHTML(): string {
    const settings = loadSettings();
    const rows = ROWS.map(r => this.rowHTML(r.key, r.label, settings[r.key])).join('');
    return `
      <div id="st-panel" style="${s(STYLES.panel)}">
        <div style="${s(STYLES.title)}">SETTINGS</div>
        <div id="st-rows">${rows}</div>
        <button id="st-close" style="${s(STYLES.closeBtn)}">DONE</button>
        <div style="${s(STYLES.note)}">Glow changes take effect on next level start.</div>
      </div>
    `;
  }

  private rowHTML(key: ToggleKey, label: string, value: boolean): string {
    const onStyle  = s({ ...STYLES.badge, ...(value  ? STYLES.badgeOn  : STYLES.badgeOff) });
    const offStyle = s({ ...STYLES.badge, ...(!value ? STYLES.badgeOn  : STYLES.badgeOff) });
    return `
      <div data-key="${key}" style="${s(STYLES.row)}">
        <span style="${s(STYLES.rowLabel)}">${label}</span>
        <div style="display:flex;gap:6px">
          <span data-val="on"  style="${onStyle}">ON</span>
          <span data-val="off" style="${offStyle}">OFF</span>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.root.querySelector('#st-close')!
      .addEventListener('click', () => { this.destroy(); this.onClose(); });

    this.root.querySelectorAll<HTMLElement>('[data-key]').forEach(row => {
      row.querySelectorAll<HTMLElement>('[data-val]').forEach(badge => {
        badge.addEventListener('click', () => {
          const key   = row.getAttribute('data-key') as ToggleKey;
          const value = badge.getAttribute('data-val') === 'on';
          saveSetting(key, value);
          this.refresh();
        });
      });
    });
  }

  private refresh(): void {
    const panel = this.root.querySelector<HTMLElement>('#st-rows')!;
    const settings = loadSettings();
    panel.innerHTML = ROWS.map(r => this.rowHTML(r.key, r.label, settings[r.key])).join('');
    this.bindEvents();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function s(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const STYLES: Record<string, Record<string, string>> = {
  overlay: {
    position: 'fixed', inset: '0',
    display: 'flex', 'align-items': 'center', 'justify-content': 'center',
    'z-index': '2000', background: 'rgba(0,0,0,0.65)', 'pointer-events': 'all',
  },
  panel: {
    background: '#0d0221', border: '1px solid #6060cc',
    padding: '28px 36px', 'border-radius': '6px',
    'min-width': '340px', 'font-family': 'monospace',
    'box-shadow': '0 0 40px #6060cc44',
  },
  title: {
    color: '#00f0ff', 'font-size': '18px', 'letter-spacing': '4px',
    'margin-bottom': '24px',
  },
  row: {
    display: 'flex', 'justify-content': 'space-between', 'align-items': 'center',
    padding: '10px 0', 'border-bottom': '1px solid #1a1a3a', cursor: 'default',
  },
  rowLabel: {
    color: '#aaaacc', 'font-size': '13px', 'letter-spacing': '1px',
  },
  badge: {
    'font-family': 'monospace', 'font-size': '12px',
    padding: '3px 10px', 'border-radius': '3px',
    cursor: 'pointer', 'letter-spacing': '1px',
    border: '1px solid transparent',
  },
  badgeOn: {
    background: '#6060cc', color: '#ffffff', 'border-color': '#8080ff',
  },
  badgeOff: {
    background: 'transparent', color: '#404060', 'border-color': '#303050',
  },
  closeBtn: {
    'margin-top': '24px', background: 'transparent', border: '1px solid #6060cc',
    color: '#6060cc', 'font-family': 'monospace', 'font-size': '13px',
    padding: '7px 18px', cursor: 'pointer', 'border-radius': '3px',
    width: '100%', 'letter-spacing': '2px',
  },
  note: {
    'margin-top': '12px', 'font-size': '11px', color: '#404060',
    'text-align': 'center',
  },
};
