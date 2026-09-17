import { dialog, safeStorage } from 'electron';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  EncryptionUnavailableError,
  decryptPassword,
  encryptPassword,
  getEncryptionStatus,
  logEncryptionStatus,
  testables,
} from './encryption';

vi.mock('electron', () => ({
  safeStorage: {
    encryptStringAsync: vi.fn((s: string) =>
      Promise.resolve(Buffer.from(`encrypted-${s}`))
    ),
    decryptStringAsync: vi.fn((b: Buffer) =>
      Promise.resolve({
        result: b.toString().substring(10),
        shouldReEncrypt: false,
      })
    ),
    isAsyncEncryptionAvailable: vi.fn(() => Promise.resolve(true)),
    getSelectedStorageBackend: vi.fn(() => 'gnome_libsecret'),
  },
  dialog: {
    showErrorBox: vi.fn(),
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
  },
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockIsAsyncEncryptionAvailable = vi.mocked(
  safeStorage.isAsyncEncryptionAvailable
);
const mockGetSelectedStorageBackend = vi.mocked(
  safeStorage.getSelectedStorageBackend
);
const mockEncryptStringAsync = vi.mocked(safeStorage.encryptStringAsync);
const mockDecryptStringAsync = vi.mocked(safeStorage.decryptStringAsync);
const mockShowMessageBox = vi.mocked(dialog.showMessageBox);

const realPlatform = process.platform;

function mockPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

beforeEach(() => {
  mockPlatform('linux');
  mockIsAsyncEncryptionAvailable.mockResolvedValue(true);
  mockGetSelectedStorageBackend.mockReturnValue('gnome_libsecret');
  // `clearAllMocks` forgets the calls, not the implementations: every test starts from a keyring that answers
  mockEncryptStringAsync.mockImplementation((plain: string) =>
    Promise.resolve(Buffer.from(`encrypted-${plain}`))
  );
  mockDecryptStringAsync.mockImplementation((encrypted: Buffer) =>
    Promise.resolve({
      result: encrypted.toString().substring(10),
      shouldReEncrypt: false,
    })
  );
  testables.resetInsecureBackendWarning();
});

afterEach(() => {
  mockPlatform(realPlatform);
  vi.clearAllMocks();
});

describe('getEncryptionStatus', () => {
  test('a real keyring is secure', () => {
    expect(getEncryptionStatus()).toEqual({
      backend: 'gnome_libsecret',
      isSecure: true,
    });
  });

  test('basic_text is NOT secure', () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');

    expect(getEncryptionStatus()).toEqual({
      backend: 'basic_text',
      isSecure: false,
    });
  });

  test('unknown backend is treated as insecure', () => {
    mockGetSelectedStorageBackend.mockReturnValue('unknown');

    expect(getEncryptionStatus().isSecure).toBe(false);
  });

  test('the Linux-only backend is not read on macOS', () => {
    mockPlatform('darwin');

    expect(getEncryptionStatus()).toEqual({ backend: null, isSecure: true });
    expect(mockGetSelectedStorageBackend).not.toHaveBeenCalled();
  });
});

describe('encryptPassword', () => {
  test('encrypts when the keyring answers', async () => {
    expect(await encryptPassword('password')).toBe(
      Buffer.from('encrypted-password').toString('base64')
    );
  });

  test('a keyring that refuses throws instead of storing an unprotected password', async () => {
    mockEncryptStringAsync.mockRejectedValue(new Error('no encryptor'));

    await expect(encryptPassword('password')).rejects.toThrow(
      EncryptionUnavailableError
    );
  });

  test('warns once when the backend only obfuscates', async () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');

    await encryptPassword('password');
    await encryptPassword('another');

    expect(mockShowMessageBox).toHaveBeenCalledOnce();
    expect(mockShowMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'config.encryption.insecureBackend.title',
      })
    );
  });

  test('does not warn on a real keyring', async () => {
    await encryptPassword('password');

    expect(mockShowMessageBox).not.toHaveBeenCalled();
  });
});

describe('decryptPassword', () => {
  test('decrypts a stored password', async () => {
    expect(
      await decryptPassword(
        Buffer.from('encrypted-password').toString('base64')
      )
    ).toEqual({ status: 'ok', password: 'password' });
  });

  test('a connection stored without a password is not unreadable', async () => {
    expect(await decryptPassword('')).toEqual({ status: 'ok', password: '' });
    expect(mockDecryptStringAsync).not.toHaveBeenCalled();
  });

  test('a locked keyring is worth retrying, and says so', async () => {
    // the only signal Electron gives: the message it builds for the `temporarily_unavailable` flag
    mockDecryptStringAsync.mockRejectedValue(
      new Error('OSCrypt is temporarily unavailable')
    );

    expect(await decryptPassword('some-ciphertext')).toEqual({
      status: 'locked',
    });
  });

  test('any other refusal is a key we will never get back', async () => {
    mockDecryptStringAsync.mockRejectedValue(
      new Error('Error while decrypting the ciphertext provided')
    );

    expect(await decryptPassword('some-ciphertext')).toEqual({
      status: 'unreadable',
    });
  });
});

describe('logEncryptionStatus', () => {
  test('runs on every backend without throwing', async () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');
    await expect(logEncryptionStatus()).resolves.toBeUndefined();

    mockIsAsyncEncryptionAvailable.mockResolvedValue(false);
    await expect(logEncryptionStatus()).resolves.toBeUndefined();
  });
});
