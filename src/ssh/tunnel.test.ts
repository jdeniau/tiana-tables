import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { openTunnel } from './tunnel';

/** A child process as `spawn` returns it, driven by the test as `ssh` would behave. */
class FakeSsh extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = vi.fn(() => {
    this.emit('close', null);

    return true;
  });

  say(line: string): void {
    this.stderr.write(`${line}\r\n`);
  }

  exit(code: number): void {
    // after `stderr`'s pending chunks, as `close` comes after its stdio
    setImmediate(() => this.emit('close', code));
  }
}

const mocks = vi.hoisted(() => ({
  child: undefined as unknown as FakeSsh,
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
vi.mock('electron-log', () => ({ default: { error: vi.fn() } }));

const SSH = { host: 'bastion.example.org', port: 2222, user: 'me' };
const TARGET = { host: 'db.internal', port: 3306 };
const OPTIONS = { timeoutMs: 10_000, env: { SSH_ASKPASS: '/tmp/askpass.sh' } };
const AUTHENTICATED =
  'Authenticated to bastion.example.org ([10.0.0.1]:2222) using "publickey".';

beforeEach(() => {
  mocks.child = new FakeSsh();
  mocks.spawn.mockReset().mockReturnValue(mocks.child);
});

describe('openTunnel', () => {
  test('runs ssh forwarding its own stdio to the database, the SSH server last', () => {
    void openTunnel(SSH, TARGET, OPTIONS);

    const [command, args] = mocks.spawn.mock.calls[0] as [
      string,
      Array<string>,
    ];

    expect(command).toBe('ssh');
    expect(args).toEqual(
      expect.arrayContaining([
        '-p',
        '2222',
        '-l',
        'me',
        '-W',
        'db.internal:3306',
      ])
    );
    expect(args.slice(-2)).toEqual(['--', 'bastion.example.org']);
  });

  test('ssh asks the user through the askpass program, in the environment of the app', () => {
    void openTunnel(SSH, TARGET, OPTIONS);

    const [, , spawnOptions] = mocks.spawn.mock.calls[0] as [
      string,
      Array<string>,
      { env: Record<string, string> },
    ];

    expect(spawnOptions.env).toMatchObject({
      SSH_ASKPASS: '/tmp/askpass.sh',
      PATH: process.env.PATH,
    });
  });

  test("a port and user left out are ~/.ssh/config's to decide", () => {
    void openTunnel({ host: 'bastion' }, TARGET, OPTIONS);

    const [, args] = mocks.spawn.mock.calls[0] as [string, Array<string>];

    expect(args).not.toContain('-p');
    expect(args).not.toContain('-l');
    expect(args.at(-1)).toBe('bastion');
  });

  test('a host that looks like an option stays the destination', () => {
    void openTunnel(
      { ...SSH, host: '-oProxyCommand=touch /tmp/pwned' },
      TARGET,
      OPTIONS
    );

    const [, args] = mocks.spawn.mock.calls[0] as [string, Array<string>];

    expect(args.slice(-2)).toEqual(['--', '-oProxyCommand=touch /tmp/pwned']);
  });

  test('the stream is handed over once the SSH server let us in, and carries the database', async () => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.say(AUTHENTICATED);

    const { stream } = await opening;
    const received = new Promise((resolve) => {
      mocks.child.stdin.once('data', resolve);
    });
    stream.write('hello');

    expect(String(await received)).toBe('hello');
  });

  // ssh's words, measured on OpenSSH 10.2
  test.each([
    [
      'ssh: Could not resolve hostname nope.invalid: Name or service not known',
      'ENOTFOUND',
    ],
    [
      'ssh: connect to host 127.0.0.1 port 12299: Connection refused',
      'ECONNREFUSED',
    ],
    [
      'ssh: connect to host 10.0.0.1 port 22: Connection timed out',
      'ETIMEDOUT',
    ],
    ['nobody@127.0.0.1: Permission denied (publickey).', 'SSH_AUTH_FAILED'],
    ['Host key verification failed.', 'SSH_HOST_KEY_REJECTED'],
    [
      '@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\nHost key verification failed.',
      'SSH_HOST_KEY_CHANGED',
    ],
  ])('"%s" is told as %s', async (words, code) => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.say(words);
    mocks.child.exit(255);

    await expect(opening).rejects.toMatchObject({ code, message: words });
  });

  test('a host key just trusted is no part of the failure told', async () => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.say(
      "Warning: Permanently added '[127.0.0.2]:12222' (ED25519) to the list of known hosts.\nnobody@127.0.0.2: Permission denied (publickey)."
    );
    mocks.child.exit(255);

    await expect(opening).rejects.toMatchObject({
      code: 'SSH_AUTH_FAILED',
      message: 'nobody@127.0.0.2: Permission denied (publickey).',
    });
  });

  test('no ssh on the machine', async () => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.emit(
      'error',
      Object.assign(new Error('spawn ssh ENOENT'), { code: 'ENOENT' })
    );

    await expect(opening).rejects.toMatchObject({ code: 'SSH_MISSING' });
  });

  test('a database the SSH server cannot reach is told once ssh ends, after the stream was handed over', async () => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.say(AUTHENTICATED);
    const { ended } = await opening;

    mocks.child.say(
      'channel 0: open failed: connect failed: Connection refused'
    );
    mocks.child.say('stdio forwarding failed');
    mocks.child.exit(255);

    expect(await ended).toMatchObject({
      code: 'SSH_FORWARD_FAILED',
      message:
        'channel 0: open failed: connect failed: Connection refused\nstdio forwarding failed',
    });
  });

  test('closing the stream ends ssh, which is no failure', async () => {
    const opening = openTunnel(SSH, TARGET, OPTIONS);
    mocks.child.say(AUTHENTICATED);
    const { stream, ended } = await opening;

    stream.destroy();

    expect(await ended).toBeUndefined();
    expect(mocks.child.kill).toHaveBeenCalled();
  });
});
