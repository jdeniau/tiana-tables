import { Alert } from 'antd';
import { SqlError } from '../../../sql/errorSerializer';
import { space } from '../../theme';

type Props = { error: SqlError };

/** what the server answered instead of rows: the message, then its code */
export default function SqlErrorComponent({ error }: Props) {
  // Not every error reaching this component comes from the server: an error
  // boundary falls back to it for anything it cannot name better, and those
  // carry no code — printing `undefined: undefined` under them helped nobody.
  const hasCode = error.errno !== undefined || error.code !== undefined;

  return (
    <Alert
      type="error"
      showIcon
      title={error.message}
      description={hasCode ? `${error.errno}: ${error.code}` : undefined}
      style={{ margin: space.md }}
    />
  );
}
