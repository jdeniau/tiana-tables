import { useRouteError } from 'react-router';
import { SqlError } from '../../../sql/errorSerializer';

export default function ConnectionErrorPage() {
  const error = useRouteError() as SqlError;

  console.error(error instanceof Error, error);

  return (
    <div>
      <h1>{error.message}</h1>

      <p>
        {error.errno}: {error.code}
      </p>
    </div>
  );
}
