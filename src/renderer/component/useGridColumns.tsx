import { ReactNode, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { styled } from 'styled-components';
import { keyColumnsFirst } from '../../configuration/columnOrder';
import { DateDisplay } from '../../configuration/dateDisplay';
import { useDateDisplay } from '../../contexts/DateDisplayContext';
import { useTranslation } from '../../i18n';
import { FieldKind, type ResultField } from '../../sql/resultField';
import type { ResultRow } from '../../sql/types';
import { mutedForeground, space } from '../theme';
import type { ExtraColumn, GridFeatures } from './TableGrid';
import { getColumnWidth } from './columnWidth';

/** `fieldIndex` indexes `fields`, not the columns on screen. */
export type ColumnSource<Row extends ResultRow> =
  | { field: ResultField; fieldIndex: number; extra?: undefined }
  | { field?: undefined; fieldIndex: -1; extra: ExtraColumn<Row> };

type Options<Row extends ResultRow> = {
  fields: null | ResultField[];
  primaryKeys: Array<string> | undefined;
  extraColumns: Array<ExtraColumn<Row>>;
  rowsAsArray: boolean;
};

/** the columns of the grid, the primary key pinned first, and the field or extra column each one comes from */
export function useGridColumns<Row extends ResultRow>({
  fields,
  primaryKeys,
  extraColumns,
  rowsAsArray,
}: Options<Row>) {
  // pin primary key columns to the left, in the order of `fields`
  const columnPinning = useMemo(
    () => ({
      start: (fields ?? [])
        .map(({ name }) => name)
        .filter((name) => primaryKeys?.includes(name)),
      end: [],
    }),
    [fields, primaryKeys]
  );

  // both the table and `columnsMeta` are built from this one list, so the two always agree on what the nth column is
  const columnSources = useMemo((): Array<ColumnSource<Row>> => {
    const sources: Array<ColumnSource<Row>> = (fields ?? []).map(
      (field, fieldIndex) => ({ field, fieldIndex })
    );

    for (const extra of extraColumns) {
      const anchor = extra.after
        ? sources.findIndex((source) => source.field?.name === extra.after)
        : -1;

      sources.splice(anchor < 0 ? sources.length : anchor + 1, 0, {
        fieldIndex: -1,
        extra,
      });
    }

    const isPinned = (source: ColumnSource<Row>): boolean =>
      source.field !== undefined &&
      columnPinning.start.includes(source.field.name);

    // TanStack heads the pinned columns first, so the body must too
    return keyColumnsFirst(sources, isPinned);
  }, [fields, extraColumns, columnPinning]);

  // local time is followed by its offset, which the column opens wide enough for
  const showsOffset = useDateDisplay().display === DateDisplay.Local;

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<GridFeatures, Row>();

    return columnHelper.columns(
      columnSources.map(({ field, fieldIndex, extra }) =>
        extra
          ? columnHelper.display({
              id: extra.id,
              header: extra.header,
              size: extra.size,
            })
          : columnHelper.accessor(
              (row: Row) => (rowsAsArray ? row[fieldIndex] : row[field.name]),
              {
                // raw SQL results can contain duplicated column names: suffix with the index to keep ids unique
                // (browsing mode keeps plain names so that column pinning can match primary key names)
                id: rowsAsArray ? `${fieldIndex}:${field.name}` : field.name,
                header:
                  field.kind === FieldKind.DateTime
                    ? () => <DateColumnHeader name={field.name} />
                    : field.name,
                size: getColumnWidth(field.kind, showsOffset),
              }
            )
      )
    );
  }, [columnSources, rowsAsArray, showsOffset]);

  return { columnPinning, columnSources, columns };
}

const DateSuffix = styled.span`
  margin-inline-start: ${space.xs};
  color: ${mutedForeground};
`;

/** A date-time column's name, and the zone its values are shown in when there is a choice. */
function DateColumnHeader({ name }: { name: string }): ReactNode {
  const { t } = useTranslation();
  const { display, segments } = useDateDisplay();

  return (
    <>
      {name}
      {segments.length > 1 && (
        <DateSuffix>{t('dateDisplay.option', { display })}</DateSuffix>
      )}
    </>
  );
}
