import { describe, expect, test } from 'vitest';
import { SshQuestionKind, sshQuestionKind } from './question';

// ssh's words: the host key with `[fingerprint]` and the passphrase measured on OpenSSH 10.2
describe('sshQuestionKind', () => {
  test.each([
    [
      "The authenticity of host '[127.0.0.1]:12222' can't be established.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? ",
      undefined,
      SshQuestionKind.HostKey,
    ],
    [
      'Are you sure you want to continue connecting (yes/no)? ',
      undefined,
      SshQuestionKind.HostKey,
    ],
    [
      "Enter passphrase for key '/home/me/.ssh/id_ed25519': ",
      undefined,
      SshQuestionKind.Secret,
    ],
    ['(me@bastion) Password: ', undefined, SshQuestionKind.Secret],
    ['Allow use of key ED25519?', 'confirm', SshQuestionKind.Confirm],
    [
      'Confirm user presence for key ED25519-SK',
      'none',
      SshQuestionKind.Notice,
    ],
  ])('%j with SSH_ASKPASS_PROMPT=%s is a %s', (prompt, askpassPrompt, kind) => {
    expect(sshQuestionKind(prompt, askpassPrompt)).toBe(kind);
  });
});
