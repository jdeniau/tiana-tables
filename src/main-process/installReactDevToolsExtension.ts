import { type Extension, type WebContents, app, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  REACT_DEVELOPER_TOOLS,
  installExtension,
} from 'electron-devtools-installer';
import log from 'electron-log/main';
import { isDevApp } from './helpers';

// electron-devtools-installer caches the downloaded CRX forever: once React
// DevTools sits in <userData>/extensions it is never refreshed, so a copy
// downloaded before React 19 makes the panel say "Unsupported React version
// detected". Force a fresh download when the cached copy gets old.
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// The real hook exposes an event emitter (`on`/`emit`/`sub`); the stub that
// Vite's react-refresh installs when the extension is late does not.
const DEVTOOLS_HOOK_STATE = `({
  real: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.on === 'function',
  renderers: window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size ?? 0,
})`;

function isCachedExtensionStale(): boolean {
  // The CRX is written by the installer itself, so its mtime is the download
  // date (files extracted from it may carry the archive dates instead).
  const crxPath = path.join(
    app.getPath('userData'),
    'extensions',
    `${REACT_DEVELOPER_TOOLS.id}.crx`
  );

  try {
    return Date.now() - fs.statSync(crxPath).mtimeMs > CACHE_MAX_AGE_MS;
  } catch {
    // Nothing cached yet: installExtension() will download it.
    return false;
  }
}

/**
 * React DevTools v7 no longer ships the devtools hook as a static content
 * script: its service worker registers it dynamically
 * (`chrome.scripting.registerContentScripts`, id `@react-devtools/hook`,
 * `document_start`, `persistAcrossSessions`). Electron only puts that
 * registration in force once the worker runs, so it has to be started — and
 * awaited — before the first navigation, or the hook misses the page.
 */
async function startExtensionServiceWorker(
  extension: Extension
): Promise<void> {
  try {
    await session.defaultSession.serviceWorkers.startWorkerForScope(
      extension.url
    );
  } catch (err) {
    log.warn('Unable to start the React DevTools service worker: ', err);
  }
}

export async function installReactDevToolsExtension(): Promise<void> {
  // don't install the extension in production
  if (!isDevApp()) {
    return;
  }

  const forceDownload = isCachedExtensionStale();

  try {
    const extension = await installExtension(REACT_DEVELOPER_TOOLS, {
      forceDownload,
    });

    log.debug(
      `Added extension: ${extension.name} v${extension.version}${forceDownload ? ' (re-downloaded, cached copy was stale)' : ''}`
    );

    await startExtensionServiceWorker(extension);
  } catch (err) {
    // A failed forced download leaves no extension at all: the installer
    // deletes the stale folder before fetching. Next start retries.
    log.error('Unable to install React DevTools extension: ', err);
  }
}

/**
 * Reports whether the hook actually made it into the page. It misses the whole
 * session that downloaded the extension (see above), and a document that
 * started without it can never get it back: react-refresh then owns
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__` as a non-configurable property, so
 * `installHook.js` bails out. Reloading the window does not help — only the
 * next app start does, so say that rather than letting it fail silently.
 */
export function warnIfDevToolsHookIsMissing(webContents: WebContents): void {
  if (!isDevApp()) {
    return;
  }

  webContents.once('did-finish-load', () => {
    webContents
      .executeJavaScript(DEVTOOLS_HOOK_STATE)
      .then(({ real, renderers }: { real: boolean; renderers: number }) => {
        if (real) {
          log.debug(`React DevTools hook installed (renderers: ${renderers})`);

          return;
        }

        log.warn(
          'React DevTools hook is missing: restart the app to get the Components panel back'
        );
      })
      .catch((err) => {
        log.warn('Unable to check for the React DevTools hook: ', err);
      });
  });
}
