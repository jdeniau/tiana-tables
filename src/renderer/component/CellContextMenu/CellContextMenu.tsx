import { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';
import { useSelector } from '@tanstack/react-store';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { styled } from 'styled-components';
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
import { isNullish } from '../../utils/isNullish';
import { useCellWrite } from '../CellWrite';
import cellValueToText from '../cellValueToText';
import toHexLiteral from '../hexLiteral';
import FreeTextFilterModal, {
  PendingFreeTextFilter,
} from './FreeTextFilterModal';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';
import type { RowCell, RowFormat } from './rowFormats';
import {
  columnNamesAtom,
  isColumnNamesKey,
  rowsCopyItem,
} from './rowsCopyItem';
import type { CellMenuTarget } from './types';

type MenuItem = NonNullable<MenuProps['items']>[number];

/** how much of a literal the menu shows as a preview of a value source */
const MAX_PREVIEW_LENGTH = 24;

/** How the menu copies rows: the one it was opened on, or the selected ones. */
interface RowsCopyMenu {
  /** empty on a grid whose rows cannot be selected */
  selectedRows: ReadonlyArray<ReadonlyArray<RowCell>>;
  copyRows: (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ) => void;
  canCopyAs: (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ) => boolean;
}

interface CellContextMenuProps {
  /** the cell the menu is open on, `null` when it is closed */
  target: CellMenuTarget | null;
  rowsCopy: RowsCopyMenu;
  onClose: () => void;
  /**
   * Called with the `WHERE` clause to apply, replacing the current filter.
   * Without it the menu offers no filter: a raw query result has none to feed.
   */
  onFilterChange?: (where: string) => void;
  /** opens the detail modal on the cell, as a double click does */
  onEdit: (target: CellMenuTarget) => void;
}

/**
 * The menu a secondary click on a body cell opens: edit the cell or set it to
 * `NULL`, copy its value, its whole row or the selected rows, filter on its column.
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
  rowsCopy,
  onClose,
  onFilterChange,
  onEdit,
}: CellContextMenuProps): ReactElement {
  const { t } = useTranslation();
  const { writeCell, reportFailure } = useCellWrite();
  const dialect = useDialect();
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

  const applyFilter = (where: string) => {
    onFilterChange?.(where);
    onClose();
  };

  const columnNames = useSelector(columnNamesAtom);

  // the same entries for the row of the menu and for the selected rows
  const copyRowsItem = (
    key: string,
    label: string,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ) =>
    rowsCopyItem({
      key,
      label,
      t,
      canCopyAs: (format) => rowsCopy.canCopyAs(format, rows),
      onCopy: (format) => rowsCopy.copyRows(format, rows),
      columnNames,
      onToggleColumnNames: () => columnNamesAtom.set((shown) => !shown),
    });

  const items = target
    ? buildMenuItems({
        dialect,
        target,
        clipboardText,
        t,
        onEdit: () => onEdit(target),
        onSetNull: () => {
          const write = {
            detail: target,
            newValue: null,
            originalValue: target.value,
          };

          // no form to show a SQL error in: the conflict modal shows it
          writeCell(write).catch((error) => reportFailure(write, error));
        },
        onCopy: (text) => {
          void window.clipboard.writeText(text);
        },
        copyRowsItems: [
          copyRowsItem('copyRow', t('table.contextMenu.copyRow'), [target.row]),
          // a selection of one row is the row of the menu, already offered
          ...(rowsCopy.selectedRows.length > 1
            ? [
                copyRowsItem(
                  'copySelection',
                  t('table.copy.rowsAs', {
                    count: rowsCopy.selectedRows.length,
                  }),
                  rowsCopy.selectedRows
                ),
              ]
            : []),
        ],
        filter: onFilterChange && {
          onApply: applyFilter,
          onAskFreeText: (operator) => {
            setPending({ columnName: target.column.name, operator });
          },
        },
      })
    : undefined;

  return (
    <>
      {target && (
        <CellMenuDropdown
          key={`${target.x}:${target.y}`}
          x={target.x}
          y={target.y}
          items={items}
          onClose={onClose}
        />
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

/** The dropdown of one secondary click, with the submenus it opened: the next click starts with none. */
function CellMenuDropdown({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuProps['items'];
  onClose: () => void;
}): ReactElement {
  const [openKeys, setOpenKeys] = useState<Array<string>>([]);
  // set by a click on the toggle of the column names, which must not close its submenu
  const keepSubmenuOpen = useRef(false);

  return (
    <Dropdown
      open
      menu={{
        items,
        openKeys,
        // runs before rc-menu closes every submenu after a click, the toggle's own included
        onClick: ({ key }) => {
          keepSubmenuOpen.current = isColumnNamesKey(key);
        },
        onOpenChange: (keys) => {
          if (keepSubmenuOpen.current) {
            keepSubmenuOpen.current = false;
          } else {
            setOpenKeys(keys);
          }
        },
      }}
      trigger={['contextMenu']}
      // a click closes the menu, but the one on the toggle of the column names
      onOpenChange={(open) => {
        if (!open && !keepSubmenuOpen.current) {
          onClose();
        }
      }}
      destroyOnHidden
    >
      <Anchor style={{ left: x, top: y }} />
    </Dropdown>
  );
}

interface MenuItemsParams {
  dialect: Dialect;
  target: CellMenuTarget;
  clipboardText: string;
  t: ReturnType<typeof useTranslation>['t'];
  onEdit: () => void;
  onSetNull: () => void;
  onCopy: (text: string) => void;
  /** the submenus that copy the row of the menu, then the selected rows */
  copyRowsItems: Array<MenuItem>;
  /** absent where the grid feeds no filter */
  filter:
    | Omit<FilterItemParams, 'dialect' | 'target' | 'clipboardText' | 't'>
    | undefined;
}

/** The entries in three groups: writing the cell, copying it, its row or the selected rows, filtering on it. */
function buildMenuItems({
  dialect,
  target,
  clipboardText,
  t,
  onEdit,
  onSetNull,
  onCopy,
  copyRowsItems,
  filter,
}: MenuItemsParams): MenuProps['items'] {
  const { column, rowKey, value } = target;
  const editable = getCellEditability(column.detail, rowKey !== null).editable;

  const items: MenuProps['items'] = [
    {
      key: 'edit',
      // the modal shows what it cannot write, so the entry is never disabled
      label: t('table.contextMenu.edit', { editable: String(editable) }),
      // the gesture that opens the same modal
      extra: t('table.contextMenu.edit.shortcut'),
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
    ...copyRowsItems
  );

  if (filter) {
    items.push(
      { type: 'divider' },
      buildFilterItem({ dialect, target, clipboardText, t, ...filter })
    );
  }

  return items;
}

/**
 * The whole value, as the detail modal shows it — except bytes, which the
 * modal cuts off after a few kilobytes: a copy must never be truncated.
 */
function toCopiedText(value: unknown, kind: FieldKind): string {
  return value instanceof Uint8Array
    ? toHexLiteral(value)
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
      : cellValueToSqlLiteral(dialect, target.value);

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
