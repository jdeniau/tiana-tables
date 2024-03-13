import { useRouteError } from 'react-router';
import SqlErrorComponent from '../../..//renderer/component/Query/SqlErrorComponent';
import { SqlError } from '../../../sql/errorSerializer';

export default function ConnectionErrorPage() {
  const error = useRouteError() as SqlError;

  return <SqlErrorComponent error={error} />;
}
