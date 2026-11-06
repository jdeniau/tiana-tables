import { type JSX, ReactNode } from 'react';
import { Tooltip } from 'antd';
import { styled } from 'styled-components';
import { fontSize, mono } from '../theme';

/** The modifier held with the key, as Electron's accelerators name it. */
export enum ShortcutModifier {
  /** Cmd on macOS, Ctrl elsewhere */
  CmdOrCtrl = 'CmdOrCtrl',
  /** Ctrl on every platform, as VS Code's ⌃G on macOS */
  Ctrl = 'Ctrl',
}

type Props = {
  /** The key to press to activate the shortcut */
  pressedKey: string;

  /** none when absent */
  modifier?: ShortcutModifier;
};

/** keys that read better as their glyph */
const KEY_GLYPHS: Record<string, string> = {
  Enter: '⏎',
};

function modifierText(modifier: ShortcutModifier | undefined): string {
  switch (modifier) {
    case ShortcutModifier.CmdOrCtrl:
      return window.isMac ? '⌘' : 'ctrl+';
    case ShortcutModifier.Ctrl:
      return window.isMac ? '⌃' : 'ctrl+';
    case undefined:
      return '';
  }
}

/** the shortcut as plain text */
function keyboardShortcutText({ modifier, pressedKey }: Props): string {
  return `${modifierText(modifier)}${KEY_GLYPHS[pressedKey] ?? pressedKey.toUpperCase()}`;
}

/**
 * Display the value of a keyboard shortcut, as a hint next to the label it
 * belongs to: `⌘⏎`, `ctrl+K`.
 */
export function KeyboardShortcut({ modifier, pressedKey }: Props): JSX.Element {
  // the space is a text node on purpose: antd's Button wraps it in a span of
  // its own, which a CSS margin on the <kbd> would not give it
  return (
    <>
      {' '}
      <Keys>{keyboardShortcutText({ modifier, pressedKey })}</Keys>
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
  font-size: ${fontSize.sm};
  letter-spacing: 0;
  text-transform: none;
  opacity: 0.75;
`;
