import { spawn } from 'node:child_process';
import { Duplex } from 'node:stream';
import log from 'electron-log';
import { NetworkErrorCode } from '../networkErrorCode';
import { SshErrorCode } from './sshErrorCode';
import type { SshTunnel } from './types';

/** What `ssh` writes once the SSH server let us in, at `LogLevel=VERBOSE`. */
const AUTHENTICATED = 'Authenticated to ';
/** what `ssh` writes once a host key is trusted: no part of a failure */
const HOST_KEY_ADDED = 'Warning: Permanently added ';

/**
 * `ssh`'s own words for a failure, the first match wins, as the `code` `classifyConnectionError` reads.
 * Measured on OpenSSH 10.2: a refused forward also ends in "Connection refused", hence its place first.
 */
const FAILURES = [
  ['channel 0: open failed', SshErrorCode.ForwardFailed],
  ['REMOTE HOST IDENTIFICATION HAS CHANGED', SshErrorCode.HostKeyChanged],
  ['Host key verification failed', SshErrorCode.HostKeyRejected],
  ['Permission denied', SshErrorCode.AuthFailed],
  ['Could not resolve hostname', NetworkErrorCode.NotFound],
  ['Connection refused', NetworkErrorCode.Refused],
  ['timed out', NetworkErrorCode.TimedOut],
] as const;

export interface OpenedTunnel {
  /** the stream to the database, forwarded by the SSH server */
  stream: Duplex;
  /** once `ssh` has ended: what failed, `undefined` when it ended cleanly or was closed by us */
  ended: Promise<Error | undefined>;
}

function sshArguments(
  ssh: SshTunnel,
  target: { host: string; port: number },
  timeoutMs: number
): Array<string> {
  return [
    ...['-o', 'LogLevel=VERBOSE'],
    ...['-o', `ConnectTimeout=${Math.ceil(timeoutMs / 1000)}`],
    // a ControlMaster of ~/.ssh/config would authenticate in its own process, and never write AUTHENTICATED
    ...['-o', 'ControlPath=none'],
    // a LocalForward of ~/.ssh/config would take a port on every connection
    ...['-o', 'ClearAllForwardings=yes'],
    ...['-o', 'RemoteCommand=none'],
    ...['-o', 'RequestTTY=no'],
    ...['-o', 'ServerAliveInterval=30'],
    ...(ssh.port === undefined ? [] : ['-p', String(ssh.port)]),
    ...(ssh.user ? ['-l', ssh.user] : []),
    ...['-W', `${target.host}:${target.port}`],
    // a host starting with `-` (`-oProxyCommand=…`) must not be read as an option
    '--',
    ssh.host,
  ];
}

/** The error `ssh` ended with, `ssh`'s own lines as its message. */
function sshFailure(stderr: string): Error {
  const lines = stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line !== '' &&
        !line.startsWith(AUTHENTICATED) &&
        !line.startsWith(HOST_KEY_ADDED)
    );
  const code = FAILURES.find(([words]) => stderr.includes(words))?.[1];

  return Object.assign(new Error(lines.join('\n') || 'ssh failed'), { code });
}

/**
 * A stream to `target`, forwarded by the SSH server through the system's `ssh -W`: no local port is opened,
 * and `~/.ssh/config`, `known_hosts` and the SSH agent are the user's own.
 * Resolved once the SSH server let us in; destroying the stream ends `ssh`, and `ssh` ending ends the stream.
 */
export function openTunnel(
  ssh: SshTunnel,
  target: { host: string; port: number },
  options: {
    timeoutMs: number;
    /** what `ssh` asks the user through: `SSH_ASKPASS` and its own variables */
    env: Record<string, string>;
  }
): Promise<OpenedTunnel> {
  const child = spawn('ssh', sshArguments(ssh, target, options.timeoutMs), {
    env: { ...process.env, ...options.env },
    windowsHide: true,
  });
  let stderr = '';
  let stream: Duplex | undefined;

  const ended = new Promise<Error | undefined>((resolve) => {
    child.once('close', (code) => {
      // `null`: killed by a signal, which only we send
      if (code === 0 || code === null) {
        resolve(undefined);

        return;
      }

      const error = sshFailure(stderr);
      log.error(
        `SSH connection to "${ssh.port === undefined ? ssh.host : `${ssh.host}:${ssh.port}`}"`,
        error
      );
      resolve(error);
    });
  });

  return new Promise((resolve, reject) => {
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT'
          ? Object.assign(error, { code: SshErrorCode.Missing })
          : error
      );
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;

      if (stream === undefined && stderr.includes(AUTHENTICATED)) {
        stream = Duplex.from({ readable: child.stdout, writable: child.stdin });
        // destroyed with no error, the stream emits an `AbortError` of its own: the driver reads `ended` instead
        stream.on('error', () => {});
        stream.once('close', () => {
          child.kill();
        });
        resolve({ stream, ended });
      }
    });

    // a failure before the SSH server let us in: `ssh` ends without a stream to hand over
    void ended.then((error) => {
      if (stream === undefined) {
        reject(error ?? sshFailure(stderr));
      }
    });
  });
}
