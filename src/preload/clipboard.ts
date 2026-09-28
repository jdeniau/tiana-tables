import { bindChannel } from './bindChannel';
import { CLIPBOARD_CHANNEL } from './clipboardChannel';

interface Clipboard {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

export const clipboard: Clipboard = {
  readText: bindChannel(CLIPBOARD_CHANNEL.READ_TEXT),
  writeText: bindChannel(CLIPBOARD_CHANNEL.WRITE_TEXT),
};
