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

/**
 * `os_crypt_async` writes the tag of the provider its key came from in front of every ciphertext: `v10` for the key Chromium carries in its own binary, `v11` for a Secret Service or KWallet keyring, `v12` for the Flatpak portal.
 * `null` for an empty password, which Chromium encrypts to an empty buffer without asking any provider.
 */
function keyProviderTag(ciphertext: Buffer): string | null {
  return ciphertext.length === 0
    ? null
    : ciphertext.subarray(0, 3).toString('latin1');
}

/** the key built into Chromium: nothing answered, and the password is obfuscated rather than encrypted */
const HARDCODED_KEY_TAG = 'v10';

/**
 * Called once at startup. `getSelectedStorageBackend()` describes the **legacy** selection, made from
 * the desktop environment name alone, so it answers `basic_text` under a compositor Chromium does not
 * know (Hyprland, sway…) where the asynchronous providers find a keyring over D-Bus. It goes to the
 * log as a hint, never as a verdict — the verdict is the tag of a real ciphertext.
 */
export async function logEncryptionStatus(): Promise<void> {
  const legacyBackend =
    process.platform === 'linux'
      ? safeStorage.getSelectedStorageBackend()
      : null;
  const available = await safeStorage.isAsyncEncryptionAvailable();

  log.info('safeStorage status:', { available, legacyBackend });

  if (!available) {
    log.error(
      'safeStorage: the asynchronous encryptor never initialized, connection passwords cannot be stored'
    );
  }
}

let insecureKeyWarned = false;

/**
 * Warn the user the first time a password is actually persisted with the key built into the
 * application. At startup it would be noise, and a guess; here the ciphertext in hand names the
 * provider that answered.
 */
function warnIfKeyIsNotFromAKeyring(tag: string | null): void {
  if (insecureKeyWarned || tag !== HARDCODED_KEY_TAG) {
    return;
  }

  insecureKeyWarned = true;

  log.warn(
    `safeStorage: no keyring answered (key tagged "${tag}"), stored passwords are obfuscated rather than encrypted`
  );

  void dialog.showMessageBox({
    type: 'warning',
    title: t('config.encryption.insecureBackend.title'),
    message: t('config.encryption.insecureBackend.message'),
    detail: t('config.encryption.insecureBackend.detail'),
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

  warnIfKeyIsNotFromAKeyring(keyProviderTag(encrypted));

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
    insecureKeyWarned = false;
  },
};
