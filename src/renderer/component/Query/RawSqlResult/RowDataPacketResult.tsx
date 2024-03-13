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
import SqlErrorComponent from '../SqlErrorComponent';
import RowDataPacketResult from './Success';

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
      <h2>{t('rawSql.result.title')}</h2>

      {result && isRowDataPacketArray(result[0]) && (
        <RowDataPacketResult result={result[0]} fields={result[1]} />
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
