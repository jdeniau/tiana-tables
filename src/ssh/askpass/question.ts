/** What a question of `ssh` expects from the user, so the dialog offers the right answers. */
export enum SshQuestionKind {
  /** an unknown host key: trusting it answers `yes`, which `ssh` writes to `known_hosts` */
  HostKey = 'hostKey',
  /** a passphrase, a password or a one-time code, typed hidden */
  Secret = 'secret',
  /** a yes or no of the agent or the key (`SSH_ASKPASS_PROMPT=confirm`) */
  Confirm = 'confirm',
  /** a message with nothing to answer, which `ssh` takes back itself (`SSH_ASKPASS_PROMPT=none`) */
  Notice = 'notice',
}

/** The values `ssh` gives `SSH_ASKPASS_PROMPT`; unset for a host key or a passphrase (measured on OpenSSH 10.2). */
enum AskpassPrompt {
  Confirm = 'confirm',
  None = 'none',
}

export interface SshQuestion {
  id: string;
  /** the name of the connection being opened */
  connection: string;
  /** `ssh`'s own words, the host key fingerprint or the key's path included */
  prompt: string;
  kind: SshQuestionKind;
}

/** The answer a dialog gives back, `null` when the user cancelled. */
export type SshAnswer = string | null;

export interface SshQuestionAnswer {
  questionId: string;
  answer: SshAnswer;
}

/** The kind of a question, from `ssh`'s words and the `SSH_ASKPASS_PROMPT` it set. */
export function sshQuestionKind(
  prompt: string,
  askpassPrompt: string | undefined
): SshQuestionKind {
  if (askpassPrompt === AskpassPrompt.Confirm) {
    return SshQuestionKind.Confirm;
  }

  if (askpassPrompt === AskpassPrompt.None) {
    return SshQuestionKind.Notice;
  }

  // "Are you sure you want to continue connecting (yes/no/[fingerprint])?"
  if (/\(yes\/no(\/\[fingerprint\])?\)\?\s*$/.test(prompt)) {
    return SshQuestionKind.HostKey;
  }

  return SshQuestionKind.Secret;
}
