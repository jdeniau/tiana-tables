import { SqlError } from '../../../sql/errorSerializer';

type Props = { error: SqlError };

export default function SqlErrorComponent({ error }: Props) {
  return (
    <div>
      <h1>{error.message}</h1>

      <p>
        {error.errno}: {error.code}
      </p>
    </div>
  );
}
