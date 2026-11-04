import { randomUUID } from 'node:crypto';
import type { AskpassPlatform, PreparedAskpass } from './index';

/**
 * A named pipe, and `ssh` starting the app's binary on the askpass program itself.
 * Never a batch file: cmd.exe would run what an SSH server writes in its question.
 */
export class WindowsAskpass implements AskpassPlatform {
  readonly #nodePath: string;
  readonly #program: string;

  constructor(nodePath: string, program: string) {
    this.#nodePath = nodePath;
    this.#program = program;
  }

  prepare(): Promise<PreparedAskpass> {
    return Promise.resolve({
      handle: `\\\\.\\pipe\\tiana-askpass-${randomUUID()}`,
      env: {
        // Win32-OpenSSH starts a value opening with a quote as a program and its arguments
        SSH_ASKPASS: `"${this.#nodePath}" "${this.#program}"`,
        ELECTRON_RUN_AS_NODE: '1',
      },
    });
  }

  remove(): void {
    // a named pipe goes with its server
  }
}
