import { Alert } from 'antd';
import { SqlError } from '../../../sql/errorSerializer';
import { space } from '../../theme';

type Props = { error: SqlError };

/** what the server answered instead of rows: the message, then its code */
export default function SqlErrorComponent({ error }: Props) {
  return (
    <Alert
      type="error"
      showIcon
      title={error.message}
      description={`${error.errno}: ${error.code}`}
      style={{ margin: space.md }}
    />
  );
}
