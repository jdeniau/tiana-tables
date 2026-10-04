/** What a copy writes: the text, and the HTML a document pastes as a table. */
export interface ClipboardContent {
  text: string;
  html?: string;
}

/** Puts the content into a copy event's clipboard, in place of the page's selection. */
export function fillCopyEvent(
  event: ClipboardEvent,
  { text, html }: ClipboardContent
): void {
  event.clipboardData?.setData('text/plain', text);

  if (html !== undefined) {
    event.clipboardData?.setData('text/html', html);
  }

  event.preventDefault();
}

/** Writes the content to the clipboard, the HTML beside the text; resolves once it is there. */
export function writeClipboard({
  text,
  html,
}: ClipboardContent): Promise<void> {
  return navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      ...(html !== undefined && {
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    }),
  ]);
}
