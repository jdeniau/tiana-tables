import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { styled } from 'styled-components';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { useTranslation } from '../../../i18n';
import { getCellEditability } from '../../../sql/columnEditing';
import type { Dialect } from '../../../sql/dialect/types';
import {
  FILTER_OPERATORS,
  FilterOperator,
  buildFilterClause,
  operatorTakesValue,
} from '../../../sql/filterClause';
import type { FieldKind } from '../../../sql/resultField';
import { useDialect } from '../../hooks/useDialect';
import { commentForeground } from '../../theme';
import cellValueToText from '../cellValueToText';
import toHexLiteral from '../hexLiteral';
import FreeTextFilterModal, {
  PendingFreeTextFilter,
} from './FreeTextFilterModal';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';
import { RowFormat, rowToCsv, rowToInsert, rowToJson } from './rowFormats';
import type { CellMenuTarget } from './types';

type MenuItem = NonNullable<MenuProps['items']>[number];

/** how much of a literal the menu shows as a preview of a value source */
const MAX_PREVIEW_LENGTH = 24;

interface CellContextMenuProps {
  /** the cell the menu is open on, `null` when it is closed */
  target: CellMenuTarget | null;
  onClose: () => void;
  /**
   * Called with the `WHERE` clause to apply, replacing the current filter.
   * Without it the menu offers no filter: a raw query result has none to feed.
   */
  onFilterChange?: (where: string) => void;
  /** opens the detail modal on the cell, as a double click does */
  onEdit: (target: CellMenuTarget) => void;
  /** writes `NULL` in the cell; only offered where the detail modal could */
  onSetNull: (target: CellMenuTarget) => void;
}

/**
 * The menu a secondary click on a body cell opens: edit the cell or set it to
 * `NULL`, copy its value or its whole row, filter on its column.
 *
 * It lives outside the virtualized body: a single antd component for the whole
 * grid, never one per cell (see the performance note on `TableGrid`).
 *
 * The dropdown is controlled, but still declares the `contextMenu` trigger:
 * that is what wires rc-trigger's outside-click and scroll dismissal. Its
 * anchor is a zero-sized fixed element placed at the click, and it is remounted
 * on every new position — rc-trigger aligns the popup when it opens and would
 * otherwise leave it where it was.
 */
export default function CellContextMenu({
  target,
  onClose,
  onFilterChange,
  onEdit,
  onSetNull,
}: CellContextMenuProps): ReactElement {
  const { t } = useTranslation();
  const dialect = useDialect();
  const { database } = useDatabaseContext();
  const [clipboardText, setClipboardText] = useState<string>('');
  const [pending, setPending] = useState<PendingFreeTextFilter | null>(null);

  // read once per opening, so that the menu can preview what it would compare
  // to — and disable the entry when there is nothing in the clipboard
  useEffect(() => {
    if (!target || !onFilterChange) {
      return;
    }

    let cancelled = false;

    window.clipboard.readText().then((text) => {
      if (!cancelled) {
        setClipboardText(text);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [target, onFilterChange]);

  const applyFilter = useCallback(
    (where: string) => {
      onFilterChange?.(where);
      onClose();
    },
    [onFilterChange, onClose]
  );

  const items = target
    ? buildMenuItems({
        dialect,
        databaseName: database,
        target,
        clipboardText,
        t,
        onEdit: () => {
          onEdit(target);
          onClose();
        },
        onSetNull: () => {
          onSetNull(target);
          onClose();
        },
        onCopy: (text) => {
          void window.clipboard.writeText(text);
          onClose();
        },
        filter: onFilterChange && {
          onApply: applyFilter,
          onAskFreeText: (operator) => {
            setPending({ columnName: target.column.name, operator });
            onClose();
          },
        },
      })
    : undefined;

  return (
    <>
      {target && (
        <Dropdown
          key={`${target.x}:${target.y}`}
          open
          menu={{ items }}
          trigger={['contextMenu']}
          onOpenChange={(open) => {
            if (!open) {
              onClose();
            }
          }}
          destroyOnHidden
        >
          <Anchor style={{ left: target.x, top: target.y }} />
        </Dropdown>
      )}

      <FreeTextFilterModal
        pending={pending}
        onCancel={() => setPending(null)}
        onSubmit={(text) => {
          if (pending) {
            applyFilter(
              buildFilterClause(
                dialect,
                pending.columnName,
                pending.operator,
                dialect.escapeLiteral(text)
              )
            );
          }

          setPending(null);
        }}
      />
    </>
  );
}

interface MenuItemsParams {
  dialect: Dialect;
  databaseName: string | null;
  target: CellMenuTarget;
  clipboardText: string;
  t: ReturnType<typeof useTranslation>['t'];
  onEdit: () => void;
  onSetNull: () => void;
  onCopy: (text: string) => void;
  /** absent where the grid feeds no filter */
  filter:
    | Omit<FilterItemParams, 'dialect' | 'target' | 'clipboardText' | 't'>
    | undefined;
}

/** The entries in three groups: writing the cell, copying it, filtering on it. */
function buildMenuItems({
  dialect,
  databaseName,
  target,
  clipboardText,
  t,
  onEdit,
  onSetNull,
  onCopy,
  filter,
}: MenuItemsParams): MenuProps['items'] {
  const { column, rowKey, row, value } = target;
  const editable = getCellEditability(column.detail, rowKey !== null).editable;
  const insert = rowToInsert(dialect, databaseName, row);

  const items: MenuProps['items'] = [
    {
      key: 'edit',
      // the modal shows what it cannot write, so the entry is never disabled
      label: t('table.contextMenu.edit', { editable: String(editable) }),
      onClick: onEdit,
    },
  ];

  // offered exactly where the detail modal would save a NULL
  if (editable && column.detail?.nullable) {
    items.push({
      key: 'setNull',
      label: t('table.contextMenu.setNull'),
      disabled: isNullish(value),
      onClick: onSetNull,
    });
  }

  items.push(
    { type: 'divider' },
    {
      key: 'copy',
      label: t('table.contextMenu.copy'),
      // there is no text to a NULL, and copying an empty one would silently
      // wipe what the clipboard held
      disabled: isNullish(value),
      onClick: () => onCopy(toCopiedText(value, column.kind)),
    },
    {
      key: 'copyRow',
      label: t('table.contextMenu.copyRow'),
      children: [
        {
          key: RowFormat.Json,
          label: t('table.contextMenu.copyRow.json'),
          onClick: () => onCopy(rowToJson(row)),
        },
        {
          key: RowFormat.Csv,
          label: t('table.contextMenu.copyRow.csv'),
          onClick: () => onCopy(rowToCsv(row)),
        },
        {
          key: RowFormat.SqlInsert,
          label: t('table.contextMenu.copyRow.sqlInsert'),
          // a row of no single known table has nowhere to be inserted into
          disabled: insert === undefined,
          onClick: () => insert !== undefined && onCopy(insert),
        },
      ],
    }
  );

  if (filter) {
    items.push(
      { type: 'divider' },
      buildFilterItem({ dialect, target, clipboardText, t, ...filter })
    );
  }

  return items;
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

/**
 * The whole value, as the detail modal shows it — except bytes, which the
 * modal cuts off after a few kilobytes: a copy must never be truncated.
 */
function toCopiedText(value: unknown, kind: FieldKind): string {
  return value instanceof Uint8Array
    ? toHexLiteral(value, value.length)
    : cellValueToText(value, kind);
}

interface FilterItemParams {
  dialect: Dialect;
  target: CellMenuTarget;
  clipboardText: string;
  t: ReturnType<typeof useTranslation>['t'];
  onApply: (where: string) => void;
  onAskFreeText: (operator: FilterOperator) => void;
}

function buildFilterItem({
  dialect,
  target,
  clipboardText,
  t,
  onApply,
  onAskFreeText,
}: FilterItemParams): MenuItem {
  const { column } = target;

  // a binary column holds bytes the grid only ever shows decoded: comparing to
  // that decoding would not mean what it looks like
  const cellLiteral =
    column.detail?.binary === true
      ? undefined
      : cellValueToSqlLiteral(dialect, target.value, column.kind);

  const clipboardLiteral =
    clipboardText === '' ? undefined : dialect.escapeLiteral(clipboardText);

  const operatorItems = FILTER_OPERATORS.map((operator) => {
    if (!operatorTakesValue(operator)) {
      return {
        key: operator,
        label: operator,
        onClick: () =>
          onApply(buildFilterClause(dialect, column.name, operator)),
      };
    }

    return {
      key: operator,
      label: operator,
      children: [
        {
          key: `${operator}:cell`,
          label: (
            <SourceLabel
              name={t('table.contextMenu.filter.cellValue')}
              literal={cellLiteral}
            />
          ),
          disabled: cellLiteral === undefined,
          onClick: () =>
            cellLiteral !== undefined &&
            onApply(
              buildFilterClause(dialect, column.name, operator, cellLiteral)
            ),
        },
        {
          key: `${operator}:clipboard`,
          label: (
            <SourceLabel
              name={t('table.contextMenu.filter.clipboard')}
              literal={clipboardLiteral}
            />
          ),
          disabled: clipboardLiteral === undefined,
          onClick: () =>
            clipboardLiteral !== undefined &&
            onApply(
              buildFilterClause(
                dialect,
                column.name,
                operator,
                clipboardLiteral
              )
            ),
        },
        {
          key: `${operator}:freeText`,
          label: t('table.contextMenu.filter.freeText'),
          onClick: () => onAskFreeText(operator),
        },
      ],
    };
  });

  return {
    key: 'filter',
    label: t('table.contextMenu.filter'),
    children: [
      {
        key: 'filter:column',
        type: 'group',
        label: column.name,
        children: operatorItems,
      },
    ],
  };
}

function SourceLabel({
  name,
  literal,
}: {
  name: string;
  literal: string | undefined;
}): ReactNode {
  return (
    <>
      {name}
      {literal !== undefined && <Preview>{truncate(literal)}</Preview>}
    </>
  );
}

function truncate(literal: string): string {
  return literal.length > MAX_PREVIEW_LENGTH
    ? `${literal.slice(0, MAX_PREVIEW_LENGTH)}…`
    : literal;
}

const Preview = styled.span`
  margin-left: 0.75em;
  color: ${commentForeground};
`;

// the dropdown hangs off this: a point in the viewport rather than a real
// element, since what was clicked is a cell of the virtualized body.
//
// One pixel, and not zero: rc-trigger refuses to align onto a target its
// `isVisible` rejects, and that test reads `offsetParent` — null on a fixed
// element — before falling back on the size of the bounding rect. A 0×0 anchor
// leaves the popup parked at its pre-alignment `-1000vw` position.
const Anchor = styled.div`
  position: fixed;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;
