import { ReactElement, ReactNode, useState } from 'react';
import { CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { type Atom, useSelector } from '@tanstack/react-store';
import type { RowSelectionState } from '@tanstack/react-table';
import { Button, Input, Splitter } from 'antd';
import { styled } from 'styled-components';
import { PANEL } from '../../../configuration/panels';
import { useTranslation } from '../../../i18n';
import type { Dialect } from '../../../sql/dialect/types';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { PanelPosition, usePanelSize } from '../../hooks/usePanelSize';
import {
  background,
  commentForeground,
  emphasisForeground,
  fontSize,
  foreground,
  mutedForeground,
  selection,
  size,
  space,
} from '../../theme';
import { isNullish } from '../../utils/isNullish';
import ForeignKeyLink from '../ForeignKeyLink';
import {
  Region,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../Style/Region';
import type { RowCursor } from '../gridSelectionGesture';
import { rowIdOf } from '../rowId';
import { useLastCopy } from '../useLastCopy';
import { Field, FieldRow } from './FieldRow';
import {
  type RowDetailField,
  filterRowDetailFields,
  rowDetailFields,
  rowKeyText,
} from './rowDetailFields';

/** a selection of every row would otherwise mount a button per row */
const MAX_CHIPS = 50;

interface RowDetailPanelProps<Row extends ResultRow> {
  /** the rows of the grid, in its order */
  rows: ReadonlyArray<Row>;
  /** the fields the grid is given, in that order */
  fields: ReadonlyArray<ResultField>;
  primaryKeys?: Array<string>;
  rowsAsArray: boolean;
  /** the atoms the grid is given */
  selectionAtom: Atom<RowSelectionState>;
  cursorAtom: Atom<RowCursor>;
  panelOpenAtom: Atom<boolean>;
}

/** A grid's region, and beside it, while a row is shown, the region of that row's fields. */
export function WithRowDetailPanel<Row extends ResultRow>({
  children,
  rows,
  fields,
  primaryKeys,
  rowsAsArray,
  selectionAtom,
  cursorAtom,
  panelOpenAtom,
}: RowDetailPanelProps<Row> & { children: ReactNode }): ReactElement {
  // one width for every page: it is the shape of the window, not of the data
  const { panelProps, onResizeEnd } = usePanelSize(
    PANEL.ROW_DETAIL,
    PanelPosition.Last
  );
  // antd seeds its sizes at mount only, and this panel mounts later: its size is ours
  const [draggedSize, setDraggedSize] = useState<number>();
  const panelOpen = useSelector(panelOpenAtom);
  const leadId = useSelector(cursorAtom, (cursor) => cursor.leadId);
  const shownId = panelOpen ? leadId : null;
  const index =
    shownId === null
      ? -1
      : rows.findIndex(
          (row, rowIndex) => rowIdOf(row, rowIndex, primaryKeys) === shownId
        );

  // built apart from its `Splitter.Panel`, so that a drag re-renders none of it
  const detailPanel = (
    <RowDetailPanel
      rows={rows}
      fields={fields}
      primaryKeys={primaryKeys}
      rowsAsArray={rowsAsArray}
      selectionAtom={selectionAtom}
      cursorAtom={cursorAtom}
      panelOpenAtom={panelOpenAtom}
      index={index}
    />
  );

  return (
    <Splitter
      onResize={(sizes) => setDraggedSize(sizes.at(-1))}
      onResizeEnd={onResizeEnd}
    >
      <Splitter.Panel>{children}</Splitter.Panel>
      {index >= 0 && (
        <Splitter.Panel
          size={draggedSize ?? panelProps.defaultSize}
          min={panelProps.min}
          max={panelProps.max}
        >
          {detailPanel}
        </Splitter.Panel>
      )}
    </Splitter>
  );
}

function RowDetailPanel<Row extends ResultRow>({
  rows,
  fields,
  primaryKeys,
  rowsAsArray,
  selectionAtom,
  cursorAtom,
  panelOpenAtom,
  index,
}: RowDetailPanelProps<Row> & { index: number }): ReactElement {
  const { t } = useTranslation();
  const dialect = useDialect();
  const [query, setQuery] = useState('');
  const [lastCopy, onCopied] = useLastCopy<string>();
  const selection = useSelector(selectionAtom);

  const row = rows[index];
  const shownId = rowIdOf(row, index, primaryKeys);
  const all = rowDetailFields(row, fields, primaryKeys, rowsAsArray);
  const shown = filterRowDetailFields(all, query);

  const chips = rows.flatMap((one, rowIndex) => {
    const id = rowIdOf(one, rowIndex, primaryKeys);

    return selection[id]
      ? [
          {
            id,
            label:
              primaryKeys && primaryKeys.length > 0
                ? primaryKeys.map((pk) => String(one[pk])).join(', ')
                : t('table.rowDetail.row', { position: rowIndex + 1 }),
          },
        ]
      : [];
  });

  const meta = [
    rowKeyText(row, primaryKeys),
    t('table.rowDetail.position', {
      position: index + 1,
      count: rows.length,
    }),
    shown.length < all.length &&
      t('table.rowDetail.fieldCount', {
        shown: shown.length,
        count: all.length,
      }),
  ]
    .filter(Boolean)
    .join(' · ');

  const copy = ({ field, text }: RowDetailField): void => {
    void window.clipboard.writeText(text).then(() => onCopied(field.name));
  };

  return (
    <Region as="aside" aria-label={t('table.rowDetail.title')}>
      <RegionHeader>
        <RegionGroup>
          <RegionName>{t('table.rowDetail.title')}</RegionName>
          <RowMeta title={meta}>{meta}</RowMeta>
        </RegionGroup>

        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          aria-label={t('table.rowDetail.close')}
          title={t('table.rowDetail.close')}
          onClick={() => panelOpenAtom.set(false)}
        />
      </RegionHeader>

      {chips.length > 1 && (
        <Band>
          <BandLabel>
            {t('table.rowDetail.selected', { count: chips.length })}
          </BandLabel>
          {chips.slice(0, MAX_CHIPS).map(({ id, label }) => (
            <Chip
              key={id}
              type="button"
              aria-pressed={id === shownId}
              onClick={() =>
                cursorAtom.set({ ...cursorAtom.get(), leadId: id })
              }
            >
              {label}
            </Chip>
          ))}
          {chips.length > MAX_CHIPS && (
            <BandLabel>
              {t('table.rowDetail.moreSelected', {
                count: chips.length - MAX_CHIPS,
              })}
            </BandLabel>
          )}
        </Band>
      )}

      <Tools>
        <Input
          size="small"
          allowClear
          value={query}
          placeholder={t('table.rowDetail.filter')}
          aria-label={t('table.rowDetail.filter')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Tools>

      <RegionBody>
        {shown.length === 0 ? (
          <NoField>{t('table.rowDetail.noField')}</NoField>
        ) : (
          shown.map((entry) => (
            // a new row opens its values folded again
            <FieldRow
              key={`${shownId}:${entry.fieldIndex}`}
              entry={entry}
              tools={
                <PanelFieldTools
                  entry={entry}
                  dialect={dialect}
                  onCopy={copy}
                />
              }
            />
          ))
        )}
      </RegionBody>

      <RegionFoot>
        {lastCopy
          ? t('table.rowDetail.copied', { name: lastCopy })
          : t('table.rowDetail.hint')}
      </RegionFoot>
    </Region>
  );
}

/** What the panel offers on a field: following its foreign key, copying its value. */
function PanelFieldTools({
  entry,
  dialect,
  onCopy,
}: {
  entry: RowDetailField;
  dialect: Dialect;
  onCopy: (entry: RowDetailField) => void;
}): ReactElement {
  const { t } = useTranslation();
  const { field, value } = entry;

  return (
    <>
      {field.table && (
        <ForeignKeyLink
          dialect={dialect}
          tableName={field.table}
          columnName={field.name}
          value={value}
        />
      )}
      {!isNullish(value) && (
        <CopyButton
          type="button"
          aria-label={t('table.contextMenu.copy')}
          title={t('table.contextMenu.copy')}
          onClick={() => onCopy(entry)}
        >
          <CopyOutlined />
        </CopyButton>
      )}
    </>
  );
}

const RowMeta = styled(RegionMeta)`
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Band = styled.div`
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space.xs};
  padding: 0 ${space.md} ${space.sm};
  font-size: ${fontSize.sm};
`;

const BandLabel = styled.span`
  margin-inline-end: ${space.xs};
  color: ${emphasisForeground};
`;

// a segment of the view switch, framed on its own
const Chip = styled.button`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${space.xs};
  height: ${size.segment};
  padding: 0 ${space.sm};
  border: 1px solid ${selection};
  background: none;
  font: inherit;
  font-size: ${fontSize.sm};
  color: ${mutedForeground};
  cursor: pointer;

  &:hover {
    color: ${foreground};
  }

  &[aria-pressed='true'] {
    background: ${mutedForeground};
    color: ${background};
  }
`;

const Tools = styled.div`
  flex: none;
  padding: 0 ${space.md} ${space.sm};
  border-bottom: 1px solid ${commentForeground};
`;

// shown on the field under the pointer, or reached by the keyboard
const CopyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${size.segment};
  height: ${size.segment};
  padding: 0;
  border: 0;
  background: none;
  color: ${commentForeground};
  cursor: pointer;
  opacity: 0;

  ${Field}:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${foreground};
  }
`;

const NoField = styled.div`
  padding: ${space.lg} ${space.md};
  font-size: ${fontSize.sm};
  color: ${commentForeground};
`;
