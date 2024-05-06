import { Spin } from 'antd';
import { Fetcher } from 'react-router';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../../../i18n';
import { SqlError } from '../../../../sql/errorSerializer';
import {
  isResultSetHeader,
  isRowDataPacketArray,
} from '../../../../sql/type-guard';
import { QueryResult } from '../../../../sql/types';
import TableGrid from '../../TableGrid';
import SqlErrorComponent from '../SqlErrorComponent';

type Props = {
  fetcher: Fetcher<
    | {
        result: Awaited<QueryResult>;
        error?: undefined;
      }
    | {
        error: SqlError;
        result?: undefined;
      }
  >;
};

export default function RawSqlResult({ fetcher }: Props) {
  const { t } = useTranslation();
  const { data, state } = fetcher;

  if (state === 'idle' && !data) {
    return null;
  }

  if (state === 'submitting') {
    return <Spin />;
  }

  invariant(data, 'Data is required');

  const { result, error } = data;

  if (error) {
    return <SqlErrorComponent error={error} />;
  }

  return (
    <>
      {result && isRowDataPacketArray(result[0]) && (
        // TOOD maybe fetch foreign keys of queried table to activate navlinks
        <TableGrid
          editable // TODO need propers primary keys to really be editable
          result={result[0]}
          fields={result[1]}
          title={() => t('rawSql.result.title')}
        />
      )}

      {result && isResultSetHeader(result[0]) && (
        <div>
          <div>
            {t('rawSql.result.affectedRows')} {result[0].affectedRows}
          </div>
          <div>
            {t('rawSql.result.insertId')} {result[0].insertId}
          </div>
        </div>
      )}
      {/* TODO handle all other types of query result ? if we do handle multiple calls */}
    </>
  );
}
