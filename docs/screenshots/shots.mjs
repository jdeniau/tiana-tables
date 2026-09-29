// The README screenshots, from the Electron app in dev mode against the dev MariaDB (`docker compose up -d --wait`).
// A throwaway profile gets a "Le Fil (dev)" connection, then every shot is driven through the devtools protocol.
//
//   node docs/screenshots/shots.mjs
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PAGE_PORT = 9222;
const MAIN_PORT = 9229;
const CONNECTION = 'le-fil-dev';
const DATABASE = 'tiana_dev';
const TABLE = 'article';
// 1200 css px at 1.5 gives the 1800 px the README shows at 900
const VIEWPORT = { width: 1200, height: 760, deviceScaleFactor: 1.5 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isListening(port) {
  try {
    await fetch(`http://localhost:${port}/json/list`);
    return true;
  } catch {
    return false;
  }
}

async function until(what, check, timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    const value = await check().catch(() => null);

    if (value) {
      return value;
    }

    await sleep(250);
  }

  throw new Error(`timed out waiting for ${what}`);
}

async function connect(port, isTarget) {
  const targets = await (
    await fetch(`http://localhost:${port}/json/list`)
  ).json();
  const ws = new WebSocket(targets.find(isTarget).webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, (msg) =>
        msg.error
          ? reject(new Error(`${method}: ${msg.error.message}`))
          : resolve(msg.result)
      );
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (exceptionDetails) {
      throw new Error(
        exceptionDetails.exception?.description ?? exceptionDetails.text
      );
    }

    return result.value;
  };

  return { send, evaluate, close: () => ws.close() };
}

if ((await isListening(PAGE_PORT)) || (await isListening(MAIN_PORT))) {
  throw new Error(
    `ports ${PAGE_PORT}/${MAIN_PORT} are taken: quit the other Tiana instance first`
  );
}

const profile = mkdtempSync(join(tmpdir(), 'tiana-shots-'));
// electron-forge quits as soon as its stdin closes, hence the pipe kept open
const app = spawn(
  'yarn',
  [
    'electron-forge',
    'start',
    '--inspect-electron',
    '--',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PAGE_PORT}`,
  ],
  { cwd: ROOT, stdio: ['pipe', 'ignore', 'inherit'], detached: true }
);

let page;

try {
  await until(
    'the app window',
    async () => {
      const targets = await (
        await fetch(`http://localhost:${PAGE_PORT}/json/list`)
      ).json();
      return targets.some(
        (t) => t.type === 'page' && t.url.startsWith('http://localhost:517')
      );
    },
    180_000
  );

  page = await connect(
    PAGE_PORT,
    (t) => t.type === 'page' && t.url.startsWith('http://localhost:517')
  );
  const main = await connect(MAIN_PORT, (t) => t.type === 'node');
  const { send, evaluate } = page;

  await send('Page.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', {
    ...VIEWPORT,
    mobile: false,
  });

  const waitFor = (what, expression, timeoutMs) =>
    until(what, () => evaluate(expression), timeoutMs);
  const clickText = (selector, text) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)});
      if (!el) throw new Error('no ${selector} reading ${text}');
      el.click();
    })()`);
  const key = async (key, code, keyCode, { modifiers = 0, text } = {}) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      modifiers,
      text,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      modifiers,
    });
  };

  const reload = async () => {
    await send('Page.reload');
    await sleep(500);
    await waitFor(
      'the app to render',
      `document.readyState === 'complete' && !!document.querySelector('#App *')`
    );
  };

  const navigate = async (path, readyExpression) => {
    await evaluate(`location.hash = ${JSON.stringify(path)}`);
    await waitFor(path, readyExpression);
  };

  // the path bar comes back on every reload (it starts from `isDev`), and the menu item toggles: check it, then click it off
  const hideDevMarks = async () => {
    await main.evaluate(`(() => {
      const { Menu } = process.mainModule.require('electron');
      const find = (items) => {
        for (const item of items) {
          if (item.label === 'Toggle path bar') return item;
          const inSubmenu = item.submenu && find(item.submenu.items);
          if (inSubmenu) return inSubmenu;
        }
      };
      const item = find(Menu.getApplicationMenu().items);
      item.checked = true;
      item.click();
    })()`);
    await evaluate(`(() => {
      const mark = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent === '(dev mode)');
      if (mark) mark.style.display = 'none';
    })()`);
    await waitFor(
      'the path bar to hide',
      `![...document.querySelectorAll('body *')].some((e) => e.children.length === 0 && e.textContent === location.hash.slice(1))`
    );
  };

  // `getClip` runs once the marks are hidden: the path bar shifts everything below it
  const capture = async (file, getClip) => {
    await hideDevMarks();
    await sleep(300);
    const clip = await getClip?.();
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      ...(clip && { clip: { ...clip, scale: 1 } }),
    });
    writeFileSync(join(HERE, file), Buffer.from(data, 'base64'));
    console.log('wrote', file);
  };

  // from a region's name to the bottom right of the window, or `height` css px down
  const regionClip = (name, height) =>
    evaluate(`(() => {
      const title = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(name)});
      const r = title.getBoundingClientRect();
      const x = r.x - 18, y = r.y - 12;
      return { x, y, width: innerWidth - x, height: ${height ?? 'innerHeight - y'} };
    })()`);

  const typeInEditor = async (text) => {
    await waitFor(
      'the SQL editor',
      `!!document.querySelector('.monaco-editor .native-edit-context')`
    );
    await evaluate(
      `document.querySelector('.monaco-editor .native-edit-context').focus()`
    );
    await key('a', 'KeyA', 65, { modifiers: 2 });
    await send('Input.insertText', { text });
  };

  // a new profile opens on the connection form, in English
  await waitFor('the connection form', `!!document.getElementById('name')`);
  for (const [id, value] of Object.entries({
    name: 'Le Fil (dev)',
    host: '127.0.0.1',
    port: '13306',
    password: 'devpassword',
  })) {
    await evaluate(
      `(() => { const e = document.getElementById('${id}'); e.focus(); e.select(); })()`
    );
    await send('Input.insertText', { text: value });
  }
  await clickText('button', 'Save and connect');
  await waitFor(
    'the connection',
    `location.hash.startsWith('#/connections/${CONNECTION}/')`
  );

  // what each type looks like, side by side: an enum, a foreign key, a datetime and its NULLs, numbers, a decimal, a boolean, JSON
  const order = [
    'id',
    'titre',
    'statut',
    'auteur_id',
    'publie_le',
    'vues',
    'note_moyenne',
    'en_une',
    'metadonnees',
  ];
  const widths = {
    id: 56,
    titre: 210,
    statut: 100,
    auteur_id: 100,
    vues: 70,
    note_moyenne: 125,
    en_une: 75,
  };
  await evaluate(`(async () => {
    const order = ${JSON.stringify(order)};
    for (let i = 1; i < order.length; i++) {
      await window.config.setColumnDisplayAfter('${CONNECTION}', '${DATABASE}', '${TABLE}', order[i], order[i - 1]);
    }
    for (const [column, width] of Object.entries(${JSON.stringify(widths)})) {
      await window.config.setColumnWidth('${CONNECTION}', '${DATABASE}', '${TABLE}', column, width);
    }
    await window.config.setTableFilter('${CONNECTION}', '${DATABASE}', '${TABLE}', "statut <> 'archive'");
  })()`);

  const tablePath = `#/connections/${CONNECTION}/${DATABASE}/tables/${TABLE}`;
  const gridReady = `document.querySelectorAll('tbody tr').length > 10`;
  const showTable = async (theme) => {
    await evaluate(`window.config.changeTheme(${JSON.stringify(theme)})`);
    await evaluate(`location.hash = ${JSON.stringify(tablePath)}`);
    await reload();
    await waitFor(`the ${TABLE} grid`, gridReady);
  };

  // hero: the whole window
  await showTable('Dracula');
  await capture('hero.png');

  // themes: the top-left corner of the same window, in a light and a dark theme
  const corner = { x: 0, y: 0, width: 560, height: 380 };
  await showTable('Unikitty Light');
  await capture('themes-a.png', () => corner);
  await showTable('Tokyo Night Dark');
  await capture('themes-b.png', () => corner);
  execFileSync(
    'python3',
    [
      '-c',
      `
from PIL import Image
a, b = Image.open('themes-a.png'), Image.open('themes-b.png')
out = Image.new('RGB', (a.width + b.width, max(a.height, b.height)))
out.paste(a, (0, 0))
out.paste(b, (a.width, 0))
out.save('themes.png', optimize=True)
`,
    ],
    { cwd: HERE }
  );
  rmSync(join(HERE, 'themes-a.png'));
  rmSync(join(HERE, 'themes-b.png'));

  // sql-editor: retyped up to `WHERE a.` so the suggest widget opens on the alias
  await evaluate(`window.config.changeTheme('Dracula')`);
  await reload();
  const sqlPath = `#/connections/${CONNECTION}/${DATABASE}/sql`;
  const sqlReady = `[...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Run'))`;
  await navigate(sqlPath, sqlReady);
  await typeInEditor(
    'SELECT a.titre, au.nom, au.prenom\nFROM article a\nJOIN auteur au ON a.auteur_id = au.id\nWHERE a'
  );
  await sleep(300);
  await key('.', 'Period', 190, { text: '.' });
  await waitFor(
    'the suggest widget',
    `!!document.querySelector('.monaco-editor .suggest-widget.visible')`
  );
  await sleep(500);
  await capture('sql-editor.png', () => regionClip('Query', 322));

  // chart: a raw SQL result flipped to a chart, on the axes it picks itself, with the editor shrunk to leave the result the room
  await evaluate(`window.config.setPanelSize('sqlEditor', '28%')`);
  await reload();
  await navigate(sqlPath, sqlReady);
  await typeInEditor(
    'SELECT mois, SUM(lectures) AS lectures, SUM(lecteurs_identifies) AS lecteurs_identifies\nFROM vue_audience_mensuelle\nGROUP BY mois\nORDER BY mois'
  );
  await key('Escape', 'Escape', 27);
  await evaluate(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Run')).click()`
  );
  await waitFor(
    'the result',
    `[...document.querySelectorAll('label, .ant-segmented-item')].some((e) => e.textContent.trim() === 'Chart')`
  );
  await clickText('.ant-segmented-item', 'Chart');
  await waitFor('the chart', `!!document.querySelector('svg')`);
  await sleep(1500);
  await capture('chart.png', () => regionClip('Result'));

  page.close();
  main.close();
} catch (error) {
  if (page) {
    const failure = join(tmpdir(), 'tiana-shots-failure.png');
    const { data } = await page.send('Page.captureScreenshot', {
      format: 'png',
    });
    writeFileSync(failure, Buffer.from(data, 'base64'));
    console.error(
      `failed on ${await page.evaluate('location.href')}, the window is in ${failure}`
    );
  }
  throw error;
} finally {
  const exited = new Promise((r) => app.once('exit', r));
  process.kill(-app.pid, 'SIGTERM');
  await exited;
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}

for (const file of ['hero.png', 'chart.png', 'themes.png', 'sql-editor.png']) {
  execFileSync(
    'python3',
    [
      '-c',
      `from PIL import Image; im = Image.open('${file}'); print('${file}', im.size, im.mode)`,
    ],
    {
      cwd: HERE,
      stdio: 'inherit',
    }
  );
}
