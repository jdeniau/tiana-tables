import { ReactElement, useRef, useState } from 'react';
import { Button } from 'antd';
import { Form } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import { escapeIdentifier } from '../../../sql/escapeIdentifier';
import { RawSqlEditor } from '../MonacoEditor/RawSqlEditor';
import {
  Region,
  RegionBody,
  RegionHeader,
  RegionName,
} from '../Style/Region';

interface Props {
  defaultValue: string;
  tableName: string;
}

/** The filters region of a table page: the body of a `WHERE`, and its button. */
function WhereFilter({ defaultValue, tableName }: Props): ReactElement {
  const { t } = useTranslation();
  const [where, setWhere] = useState<string>(defaultValue);
  const ref = useRef<HTMLFormElement>(null);

  // the editor only holds the body of the clause; the query it is a fragment
  // of is what makes `salary > 1000` valid SQL, and what gives completion the
  // columns of this very table
  const queryPrefix = `SELECT * FROM ${escapeIdentifier(tableName)} WHERE `;

  return (
    <Form ref={ref} style={{ height: '100%' }}>
      <input type="hidden" name="where" value={where} />

      <Region>
        <RegionHeader>
          <RegionName>{t('table.filters.title')}</RegionName>

          <Button htmlType="submit" color="primary" variant="solid">
            {t('filter')}
          </Button>
        </RegionHeader>

        <RegionBody>
          <RawSqlEditor
            defaultValue={where}
            onChange={setWhere}
            queryPrefix={queryPrefix}
            style={{ height: '100%' }}
            monacoOptions={{
              lineNumbers: 'off',
            }}
            onSubmit={() => {
              // submit the form
              ref.current?.dispatchEvent(new Event('submit', { bubbles: true }));
            }}
          />
        </RegionBody>
      </Region>
    </Form>
  );
}

export default WhereFilter;
