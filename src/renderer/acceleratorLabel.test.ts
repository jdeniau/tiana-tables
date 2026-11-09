import { expect, test } from 'vitest';
import { acceleratorLabel } from './acceleratorLabel';

test.each([
  ['CommandOrControl+Z', 'Ctrl+Z'],
  ['CmdOrCtrl+,', 'Ctrl+,'],
  ['Shift+CommandOrControl+Z', 'Shift+Ctrl+Z'],
  ['CommandOrControl+Plus', 'Ctrl++'],
  ['Control+Shift+Tab', 'Ctrl+Shift+Tab'],
  ['Alt+Left', 'Alt+←'],
  ['Alt+Right', 'Alt+→'],
  ['F11', 'F11'],
])('%s reads %s', (accelerator, label) => {
  expect(acceleratorLabel(accelerator)).toBe(label);
});
