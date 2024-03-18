import { BrowserWindow } from 'electron';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import log from 'electron-log/main';
import { isDevApp } from './helpers';

export function installReactDevToolsExtension() {
  // don't install the extension in production
  if (!isDevApp()) {
    return;
  }

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => {
      log.debug(`Added Extension:  ${name}`);

      // once extension is loaded, reload the view after a short period (probably to be sure that the extension is loaded ?)
      BrowserWindow.getAllWindows().forEach((win) => {
        setTimeout(() => {
          win.webContents.reload();
        }, 1000);
      });
    })
    .catch((err) => console.error('Unable to install extension: ', err));
}
