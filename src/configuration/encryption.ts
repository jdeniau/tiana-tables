import { app, dialog, safeStorage } from 'electron';
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
  available: boolean;
  backend: StorageBackend | null;
  /**
   * `basic_text` means Electron derives its key from a hardcoded password:
   * that is obfuscation, not encryption. `unknown` means we asked before the
   * `ready` event, so we cannot tell — treated as insecure on purpose.
   */
  isSecure: boolean;
};

export function getEncryptionStatus(): EncryptionStatus {
  const available = safeStorage.isEncryptionAvailable();

  // getSelectedStorageBackend is Linux-only
  const backend =
    process.platform === 'linux'
      ? safeStorage.getSelectedStorageBackend()
      : null;

  return {
    available,
    backend,
    isSecure: available && backend !== 'basic_text' && backend !== 'unknown',
  };
}

/**
 * Called once at startup, so that the log tells which backend is in use — the
 * only trace left when a password silently stops being protected.
 */
export function logEncryptionStatus(): void {
  const { available, backend, isSecure } = getEncryptionStatus();

  log.info('safeStorage status:', { available, backend, isSecure });

  if (!available) {
    log.error(
      'safeStorage: encryption is unavailable, connection passwords cannot be stored'
    );

    return;
  }

  if (!isSecure) {
    log.warn(
      `safeStorage: backend "${backend}" derives its key from a hardcoded password. Stored passwords are obfuscated, not encrypted.`
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

export function encryptPassword(password: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new EncryptionUnavailableError();
  }

  warnIfBackendIsInsecure();

  return safeStorage.encryptString(password).toString('base64');
}

/** `null` when the ciphertext cannot be read back — a connection stored without a password decrypts to `''`, never to `null`. */
export function decryptPassword(encryptedPassword: string): string | null {
  // safeStorage rejects the empty buffer, and an empty password is not an unreadable one
  if (encryptedPassword === '') {
    return '';
  }

  try {
    return safeStorage.decryptString(Buffer.from(encryptedPassword, 'base64'));
  } catch (error) {
    log.error('safeStorage: could not decrypt a stored password', error);

    return null;
  }
}

/**
 * Takes the connections whose stored password did not decrypt, and tells the two accidents apart: a key out of reach, or a key gone for good.
 * Only a restart can pick a locked keyring back up — safeStorage reads it once and caches that answer for the life of the process.
 */
export async function warnKeyringIsLocked(
  unreadableConnectionNames: Array<string>
): Promise<void> {
  if (unreadableConnectionNames.length === 0) {
    return;
  }

  const { available, backend } = getEncryptionStatus();
  const connections = unreadableConnectionNames.join(', ');

  // encryption works, so the key is not locked away: it is gone, and those passwords have to be typed again
  if (available) {
    log.warn('safeStorage: stored passwords could not be read', connections);

    void dialog.showMessageBox({
      type: 'warning',
      title: t('config.encryption.unreadable.title'),
      message: t('config.encryption.unreadable.message', { connections }),
      detail: t('config.encryption.unreadable.detail'),
    });

    return;
  }

  log.error(
    `safeStorage: encryption is unavailable (backend "${backend}"), stored passwords cannot be read`
  );

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: t('config.encryption.locked.title'),
    message: t('config.encryption.locked.message'),
    detail: t('config.encryption.locked.detail', { backend: String(backend) }),
    buttons: [
      t('config.encryption.locked.restart'),
      t('config.encryption.locked.continue'),
    ],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    app.relaunch();
    app.exit(0);
  }
}

export const testables = {
  resetInsecureBackendWarning: () => {
    insecureBackendWarned = false;
  },
};
