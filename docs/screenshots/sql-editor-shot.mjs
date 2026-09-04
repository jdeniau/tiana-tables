// The sql-editor README shot: the Primary story, retyped up to `WHERE e.` so
// that the suggest widget opens on the alias, then captured. Drives a headless
// Chromium exposing --remote-debugging-port (first argument), writes the PNG
// to the second argument, crops the Storybook padding at the given scale.
import { writeFileSync } from 'node:fs';
const [, , port, out, dsf = '1.4', width = '1000', height = '322'] =
  process.argv;
const scale = Number(dsf);
const targets = await fetch(`http://localhost:${port}/json`).then((r) =>
  r.json()
);
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== msgId) return;
      ws.removeEventListener('message', onMessage);
      if (msg.error) {
        reject(new Error(JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
const evaluate = (expression) =>
  send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }).then((r) => r.result.value);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = async (text, code, keyCode, modifiers = 0) => {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: text,
    code,
    windowsVirtualKeyCode: keyCode,
    modifiers,
    text: modifiers ? undefined : text,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: text,
    code,
    windowsVirtualKeyCode: keyCode,
    modifiers,
  });
};

await new Promise((r) => ws.addEventListener('open', r));
// wait for Monaco
for (let i = 0; i < 80; i++) {
  if (
    await evaluate(
      "!!document.querySelector('.monaco-editor .view-lines .view-line')"
    )
  )
    break;
  await sleep(250);
}
// focus the editor by clicking its first line
const box = await evaluate(
  "(() => { const r = document.querySelector('.monaco-editor .view-lines').getBoundingClientRect(); return { x: r.left + 200, y: r.top + 11 }; })()"
);
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: box.x,
  y: box.y,
  button: 'left',
  clickCount: 1,
});
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: box.x,
  y: box.y,
  button: 'left',
  clickCount: 1,
});
await sleep(200);
// select all, retype the query, then the `.` that opens the suggestions
await key('a', 'KeyA', 65, 2);
await send('Input.insertText', {
  text: 'SELECT *\nFROM employe e\nJOIN title ON e.title_id = title.id\nWHERE e',
});
await sleep(300);
await key('.', 'Period', 190);
await sleep(1200);
const open = await evaluate(
  "!!document.querySelector('.monaco-editor .suggest-widget.visible')"
);
console.log('suggest widget visible:', open);
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
});
writeFileSync(out, Buffer.from(shot.data, 'base64'));
ws.close();
// crop the padding
const { execSync } = await import('node:child_process');
execSync(
  `python3 -c "
from PIL import Image
im = Image.open('${out}'); s = ${scale}; pad = round(16 * s)
im.crop((pad, pad, pad + round(${width} * s), pad + round(${height} * s))).save('${out}')
print('${out}', Image.open('${out}').size)
"`,
  { stdio: 'inherit' }
);
