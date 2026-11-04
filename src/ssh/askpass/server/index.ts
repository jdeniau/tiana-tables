import { randomUUID } from 'node:crypto';
import { type Server, type Socket, createServer } from 'node:net';
import log from 'electron-log';
import { z } from 'zod';
import { type SshAnswer, type SshQuestion, sshQuestionKind } from '../question';
import { UnixAskpass } from './unix';
import { WindowsAskpass } from './windows';

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

/** What `ssh` needs to reach the app. */
export interface PreparedAskpass {
  /** the socket's path, or pipe name */
  handle: string;
  /** `SSH_ASKPASS` and what the program it names reads */
  env: Record<string, string>;
}

/** What differs between Windows and Unix: where the socket lives, and how `ssh` starts the askpass program. */
export interface AskpassPlatform {
  prepare(): Promise<PreparedAskpass>;
  /** Removes what `prepare` laid down: synchronous, so it completes while the app quits. */
  remove(): void;
}

interface Listening extends PreparedAskpass {
  server: Server;
}

/**
 * The local socket the askpass program reaches the app through, one per app.
 * It answers only the tunnels it gave an id to.
 */
export class AskpassServer {
  readonly #ask: AskUser;
  readonly #platform: AskpassPlatform;
  /** the connection each living tunnel opens, by the id its `ssh` was given */
  readonly #tunnels = new Map<string, string>();
  #listening: Promise<Listening> | undefined;
  #listened: Listening | undefined;

  /** `program`: the askpass program, run by `nodePath` in Node mode */
  constructor(ask: AskUser, program: string, nodePath = process.execPath) {
    this.#ask = ask;
    this.#platform =
      process.platform === 'win32'
        ? new WindowsAskpass(nodePath, program)
        : new UnixAskpass(nodePath, program);
  }

  async forTunnel(connection: string): Promise<TunnelAskpass> {
    this.#listening ??= this.#listen().catch((error: unknown) => {
      // the next tunnel tries again
      this.#listening = undefined;
      throw error;
    });
    const { handle, env } = await this.#listening;
    const id = randomUUID();

    this.#tunnels.set(id, connection);

    return {
      env: {
        ...env,
        // `ssh` asks through SSH_ASKPASS even with a terminal, and on Windows, which has no DISPLAY
        SSH_ASKPASS_REQUIRE: 'force',
        TIANA_ASKPASS_HANDLE: handle,
        TIANA_ASKPASS_ID: id,
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

    const { server } = this.#listened;

    this.#listening = undefined;
    this.#listened = undefined;
    server.close();
    this.#platform.remove();
  }

  async #listen(): Promise<Listening> {
    const server = createServer((socket) => {
      // a program killed by `ssh` mid-answer is no failure of ours
      socket.on('error', () => {});
      this.#serve(socket).catch((error: unknown) => {
        log.error('SSH askpass request', error);
        socket.destroy();
      });
    });

    try {
      const prepared = await this.#platform.prepare();

      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(prepared.handle, resolve);
      });
      this.#listened = { server, ...prepared };

      return this.#listened;
    } catch (error) {
      this.#platform.remove();
      throw error;
    }
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
