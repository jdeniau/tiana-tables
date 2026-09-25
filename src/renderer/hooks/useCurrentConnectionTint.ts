import { useTheme } from 'styled-components';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { ConnectionTint, resolveConnectionTint } from '../theme/connectionTint';

/**
 * The colour the current connection is marked with, resolved against the
 * theme. Without a current connection, or without a colour on it, the frame
 * keeps the palette.
 */
export function useCurrentConnectionTint(): ConnectionTint | undefined {
  const { currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();
  const theme = useTheme();

  const connection = currentConnectionSlug
    ? configuration.connections[currentConnectionSlug]
    : undefined;

  return resolveConnectionTint(connection?.color, theme);
}
