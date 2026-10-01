import { ReactElement, useMemo } from 'react';
import { WarningOutlined } from '@ant-design/icons';
import { Select, Tooltip } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import { classForeground } from '../theme';

const WarningIcon = styled(WarningOutlined)`
  color: ${classForeground};
`;

type Props = {
  columnName: string;
  /** every column of the table */
  columns: ReadonlyArray<string>;
  /** `null` when the column has not been moved */
  displayAfter: string | null;
  /** the grid shows the primary key columns first, and so not this one right after `displayAfter` */
  overriddenByPrimaryKey: boolean;
  onChange: (columnName: string, displayAfter: string | null) => void;
};

/** Cleared, the column goes back to the place the database gives it. */
export default function DisplayAfterSelect({
  columnName,
  columns,
  displayAfter,
  overriddenByPrimaryKey,
  onChange,
}: Props): ReactElement {
  const { t } = useTranslation();

  // a pair following each other is left to the user, and resolved by `applyColumnOrder`
  const options = useMemo(
    () =>
      columns
        .filter((column) => column !== columnName)
        .map((column) => ({ value: column, label: column })),
    [columns, columnName]
  );

  return (
    <Select
      size="small"
      style={{ width: '100%' }}
      popupMatchSelectWidth={false}
      allowClear
      showSearch
      prefix={
        overriddenByPrimaryKey && (
          <Tooltip
            title={t('table.structure.displayAfter.overriddenByPrimaryKey')}
          >
            <WarningIcon
              aria-label={t(
                'table.structure.displayAfter.overriddenByPrimaryKey'
              )}
            />
          </Tooltip>
        )
      }
      placeholder={t('table.structure.displayAfter.none')}
      value={displayAfter}
      options={options}
      onChange={(value: string | undefined) => {
        onChange(columnName, value ?? null);
      }}
    />
  );
}
