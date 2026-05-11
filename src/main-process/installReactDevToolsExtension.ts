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

  return installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => {
      log.debug(`Added Extension:  ${name}`);
    })
    .catch((err) => {
      console.error('Unable to install extension: ', err);
    });
}
