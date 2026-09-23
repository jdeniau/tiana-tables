import { Alert } from 'antd';
import type { SqlError } from '../../../sql/sqlError';
import { space } from '../../theme';

type Props = { error: SqlError };

/**
 * How the error names itself: `1146: ER_NO_SUCH_TABLE` on MySQL,
 * the code alone on PostgreSQL, which has no number for it.
 */
function formatErrorCode({ code, errno }: SqlError): string | undefined {
  // an error boundary falls back here for any error, and most carry neither
  return errno === undefined ? code : `${errno}: ${code}`;
}

/** what the server answered instead of rows: the message, then its code */
export default function SqlErrorComponent({ error }: Props) {
  return (
    <Alert
      type="error"
      showIcon
      title={error.message}
      description={formatErrorCode(error)}
      style={{ margin: space.md }}
    />
  );
}

export const testables = { formatErrorCode };
