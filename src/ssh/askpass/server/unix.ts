import { rmSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AskpassPlatform, PreparedAskpass } from './index';

/** Electron in Node mode on the askpass program, `ssh` passing the question as `$1`; `SSH_ASKPASS` takes no argument. */
const LAUNCHER =
  '#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "$TIANA_ASKPASS_NODE" "$TIANA_ASKPASS_MAIN" "$@"\n';

/** The socket and the launcher, in a folder only the user can open. */
export class UnixAskpass implements AskpassPlatform {
  readonly #nodePath: string;
  readonly #program: string;
  #folder: string | undefined;

  constructor(nodePath: string, program: string) {
    this.#nodePath = nodePath;
    this.#program = program;
  }

  async prepare(): Promise<PreparedAskpass> {
    // created 0700: no other user of the machine reaches the socket
    this.#folder = await mkdtemp(path.join(tmpdir(), 'tiana-askpass-'));
    const launcher = path.join(this.#folder, 'askpass.sh');

    await writeFile(launcher, LAUNCHER, { mode: 0o700 });

    return {
      handle: path.join(this.#folder, 'askpass.sock'),
      env: {
        SSH_ASKPASS: launcher,
        TIANA_ASKPASS_MAIN: this.#program,
        TIANA_ASKPASS_NODE: this.#nodePath,
      },
    };
  }

  remove(): void {
    if (this.#folder !== undefined) {
      rmSync(this.#folder, { recursive: true, force: true });
      this.#folder = undefined;
    }
  }
}
