import { useTheme } from 'styled-components';
import { ConnectionTint, resolveConnectionTint } from '../theme/connectionTint';
import { useCurrentConnection } from './useCurrentConnection';

/**
 * The colour the current connection is marked with, resolved against the
 * theme. Without a current connection, or without a colour on it, the frame
 * keeps the palette.
 */
export function useCurrentConnectionTint(): ConnectionTint | undefined {
  const connection = useCurrentConnection();
  const theme = useTheme();

  return resolveConnectionTint(connection?.color, theme);
}
