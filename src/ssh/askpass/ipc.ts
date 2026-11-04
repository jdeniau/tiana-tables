import { BrowserWindow } from 'electron';
import path from 'node:path';
import { z } from 'zod';
import { SSH_QUESTION_CHANNEL } from '../../preload/sshQuestionChannel';
import type { SshAnswer, SshQuestion, SshQuestionAnswer } from './question';
import { type AskUser, AskpassServer } from './server';

/** The questions on screen, by id: the first window to answer settles one for all. */
const pending = new Map<
  string,
  { question: SshQuestion; settle: (answer: SshAnswer) => void }
>();

const answerSchema: z.ZodType<SshQuestionAnswer> = z.object({
  questionId: z.string(),
  answer: z.string().nullable(),
});

function sendToWindows(channel: SSH_QUESTION_CHANNEL, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

/** Asks every window, as `ssh` does not say which one opened the connection; no window, no answer. */
const askUser: AskUser = (question, signal) =>
  new Promise((resolve) => {
    if (signal.aborted || BrowserWindow.getAllWindows().length === 0) {
      resolve(null);

      return;
    }

    const settle = (answer: SshAnswer): void => {
      pending.delete(question.id);
      sendToWindows(SSH_QUESTION_CHANNEL.DISMISS, question.id);
      resolve(answer);
    };

    pending.set(question.id, { question, settle });
    signal.addEventListener('abort', () => settle(null), { once: true });
    sendToWindows(SSH_QUESTION_CHANNEL.ASK, question);
  });

export function bindIpcMainSshQuestion(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(SSH_QUESTION_CHANNEL.ANSWER, (_event, payload: unknown) => {
    const { questionId, answer } = answerSchema.parse(payload);

    pending.get(questionId)?.settle(answer);
  });

  ipcMain.handle(SSH_QUESTION_CHANNEL.PENDING, (): Array<SshQuestion> =>
    [...pending.values()].map(({ question }) => question)
  );
}

/** The askpass program is built beside the main bundle, `askpass.cjs` (forge.config.ts). */
export const askpassServer = new AskpassServer(
  askUser,
  path.join(__dirname, 'askpass.cjs')
);

export const testables = { askUser };
