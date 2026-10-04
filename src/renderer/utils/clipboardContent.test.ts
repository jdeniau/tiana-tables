/**
 * @vitest-environment happy-dom
 */
import { expect, test } from 'vitest';
import { writeClipboard } from './clipboardContent';

async function clipboard(): Promise<Record<string, string>> {
  const [item] = await navigator.clipboard.read();
  const written: Record<string, string> = {};

  for (const type of item.types) {
    written[type] = await (await item.getType(type)).text();
  }

  return written;
}

test('writes the text and the HTML beside it', async () => {
  await writeClipboard({ text: 'a\tb', html: '<table></table>' });

  expect(await clipboard()).toEqual({
    'text/plain': 'a\tb',
    'text/html': '<table></table>',
  });
});

test('writes the text alone when there is no HTML', async () => {
  await writeClipboard({ text: 'a,b' });

  expect(await clipboard()).toEqual({ 'text/plain': 'a,b' });
});
