import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { type Server, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';

const PROGRAM = fileURLToPath(new URL('./askpass.ts', import.meta.url));

let server: Server | undefined;
let folder: string | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
  if (folder) {
    rmSync(folder, { recursive: true, force: true });
  }
  folder = undefined;
});

/** The program run by `ssh`, against an app that answers `reply` whatever it is asked. */
async function askAnswered(
  reply: string
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  folder = mkdtempSync(path.join(tmpdir(), 'tiana-askpass-test-'));
  const handle = path.join(folder, 'askpass.sock');
  const listening = createServer((socket) => {
    socket.once('data', () => socket.end(reply));
  });
  server = listening;
  await new Promise<void>((resolve) => listening.listen(handle, resolve));

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [PROGRAM, 'Password:'], {
      env: {
        ...process.env,
        TIANA_ASKPASS_HANDLE: handle,
        TIANA_ASKPASS_ID: 'id',
      },
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe.skipIf(process.platform === 'win32')('the askpass program', () => {
  test('prints the answer for ssh to read', async () => {
    expect(await askAnswered('{"answer":"my passphrase"}\n')).toEqual({
      code: 0,
      stdout: 'my passphrase\n',
      stderr: '',
    });
  });

  test.each([
    ['cut short', '{"answer":"my pass'],
    ['not an object', 'null'],
    ['not a text', '{"answer":42}'],
  ])(
    'an answer %s is a refusal, with nothing written for ssh to show',
    async (_case, reply) => {
      expect(await askAnswered(reply)).toEqual({
        code: 1,
        stdout: '',
        stderr: '',
      });
    }
  );
});
