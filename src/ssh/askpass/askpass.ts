// The program `ssh` runs to ask the user something (`SSH_ASKPASS`), through Electron in Node mode:
// it hands `ssh`'s question to the app over a local socket, and prints the answer for `ssh` to read.
// Plain Node, no import of ours: the tests run this very file.
import { connect } from 'node:net';

const handle = process.env.TIANA_ASKPASS_HANDLE;

if (!handle) {
  process.exit(1);
}

const socket = connect(handle);
let received = '';

socket.setEncoding('utf8');
socket.write(
  `${JSON.stringify({
    id: process.env.TIANA_ASKPASS_ID,
    prompt: process.argv[2] ?? '',
    askpassPrompt: process.env.SSH_ASKPASS_PROMPT,
  })}\n`
);

socket.on('data', (chunk: string) => {
  received += chunk;
});

/** The app's answer, `null` when it closed without a readable one: an unknown id, or an app gone mid-answer. */
function readAnswer(text: string): unknown {
  // read by hand, not with zod: Electron starts this program for every question, so it stays a few hundred bytes
  try {
    return (JSON.parse(text) as { answer?: unknown } | null)?.answer;
  } catch {
    return null;
  }
}

// the app closes the socket once answered; an exit code other than 0 tells `ssh` the user cancelled
socket.on('close', () => {
  const answer = readAnswer(received);

  if (typeof answer !== 'string') {
    process.exit(1);
  }

  process.stdout.write(`${answer}\n`, () => process.exit(0));
});

socket.on('error', () => {
  process.exit(1);
});
