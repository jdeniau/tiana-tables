import { ReactElement, ReactNode, useState } from 'react';
import { CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { type Atom, useSelector } from '@tanstack/react-store';
import type { RowSelectionState } from '@tanstack/react-table';
import { Button, Input, Splitter } from 'antd';
import { styled } from 'styled-components';
import { PANEL } from '../../../configuration/panels';
import { useTranslation } from '../../../i18n';
import type { Dialect } from '../../../sql/dialect/types';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { PanelPosition, usePanelSize } from '../../hooks/usePanelSize';
import {
  background,
  commentForeground,
  constantForeground,
  emphasisForeground,
  fontSize,
  foreground,
  mutedForeground,
  selection,
  size,
  space,
  stringForeground,
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
import { rowIdOf } from '../rowId';
import { useLastCopy } from '../useLastCopy';
import {
  type RowPanelField,
  filterRowPanelFields,
  rowKeyText,
  rowPanelFields,
} from './rowPanelFields';

/** past this many characters, or lines, a value opens folded */
const LONG_TEXT_LENGTH = 140;
const CLAMPED_LINES = 4;

/** a selection of every row would otherwise mount a button per row */
const MAX_CHIPS = 50;

interface RowPanelProps<Row extends ResultRow> {
  /** the rows of the grid, in its order */
  rows: ReadonlyArray<Row>;
  /** the fields the grid is given, in that order */
  fields: ReadonlyArray<ResultField>;
  primaryKeys?: Array<string>;
  rowsAsArray: boolean;
  /** the atoms the grid is given */
  selectionAtom: Atom<RowSelectionState>;
  shownRowAtom: Atom<string | null>;
}

/** A grid's region, and beside it, while a row is shown, the region of that row's fields. */
export function WithRowPanel<Row extends ResultRow>({
  children,
  rows,
  fields,
  primaryKeys,
  rowsAsArray,
  selectionAtom,
  shownRowAtom,
}: RowPanelProps<Row> & { children: ReactNode }): ReactElement {
  // one width for every page: it is the shape of the window, not of the data
  const { panelProps, onResizeEnd } = usePanelSize(
    PANEL.ROW_DETAIL,
    PanelPosition.Last
  );
  // antd seeds its sizes at mount only, and this panel mounts later: its size is ours
  const [draggedSize, setDraggedSize] = useState<number>();
  const shownId = useSelector(shownRowAtom);
  const index =
    shownId === null
      ? -1
      : rows.findIndex(
          (row, rowIndex) => rowIdOf(row, rowIndex, primaryKeys) === shownId
        );

  // built apart from its `Splitter.Panel`, so that a drag re-renders none of it
  const rowPanel = (
    <RowPanel
      rows={rows}
      fields={fields}
      primaryKeys={primaryKeys}
      rowsAsArray={rowsAsArray}
      selectionAtom={selectionAtom}
      shownRowAtom={shownRowAtom}
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
          {rowPanel}
        </Splitter.Panel>
      )}
    </Splitter>
  );
}

function RowPanel<Row extends ResultRow>({
  rows,
  fields,
  primaryKeys,
  rowsAsArray,
  selectionAtom,
  shownRowAtom,
  index,
}: RowPanelProps<Row> & { index: number }): ReactElement {
  const { t } = useTranslation();
  const dialect = useDialect();
  const [query, setQuery] = useState('');
  const [lastCopy, onCopied] = useLastCopy<string>();
  const selection = useSelector(selectionAtom);

  const row = rows[index];
  const shownId = rowIdOf(row, index, primaryKeys);
  const all = rowPanelFields(row, fields, primaryKeys, rowsAsArray);
  const shown = filterRowPanelFields(all, query);

  const chips = rows.flatMap((one, rowIndex) => {
    const id = rowIdOf(one, rowIndex, primaryKeys);

    return selection[id]
      ? [
          {
            id,
            label:
              primaryKeys && primaryKeys.length > 0
                ? primaryKeys.map((pk) => String(one[pk])).join(', ')
                : t('table.rowPanel.row', { position: rowIndex + 1 }),
          },
        ]
      : [];
  });

  const meta = [
    rowKeyText(row, primaryKeys),
    t('table.rowPanel.position', {
      position: index + 1,
      count: rows.length,
    }),
    shown.length < all.length &&
      t('table.rowPanel.fieldCount', {
        shown: shown.length,
        count: all.length,
      }),
  ]
    .filter(Boolean)
    .join(' · ');

  const copy = ({ field, text }: RowPanelField): void => {
    void window.clipboard.writeText(text).then(() => onCopied(field.name));
  };

  return (
    <Region as="aside" aria-label={t('table.rowPanel.title')}>
      <RegionHeader>
        <RegionGroup>
          <RegionName>{t('table.rowPanel.title')}</RegionName>
          <RowMeta title={meta}>{meta}</RowMeta>
        </RegionGroup>

        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          aria-label={t('table.rowPanel.close')}
          title={t('table.rowPanel.close')}
          onClick={() => shownRowAtom.set(null)}
        />
      </RegionHeader>

      {chips.length > 1 && (
        <Band>
          <BandLabel>
            {t('table.rowPanel.selected', { count: chips.length })}
          </BandLabel>
          {chips.slice(0, MAX_CHIPS).map(({ id, label }) => (
            <Chip
              key={id}
              type="button"
              aria-pressed={id === shownId}
              onClick={() => shownRowAtom.set(id)}
            >
              {label}
            </Chip>
          ))}
          {chips.length > MAX_CHIPS && (
            <BandLabel>
              {t('table.rowPanel.moreSelected', {
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
          placeholder={t('table.rowPanel.filter')}
          aria-label={t('table.rowPanel.filter')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Tools>

      <RegionBody>
        {shown.length === 0 ? (
          <NoField>{t('table.rowPanel.noField')}</NoField>
        ) : (
          shown.map((entry) => (
            // a new row opens its values folded again
            <FieldRow
              key={`${shownId}:${entry.fieldIndex}`}
              entry={entry}
              dialect={dialect}
              onCopy={copy}
            />
          ))
        )}
      </RegionBody>

      <RegionFoot>
        {lastCopy
          ? t('table.rowPanel.copied', { name: lastCopy })
          : t('table.rowPanel.hint')}
      </RegionFoot>
    </Region>
  );
}

function FieldRow({
  entry,
  dialect,
  onCopy,
}: {
  entry: RowPanelField;
  dialect: Dialect;
  onCopy: (entry: RowPanelField) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { field, value, text } = entry;
  const isNull = isNullish(value);
  const isLong =
    text.length > LONG_TEXT_LENGTH || text.split('\n').length > CLAMPED_LINES;

  return (
    <Field>
      <FieldName>{field.name}</FieldName>

      <FieldValue>
        <Value
          data-tone={toneOf(field.kind, value)}
          data-clamped={(isLong && !expanded) || undefined}
        >
          {isNull ? t('cell.detail.nullPlaceholder') : text}
        </Value>
        {isLong && (
          <TextButton type="button" onClick={() => setExpanded(!expanded)}>
            {expanded
              ? t('table.rowPanel.collapse')
              : t('table.rowPanel.expand', { length: text.length })}
          </TextButton>
        )}
      </FieldValue>

      <FieldTools>
        {field.table && (
          <ForeignKeyLink
            dialect={dialect}
            tableName={field.table}
            columnName={field.name}
            value={value}
          />
        )}
        {!isNull && (
          <CopyButton
            type="button"
            aria-label={t('table.contextMenu.copy')}
            title={t('table.contextMenu.copy')}
            onClick={() => onCopy(entry)}
          >
            <CopyOutlined />
          </CopyButton>
        )}
      </FieldTools>
    </Field>
  );
}

/** The colour the grid gives a value. */
enum ValueTone {
  Plain = 'plain',
  Constant = 'constant',
  String = 'string',
}

/** read from the shape of the value first, as `Cell` does */
function toneOf(kind: FieldKind, value: unknown): ValueTone {
  if (isNullish(value) || value instanceof Uint8Array) {
    return ValueTone.Constant;
  }

  if (typeof value === 'object') {
    return ValueTone.Plain;
  }

  switch (kind) {
    case FieldKind.Number:
      return ValueTone.Constant;
    case FieldKind.String:
      return ValueTone.String;
    default:
      return ValueTone.Plain;
  }
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
  display: flex;
  flex: none;
  gap: ${space.sm};
  padding: 0 ${space.md} ${space.sm};
  border-bottom: 1px solid ${commentForeground};
`;

const Field = styled.div`
  display: grid;
  flex: none;
  grid-template-columns: 36% minmax(0, 1fr) auto;
  column-gap: ${space.md};
  align-items: baseline;
  padding: ${space.xs} ${space.xs} ${space.xs} ${space.md};
  border-bottom: 1px solid ${selection};

  &:hover {
    background: color-mix(in srgb, ${selection} 40%, ${background});
  }
`;

const FieldName = styled.span`
  font-size: ${fontSize.sm};
  color: ${commentForeground};
  overflow-wrap: anywhere;
`;

const FieldValue = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${space.xs};
  min-width: 0;
`;

const Value = styled.span`
  max-width: 100%;
  font-size: ${fontSize.base};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: ${foreground};

  &[data-tone='${ValueTone.Constant}'] {
    color: ${constantForeground};
  }

  &[data-tone='${ValueTone.String}'] {
    color: ${stringForeground};
  }

  &[data-clamped] {
    display: -webkit-box;
    -webkit-line-clamp: ${CLAMPED_LINES};
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const TextButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: ${fontSize.sm};
  color: ${commentForeground};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${foreground};
  }
`;

const FieldTools = styled.div`
  display: flex;
  align-items: center;
  align-self: start;
  gap: ${space.xs};
  height: ${size.segment};
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
