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
    encryptString: vi.fn((s: string) => Buffer.from(`encrypted-${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().substring(10)),
    isEncryptionAvailable: vi.fn(() => true),
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

const mockIsEncryptionAvailable = vi.mocked(safeStorage.isEncryptionAvailable);
const mockGetSelectedStorageBackend = vi.mocked(
  safeStorage.getSelectedStorageBackend
);
const mockDecryptString = vi.mocked(safeStorage.decryptString);
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
  mockIsEncryptionAvailable.mockReturnValue(true);
  mockGetSelectedStorageBackend.mockReturnValue('gnome_libsecret');
  testables.resetInsecureBackendWarning();
});

afterEach(() => {
  mockPlatform(realPlatform);
  vi.clearAllMocks();
});

describe('getEncryptionStatus', () => {
  test('a real keyring is secure', () => {
    expect(getEncryptionStatus()).toEqual({
      available: true,
      backend: 'gnome_libsecret',
      isSecure: true,
    });
  });

  test('basic_text is available but NOT secure', () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');

    expect(getEncryptionStatus()).toEqual({
      available: true,
      backend: 'basic_text',
      isSecure: false,
    });
  });

  test('unknown backend is treated as insecure', () => {
    mockGetSelectedStorageBackend.mockReturnValue('unknown');

    expect(getEncryptionStatus().isSecure).toBe(false);
  });

  test('unavailable encryption is never secure', () => {
    mockIsEncryptionAvailable.mockReturnValue(false);

    expect(getEncryptionStatus()).toEqual({
      available: false,
      backend: 'gnome_libsecret',
      isSecure: false,
    });
  });

  test('the Linux-only backend is not read on macOS', () => {
    mockPlatform('darwin');

    expect(getEncryptionStatus()).toEqual({
      available: true,
      backend: null,
      isSecure: true,
    });
    expect(mockGetSelectedStorageBackend).not.toHaveBeenCalled();
  });
});

describe('encryptPassword', () => {
  test('encrypts when the keyring answers', () => {
    expect(encryptPassword('password')).toBe(
      Buffer.from('encrypted-password').toString('base64')
    );
  });

  test('throws instead of storing an unprotected password', () => {
    mockIsEncryptionAvailable.mockReturnValue(false);

    expect(() => encryptPassword('password')).toThrow(
      EncryptionUnavailableError
    );
    expect(safeStorage.encryptString).not.toHaveBeenCalled();
  });

  test('warns once when the backend only obfuscates', () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');

    encryptPassword('password');
    encryptPassword('another');

    expect(mockShowMessageBox).toHaveBeenCalledOnce();
    expect(mockShowMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'config.encryption.insecureBackend.title',
      })
    );
  });

  test('does not warn on a real keyring', () => {
    encryptPassword('password');

    expect(mockShowMessageBox).not.toHaveBeenCalled();
  });
});

describe('decryptPassword', () => {
  test('decrypts a stored password', () => {
    expect(
      decryptPassword(Buffer.from('encrypted-password').toString('base64'))
    ).toBe('password');
  });

  test('an unreadable password does not break the whole configuration', () => {
    mockDecryptString.mockImplementation(() => {
      throw new Error('Error while decrypting the ciphertext provided');
    });

    expect(decryptPassword('not-a-valid-ciphertext')).toBe('');
  });
});

describe('logEncryptionStatus', () => {
  test('runs on every backend without throwing', () => {
    mockGetSelectedStorageBackend.mockReturnValue('basic_text');
    expect(() => logEncryptionStatus()).not.toThrow();

    mockIsEncryptionAvailable.mockReturnValue(false);
    expect(() => logEncryptionStatus()).not.toThrow();
  });
});
