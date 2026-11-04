import { expect, test } from 'vitest';
import { WindowsAskpass } from './windows';

test('on Windows, ssh starts the app itself on the askpass program, with no batch file in between', async () => {
  const { env } = await new WindowsAskpass(
    'C:\\Users\\Jane Doe\\AppData\\Local\\tiana_tables\\app-1.0.0\\tiana-tables.exe',
    'C:\\Users\\Jane Doe\\AppData\\Local\\tiana_tables\\app-1.0.0\\resources\\app\\.vite\\build\\askpass.cjs'
  ).prepare();

  expect(env).toEqual({
    SSH_ASKPASS:
      '"C:\\Users\\Jane Doe\\AppData\\Local\\tiana_tables\\app-1.0.0\\tiana-tables.exe" "C:\\Users\\Jane Doe\\AppData\\Local\\tiana_tables\\app-1.0.0\\resources\\app\\.vite\\build\\askpass.cjs"',
    ELECTRON_RUN_AS_NODE: '1',
  });
});
