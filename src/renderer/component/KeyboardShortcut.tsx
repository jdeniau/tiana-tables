import { type JSX, ReactNode } from 'react';
import { Tooltip } from 'antd';
import { styled } from 'styled-components';
import { mono } from '../theme';

type Props = {
  /** The key to press to activate the shortcut */
  pressedKey: string;

  /** Whether to display "Ctrl" or "Cmd" if needed */
  cmdOrCtrl: boolean;
};

/** keys that read better as their glyph */
const KEY_GLYPHS: Record<string, string> = {
  Enter: '⏎',
};

function modifier(): string {
  return window.isMac ? '⌘' : 'ctrl+';
}

/** the shortcut as plain text, for a `title` attribute */
export function keyboardShortcutText({ cmdOrCtrl, pressedKey }: Props): string {
  return `${cmdOrCtrl ? modifier() : ''}${KEY_GLYPHS[pressedKey] ?? pressedKey.toUpperCase()}`;
}

/**
 * Display the value of a keyboard shortcut, as a hint next to the label it
 * belongs to: `⌘⏎`, `ctrl+K`.
 */
export function KeyboardShortcut({
  cmdOrCtrl,
  pressedKey,
}: Props): JSX.Element {
  // the space is a text node on purpose: antd's Button wraps it in a span of
  // its own, which a CSS margin on the <kbd> would not give it
  return (
    <>
      {' '}
      <Keys>{keyboardShortcutText({ cmdOrCtrl, pressedKey })}</Keys>
    </>
  );
}

export function KeyboardShortcutTooltip(
  props: Props & { children: ReactNode }
): JSX.Element {
  return (
    <Tooltip title={<KeyboardShortcut {...props} />}>{props.children}</Tooltip>
  );
}

const Keys = styled.kbd`
  font-family: ${mono};
  font-size: 11px;
  letter-spacing: 0;
  opacity: 0.75;
`;
