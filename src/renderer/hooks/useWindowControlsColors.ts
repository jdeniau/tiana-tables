import { useEffect } from 'react';
import { useTheme } from 'styled-components';
import { ConnectionTint } from '../theme/connectionTint';

/** Paints the system window controls in the colours of the title bar under them. */
export function useWindowControlsColors(tint: ConnectionTint | undefined) {
  const { palette } = useTheme();
  const color = tint?.background ?? palette.base00;
  const symbolColor = tint?.text ?? palette.base05;

  useEffect(() => {
    window.titleBar.setColors({ color, symbolColor });
  }, [color, symbolColor]);
}
