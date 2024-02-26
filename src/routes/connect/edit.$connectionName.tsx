import ModalLike from '../../component/Style/ModalLike';
import ConnectionForm from '../../component/Connection/ConnectionForm';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useParams } from 'react-router';

export default function Edit() {
  const { configuration } = useConfiguration();
  const { connectionName } = useParams();

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
