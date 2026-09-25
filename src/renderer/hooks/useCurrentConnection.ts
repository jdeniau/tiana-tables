import { EncryptedConnectionObject } from '../../configuration/type';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';

/**
 * The configuration of the connection the app is currently on, if any.
 */
export function useCurrentConnection(): EncryptedConnectionObject | undefined {
  const { currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();

  return currentConnectionSlug
    ? configuration.connections[currentConnectionSlug]
    : undefined;
}
