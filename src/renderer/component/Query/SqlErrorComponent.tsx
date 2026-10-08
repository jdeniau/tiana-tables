import { Alert } from 'antd';
import { styled } from 'styled-components';
import type { ErrorLike } from '../../../sql/errorSerializer';
import type { SqlErrorDetail } from '../../../sql/sqlError';
import { space } from '../../theme';

// an error boundary falls back here for any error, and most carry neither code
type ShownError = ErrorLike & Partial<SqlErrorDetail>;

type Props = { error: ShownError; className?: string };

/**
 * How the error names itself: `1146: ER_NO_SUCH_TABLE` on MySQL,
 * the code alone on PostgreSQL, which has no number for it.
 */
function formatErrorCode({ code, errno }: ShownError): string | undefined {
  return errno === undefined ? code : `${errno}: ${code}`;
}

// clear of the edges of the region it fills
const ErrorAlert = styled(Alert)`
  margin: ${space.md};
`;

/** what the server answered instead of rows: the message, then its code */
export default function SqlErrorComponent({ error, className }: Props) {
  return (
    <ErrorAlert
      className={className}
      type="error"
      showIcon
      title={error.message}
      description={formatErrorCode(error)}
    />
  );
}

export const testables = { formatErrorCode };
