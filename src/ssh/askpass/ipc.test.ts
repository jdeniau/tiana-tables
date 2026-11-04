import { beforeEach, expect, test, vi } from 'vitest';
import { SSH_QUESTION_CHANNEL } from '../../preload/sshQuestionChannel';
import { type SshQuestion, SshQuestionKind } from './question';

const mocks = vi.hoisted(() => ({ getAllWindows: vi.fn() }));

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: mocks.getAllWindows },
}));
vi.mock('electron-log', () => ({ default: { error: vi.fn() } }));

const { bindIpcMainSshQuestion, testables } = await import('./ipc');

const QUESTION: SshQuestion = {
  id: 'q1',
  connection: 'mariadb via SSH (dev)',
  prompt: "Enter passphrase for key '/home/me/.ssh/id_ed25519': ",
  kind: SshQuestionKind.Secret,
};

let windows: Array<{ webContents: { send: ReturnType<typeof vi.fn> } }>;
let answer: (payload: unknown) => void;
let pendingQuestions: () => unknown;

beforeEach(() => {
  windows = [
    { webContents: { send: vi.fn() } },
    { webContents: { send: vi.fn() } },
  ];
  mocks.getAllWindows.mockReset().mockImplementation(() => windows);

  bindIpcMainSshQuestion({
    handle: (
      channel: string,
      handler: (event: unknown, payload: unknown) => void
    ) => {
      if (channel === SSH_QUESTION_CHANNEL.ANSWER) {
        answer = (payload) => handler({}, payload);
      }
      if (channel === SSH_QUESTION_CHANNEL.PENDING) {
        pendingQuestions = () => handler({}, undefined);
      }
    },
  } as unknown as Electron.IpcMain);
});

test('every window is asked, and the first answer settles the question for all', async () => {
  const asked = testables.askUser(QUESTION, new AbortController().signal);

  for (const { webContents } of windows) {
    expect(webContents.send).toHaveBeenCalledWith(
      SSH_QUESTION_CHANNEL.ASK,
      QUESTION
    );
  }

  answer({ questionId: 'q1', answer: 'my passphrase' });

  await expect(asked).resolves.toBe('my passphrase');
  for (const { webContents } of windows) {
    expect(webContents.send).toHaveBeenCalledWith(
      SSH_QUESTION_CHANNEL.DISMISS,
      'q1'
    );
  }
});

test('with no window, nobody is asked and ssh gets no answer', async () => {
  windows = [];

  await expect(
    testables.askUser(QUESTION, new AbortController().signal)
  ).resolves.toBeNull();
});

test('a question ssh takes back leaves every window, unanswered', async () => {
  const gone = new AbortController();
  const asked = testables.askUser(QUESTION, gone.signal);

  gone.abort();

  await expect(asked).resolves.toBeNull();
  expect(windows[0]?.webContents.send).toHaveBeenCalledWith(
    SSH_QUESTION_CHANNEL.DISMISS,
    'q1'
  );

  // a late answer from a window finds nothing left to settle
  expect(() => answer({ questionId: 'q1', answer: 'too late' })).not.toThrow();
});

test('an answer the renderer shaped wrong is refused', () => {
  expect(() => answer({ questionId: 'q1', answer: 42 })).toThrow();
});

test('a window that loads meanwhile finds the questions still asked', async () => {
  const asked = testables.askUser(QUESTION, new AbortController().signal);

  expect(pendingQuestions()).toEqual([QUESTION]);

  answer({ questionId: 'q1', answer: 'my passphrase' });
  await asked;

  expect(pendingQuestions()).toEqual([]);
});
