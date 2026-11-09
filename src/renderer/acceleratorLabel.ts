/** Electron's key names, as a menu shows them on Linux and Windows */
const KEY_LABELS: Record<string, string> = {
  CommandOrControl: 'Ctrl',
  CmdOrCtrl: 'Ctrl',
  CommandOrCtrl: 'Ctrl',
  CmdOrControl: 'Ctrl',
  Control: 'Ctrl',
  Plus: '+',
  Left: '←',
  Right: '→',
  Up: '↑',
  Down: '↓',
};

/** An Electron accelerator as a menu shows it: `CommandOrControl+Plus` reads `Ctrl++`. */
export function acceleratorLabel(accelerator: string): string {
  return accelerator
    .split('+')
    .map((key) => KEY_LABELS[key] ?? key)
    .join('+');
}
