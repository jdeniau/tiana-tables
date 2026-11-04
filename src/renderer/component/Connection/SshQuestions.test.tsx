/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  type SshQuestion,
  SshQuestionKind,
} from '../../../ssh/askpass/question';
import SshQuestions from './SshQuestions';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const HOST_KEY: SshQuestion = {
  id: 'q1',
  connection: 'mariadb via SSH (dev)',
  prompt:
    "The authenticity of host '[127.0.0.1]:12222' can't be established.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? ",
  kind: SshQuestionKind.HostKey,
};

const PASSPHRASE: SshQuestion = {
  id: 'q2',
  connection: 'postgres via SSH (dev)',
  prompt: "Enter passphrase for key '/home/me/.ssh/id_ed25519': ",
  kind: SshQuestionKind.Secret,
};

let ask: (question: SshQuestion) => void = () => {};
let dismiss: (questionId: string) => void = () => {};
const answer = vi.fn();
let answerPending: (questions: Array<SshQuestion>) => void = () => {};
let unmount: () => void = () => {};

beforeEach(() => {
  answer.mockReset().mockResolvedValue(undefined);
  window.sshQuestion = {
    onAsk: (callback) => {
      ask = callback;

      return () => {};
    },
    onDismiss: (callback) => {
      dismiss = callback;

      return () => {};
    },
    answer,
    pending: () =>
      new Promise((resolve) => {
        answerPending = resolve;
      }),
  };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(<SshQuestions />));
  unmount = () => root.unmount();
});

afterEach(() => {
  act(() => unmount());
  document.body.innerHTML = '';
});

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label
  );

  if (!found) {
    throw new Error(`No button "${label}"`);
  }

  return found;
}

test("an unknown host key shows ssh's words, and trusting it answers yes", () => {
  act(() => ask(HOST_KEY));

  expect(dialog()?.textContent).toContain(
    'mariadb via SSH (dev): unknown SSH server'
  );
  expect(dialog()?.textContent).toContain("can't be established.");

  act(() => button('Trust').click());

  expect(answer).toHaveBeenCalledWith({ questionId: 'q1', answer: 'yes' });
});

test('refusing answers nothing ssh could read', () => {
  act(() => ask(HOST_KEY));
  act(() => button('Refuse').click());

  expect(answer).toHaveBeenCalledWith({ questionId: 'q1', answer: null });
});

const OTHER_PASSPHRASE: SshQuestion = {
  ...PASSPHRASE,
  id: 'q3',
  connection: 'mariadb via SSH (dev)',
};

function type(text: string): void {
  const input = document.querySelector<HTMLInputElement>(
    'input[type="password"]'
  );

  // what React reads from a typed key: the native setter, then an `input` event
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set?.call(input, text);
  input?.dispatchEvent(new Event('input', { bubbles: true }));
}

test('a passphrase typed is sent as is', () => {
  act(() => ask(PASSPHRASE));
  act(() => type('my passphrase'));
  act(() => button('Send').click());

  expect(answer).toHaveBeenCalledWith({
    questionId: 'q2',
    answer: 'my passphrase',
  });
});

test('the next question waits for the first one, and starts empty', () => {
  act(() => {
    ask(PASSPHRASE);
    ask(OTHER_PASSPHRASE);
  });

  expect(dialog()?.textContent).toContain('postgres via SSH (dev): ssh asks');

  act(() => type('my passphrase'));
  act(() => button('Send').click());

  expect(dialog()?.textContent).toContain('mariadb via SSH (dev): ssh asks');
  expect(
    document.querySelector<HTMLInputElement>('input[type="password"]')?.value
  ).toBe('');
});

test('a question ssh took back leaves the screen', () => {
  act(() => ask(HOST_KEY));
  act(() => dismiss('q1'));

  expect(dialog()).toBeNull();
  expect(answer).not.toHaveBeenCalled();
});

test('a window that loads while ssh waits shows the questions asked before', async () => {
  await act(async () => answerPending([HOST_KEY]));

  expect(dialog()?.textContent).toContain(
    'mariadb via SSH (dev): unknown SSH server'
  );
});

test('a question both asked and still pending is shown once', async () => {
  act(() => ask(HOST_KEY));
  await act(async () => answerPending([HOST_KEY]));
  act(() => button('Trust').click());

  expect(dialog()).toBeNull();
  expect(answer).toHaveBeenCalledTimes(1);
});
