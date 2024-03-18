import { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { styled } from 'styled-components';

type Props = {
  /** The key to press to activate the shortcut */
  pressedKey: string;

  /** Whether to display "Ctrl" or "Cmd" if needed */
  cmdOrCtrl: boolean;
};

function CtrlOrCmd(): string {
  return window.isMac ? '⌘' : 'ctrl';
}

/**
 * Display the value of a keyboard shortcut.
 */
export function KeyboardShortcut({
  cmdOrCtrl,
  pressedKey,
}: Props): JSX.Element {
  return (
    <>
      {' '}
      <SmallText>
        (
        {cmdOrCtrl && (
          <>
            <CtrlOrCmd />+
          </>
        )}
        {pressedKey})
      </SmallText>
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

const SmallText = styled.span`
  font-size: 0.9em;
`;
