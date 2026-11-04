import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { type Server, type Socket, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import log from 'electron-log';
import { z } from 'zod';
import { type SshAnswer, type SshQuestion, sshQuestionKind } from './question';

/** Asks the user, until answered or until `signal` aborts because `ssh` gave up on the question. */
export type AskUser = (
  question: SshQuestion,
  signal: AbortSignal
) => Promise<SshAnswer>;

/** The environment of one `ssh`, and what to call once it can ask no more. */
export interface TunnelAskpass {
  env: Record<string, string>;
  release(): void;
}

/** What the askpass program sends: `id` is the secret that names the tunnel asking. */
const requestSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  askpassPrompt: z.string().optional(),
});

const isWindows = process.platform === 'win32';

/** Electron in Node mode on the askpass program, `ssh` passing the question as `$1`; `SSH_ASKPASS` takes no argument. */
const LAUNCHER = isWindows
  ? '@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"%TIANA_ASKPASS_NODE%" "%TIANA_ASKPASS_MAIN%" %*\r\n'
  : '#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "$TIANA_ASKPASS_NODE" "$TIANA_ASKPASS_MAIN" "$@"\n';

interface Listening {
  server: Server;
  folder: string;
  handle: string;
  launcher: string;
}

/**
 * The local socket the askpass program reaches the app through, one per app.
 * It lives in a folder only the user can open, and answers only the tunnels it gave an id to.
 */
export class AskpassServer {
  readonly #ask: AskUser;
  readonly #program: string;
  readonly #nodePath: string;
  /** the connection each living tunnel opens, by the id its `ssh` was given */
  readonly #tunnels = new Map<string, string>();
  #listening: Promise<Listening> | undefined;
  #listened: Listening | undefined;

  /** `program`: the askpass program, run by `nodePath` in Node mode */
  constructor(ask: AskUser, program: string, nodePath = process.execPath) {
    this.#ask = ask;
    this.#program = program;
    this.#nodePath = nodePath;
  }

  async forTunnel(connection: string): Promise<TunnelAskpass> {
    this.#listening ??= this.#listen().catch((error: unknown) => {
      // the next tunnel tries again
      this.#listening = undefined;
      throw error;
    });
    const { handle, launcher } = await this.#listening;
    const id = randomUUID();

    this.#tunnels.set(id, connection);

    return {
      env: {
        SSH_ASKPASS: launcher,
        // `ssh` asks through SSH_ASKPASS even with a terminal, and on Windows, which has no DISPLAY
        SSH_ASKPASS_REQUIRE: 'force',
        TIANA_ASKPASS_HANDLE: handle,
        TIANA_ASKPASS_ID: id,
        TIANA_ASKPASS_MAIN: this.#program,
        TIANA_ASKPASS_NODE: this.#nodePath,
      },
      release: () => {
        this.#tunnels.delete(id);
      },
    };
  }

  /** Synchronous, so it completes while the app quits. */
  close(): void {
    if (!this.#listened) {
      return;
    }

    const { server, folder } = this.#listened;

    this.#listening = undefined;
    this.#listened = undefined;
    server.close();
    rmSync(folder, { recursive: true, force: true });
  }

  async #listen(): Promise<Listening> {
    // created 0700: no other user of the machine reaches the socket
    const folder = await mkdtemp(path.join(tmpdir(), 'tiana-askpass-'));
    const launcher = path.join(
      folder,
      isWindows ? 'askpass.cmd' : 'askpass.sh'
    );
    const handle = isWindows
      ? `\\\\.\\pipe\\tiana-askpass-${randomUUID()}`
      : path.join(folder, 'askpass.sock');

    const server = createServer((socket) => {
      // a program killed by `ssh` mid-answer is no failure of ours
      socket.on('error', () => {});
      this.#serve(socket).catch((error: unknown) => {
        log.error('SSH askpass request', error);
        socket.destroy();
      });
    });

    try {
      await writeFile(launcher, LAUNCHER, { mode: 0o700 });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(handle, resolve);
      });
    } catch (error) {
      rmSync(folder, { recursive: true, force: true });
      throw error;
    }

    this.#listened = { server, folder, handle, launcher };

    return this.#listened;
  }

  async #serve(socket: Socket): Promise<void> {
    const line = await firstLine(socket);
    const request = requestSchema.parse(JSON.parse(line));
    const connection = this.#tunnels.get(request.id);

    if (connection === undefined) {
      socket.destroy();

      return;
    }

    // `ssh` kills the program when it takes a notice back, or gives up
    const gone = new AbortController();
    socket.once('close', () => gone.abort());

    const answer = await this.#ask(
      {
        id: randomUUID(),
        connection,
        prompt: request.prompt,
        kind: sshQuestionKind(request.prompt, request.askpassPrompt),
      },
      gone.signal
    );

    if (!socket.destroyed) {
      socket.end(`${JSON.stringify({ answer })}\n`);
    }
  }
}

function firstLine(socket: Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    let received = '';

    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      received += chunk;
      const end = received.indexOf('\n');

      if (end !== -1) {
        socket.removeAllListeners('data');
        resolve(received.slice(0, end));
      }
    });
    socket.once('end', () => reject(new Error('askpass closed before asking')));
  });
}
