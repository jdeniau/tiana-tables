import { bindChannel } from './bindChannel';
import { CLIPBOARD_CHANNEL } from './clipboardChannel';

interface Clipboard {
  readText(): Promise<string>;
  writeImage(dataUrl: string): Promise<void>;
}

export const clipboard: Clipboard = {
  readText: bindChannel(CLIPBOARD_CHANNEL.READ_TEXT),
  writeImage: bindChannel(CLIPBOARD_CHANNEL.WRITE_IMAGE),
};
