import { dialog, safeStorage } from 'electron';
import log from 'electron-log';
import { t } from '../i18n';

/**
 * Thrown when the OS cannot encrypt: we refuse to persist a password rather
 * than writing it unprotected.
 */
export class EncryptionUnavailableError extends Error {
  constructor() {
    super('safeStorage reports that encryption is not available');
    this.name = 'EncryptionUnavailableError';
  }
}

/** Linux-only: the password store Electron picked. `null` on macOS/Windows. */
type StorageBackend = ReturnType<typeof safeStorage.getSelectedStorageBackend>;

type EncryptionStatus = {
  backend: StorageBackend | null;
  /**
   * `basic_text` means the key is derived from a hardcoded password: that is obfuscation, not encryption.
   * `unknown` means we asked before the `ready` event, so we cannot tell — treated as insecure on purpose.
   * It is read from `getSelectedStorageBackend()`, which describes the legacy desktop-environment detection and not the providers the asynchronous API uses: those probe D-Bus and can find a keyring where this answers `basic_text`.
   * So it is pessimistic, never optimistic — precise enough to warn on, not to stay silent on.
   */
  isSecure: boolean;
};

export function getEncryptionStatus(): EncryptionStatus {
  // getSelectedStorageBackend is Linux-only
  const backend =
    process.platform === 'linux'
      ? safeStorage.getSelectedStorageBackend()
      : null;

  return {
    backend,
    isSecure: backend !== 'basic_text' && backend !== 'unknown',
  };
}

/**
 * Called once at startup, so that the log tells which backend is in use — the
 * only trace left when a password silently stops being protected.
 */
export async function logEncryptionStatus(): Promise<void> {
  const { backend, isSecure } = getEncryptionStatus();
  const available = await safeStorage.isAsyncEncryptionAvailable();

  log.info('safeStorage status:', { available, backend, isSecure });

  if (!available) {
    log.error(
      'safeStorage: the asynchronous encryptor never initialized, connection passwords cannot be stored'
    );

    return;
  }

  if (!isSecure) {
    log.warn(
      `safeStorage: backend "${backend}" derives its key from a hardcoded password. Stored passwords may be obfuscated rather than encrypted.`
    );
  }
}

let insecureBackendWarned = false;

/**
 * Warn the user the first time a password is actually persisted on an insecure
 * backend. At startup it would be noise; at save time it is the moment the
 * choice matters.
 */
function warnIfBackendIsInsecure(): void {
  if (insecureBackendWarned) {
    return;
  }

  const { isSecure, backend } = getEncryptionStatus();

  if (isSecure) {
    return;
  }

  insecureBackendWarned = true;

  void dialog.showMessageBox({
    type: 'warning',
    title: t('config.encryption.insecureBackend.title'),
    message: t('config.encryption.insecureBackend.message'),
    detail: t('config.encryption.insecureBackend.detail', {
      backend: String(backend),
    }),
  });
}

export async function encryptPassword(password: string): Promise<string> {
  let encrypted: Buffer;

  try {
    encrypted = await safeStorage.encryptStringAsync(password);
  } catch (error) {
    log.error('safeStorage: could not encrypt a password', error);

    throw new EncryptionUnavailableError();
  }

  warnIfBackendIsInsecure();

  return encrypted.toString('base64');
}

export type DecryptedPassword =
  | { status: 'ok'; password: string }
  /** the key exists but is out of reach for now — a locked keyring */
  | { status: 'locked' }
  /** the key that wrote this ciphertext is gone: no retry will read it */
  | { status: 'unreadable' };

/**
 * The two failures are not the same accident and do not deserve the same answer, so they are told apart here rather than merged into one: a locked keyring is worth retrying, a lost key is only worth retyping.
 * Electron gives no code to tell them apart, only the message it builds for the `temporarily_unavailable` flag of `os_crypt_async` — hence the string test.
 * A message we fail to recognise falls back to `unreadable`, the conservative side: it asks the user rather than offering a retry that cannot succeed.
 */
export async function decryptPassword(
  encryptedPassword: string
): Promise<DecryptedPassword> {
  // safeStorage rejects the empty buffer, and an empty password is not an unreadable one
  if (encryptedPassword === '') {
    return { status: 'ok', password: '' };
  }

  try {
    const { result } = await safeStorage.decryptStringAsync(
      Buffer.from(encryptedPassword, 'base64')
    );

    return { status: 'ok', password: result };
  } catch (error) {
    log.error('safeStorage: could not decrypt a stored password', error);

    const message = error instanceof Error ? error.message : String(error);

    return {
      status: message.includes('temporarily unavailable')
        ? 'locked'
        : 'unreadable',
    };
  }
}

export const testables = {
  resetInsecureBackendWarning: () => {
    insecureBackendWarned = false;
  },
};
