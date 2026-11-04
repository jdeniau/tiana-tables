import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, onTestFinished, test, vi } from 'vitest';
import { SshQuestionKind } from '../question';
import { type AskUser, AskpassServer } from './index';

vi.mock('electron-log', () => ({ default: { error: vi.fn() } }));

/** the very program `ssh` runs, here by Node itself */
const PROGRAM = fileURLToPath(new URL('../askpass.ts', import.meta.url));

const HOST_KEY_PROMPT = `The authenticity of host '[127.0.0.1]:12222 ([127.0.0.1]:12222)' can't be established.
ED25519 key fingerprint is: SHA256:ueXRH9X6tUARSk/X3pC5fp2OWGuFK1+5xGUK4mEtqyQ
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? `;

let server: AskpassServer | undefined;

afterEach(() => {
  vi.unstubAllEnvs();
  server?.close();
  server = undefined;
});

/** What `ssh` does: run SSH_ASKPASS with the question, read its output and exit code. */
function askAsSshDoes(
  env: Record<string, string>,
  prompt: string,
  onSpawn?: (kill: () => void) => void
): Promise<{ output: string; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(env.SSH_ASKPASS as string, [prompt], {
      env: { ...process.env, ...env },
    });
    let output = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('close', (code) => resolve({ output, code }));
    onSpawn?.(() => child.kill());
  });
}

describe.skipIf(process.platform === 'win32')('AskpassServer', () => {
  test("a host key question reaches the user with the connection's name, and ssh reads their answer", async () => {
    const ask = vi.fn<AskUser>().mockResolvedValue('yes');
    server = new AskpassServer(ask, PROGRAM);
    const { env } = await server.forTunnel('mariadb via SSH (dev)');

    const { output, code } = await askAsSshDoes(env, HOST_KEY_PROMPT);

    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: 'mariadb via SSH (dev)',
        prompt: HOST_KEY_PROMPT,
        kind: SshQuestionKind.HostKey,
      }),
      expect.any(AbortSignal)
    );
    expect({ output, code }).toEqual({ output: 'yes\n', code: 0 });
  });

  test('a cancelled question tells ssh so, with nothing to read', async () => {
    server = new AskpassServer(() => Promise.resolve(null), PROGRAM);
    const { env } = await server.forTunnel('mariadb via SSH (dev)');

    expect(
      await askAsSshDoes(env, "Enter passphrase for key '/home/me/.ssh/id':")
    ).toEqual({ output: '', code: 1 });
  });

  test('a tunnel released asks nobody anymore', async () => {
    const ask = vi.fn<AskUser>().mockResolvedValue('secret');
    server = new AskpassServer(ask, PROGRAM);
    const { env, release } = await server.forTunnel('mariadb via SSH (dev)');

    release();

    expect(await askAsSshDoes(env, 'Password:')).toEqual({
      output: '',
      code: 1,
    });
    expect(ask).not.toHaveBeenCalled();
  });

  test('ssh killing the program takes the question back', async () => {
    let signal: AbortSignal | undefined;
    let kill: () => void = () => {};
    server = new AskpassServer((_question, given) => {
      signal = given;
      kill();

      return new Promise(() => {});
    }, PROGRAM);
    const { env } = await server.forTunnel('mariadb via SSH (dev)');

    await askAsSshDoes(env, 'Confirm user presence for key ED25519-SK', (k) => {
      kill = k;
    });

    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  });

  test('a socket that could not listen leaves nothing behind, and the next tunnel tries again', async () => {
    // past the 108 bytes of a Unix socket path, `listen` fails with EINVAL
    const longTmp = mkdtempSync(path.join(tmpdir(), 'x'.repeat(110)));
    onTestFinished(() => rmSync(longTmp, { recursive: true }));
    vi.stubEnv('TMPDIR', longTmp);
    server = new AskpassServer(() => Promise.resolve(null), PROGRAM);

    await expect(server.forTunnel('mariadb via SSH (dev)')).rejects.toThrow(
      'EINVAL'
    );
    expect(readdirSync(longTmp)).toEqual([]);

    vi.unstubAllEnvs();

    await expect(
      server.forTunnel('mariadb via SSH (dev)')
    ).resolves.toHaveProperty('env.SSH_ASKPASS');
  });

  test('closing removes the socket and the launcher', async () => {
    server = new AskpassServer(() => Promise.resolve(null), PROGRAM);
    const { env } = await server.forTunnel('mariadb via SSH (dev)');

    server.close();

    expect(existsSync(path.dirname(env.SSH_ASKPASS as string))).toBe(false);
  });
});
