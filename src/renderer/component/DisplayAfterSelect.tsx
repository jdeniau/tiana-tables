import { ReactElement, useMemo } from 'react';
import { Select } from 'antd';
import { useTranslation } from '../../i18n';

type Props = {
  columnName: string;
  /** every column of the table */
  columns: ReadonlyArray<string>;
  /** `null` when the column has not been moved */
  displayAfter: string | null;
  onChange: (columnName: string, displayAfter: string | null) => void;
};

/** Cleared, the column goes back to the place the database gives it. */
export default function DisplayAfterSelect({
  columnName,
  columns,
  displayAfter,
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
      placeholder={t('table.structure.displayAfter.none')}
      value={displayAfter}
      options={options}
      onChange={(value: string | undefined) => {
        onChange(columnName, value ?? null);
      }}
    />
  );
}
