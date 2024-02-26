import { useParams } from 'react-router';
import invariant from 'tiny-invariant';
import ModalLike from '../../component/Style/ModalLike';
import ConnectionForm from '../../component/Connection/ConnectionForm';
import { useConfiguration } from '../../contexts/ConfigurationContext';

export default function Edit() {
  const { configuration } = useConfiguration();
  const { connectionName } = useParams();

  invariant(connectionName, 'Connection name is required');

  const connection = configuration.connections[connectionName];

  if (!connection) {
    // TODO migrate this in a route loader and trigger a 404 ?
    return <div>Connection not found</div>;
  }

  return (
    <ModalLike>
      <ConnectionForm connection={connection} />
    </ModalLike>
  );
}
