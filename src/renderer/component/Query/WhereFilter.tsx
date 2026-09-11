import { ReactElement, useRef, useState } from 'react';
import { Form } from 'react-router-dom';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { escapeIdentifier } from '../../../sql/escapeIdentifier';
import { RawSqlEditor } from '../MonacoEditor/RawSqlEditor';
import { Region, RegionBody, RegionHeader, RegionName } from '../Style/Region';
import { fill } from '../Style/fill';
import { FilterButton } from './FilterButton';

// the router's Form is a block between the panel and the region
const FillForm = styled(Form)`
  ${fill}
`;

interface Props {
  defaultValue: string;
  tableName: string;
  /** the filters this table was given, most recent first */
  history: Array<string>;
}

/** The filters region of a table page: the body of a `WHERE`, and its button. */
function WhereFilter({
  defaultValue,
  tableName,
  history,
}: Props): ReactElement {
  const { t } = useTranslation();
  const [where, setWhere] = useState<string>(defaultValue);
  const ref = useRef<HTMLFormElement>(null);

  // the editor only holds the body of the clause; the query it is a fragment
  // of is what makes `salary > 1000` valid SQL, and what gives completion the
  // columns of this very table
  const queryPrefix = `SELECT * FROM ${escapeIdentifier(tableName)} WHERE `;

  return (
    <FillForm ref={ref}>
      <input type="hidden" name="where" value={where} />

      <Region>
        <RegionHeader>
          <RegionName>{t('table.filters.title')}</RegionName>

          <FilterButton history={history} current={defaultValue} />
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
              ref.current?.dispatchEvent(
                new Event('submit', { bubbles: true })
              );
            }}
          />
        </RegionBody>
      </Region>
    </FillForm>
  );
}

export default WhereFilter;
