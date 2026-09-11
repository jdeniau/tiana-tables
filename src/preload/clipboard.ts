import { bindChannel } from './bindChannel';
import { CLIPBOARD_CHANNEL } from './clipboardChannel';

interface Clipboard {
  readText(): Promise<string>;
}

export const clipboard: Clipboard = {
  readText: bindChannel(CLIPBOARD_CHANNEL.READ_TEXT),
};
