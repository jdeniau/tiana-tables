import { createAtom } from '@tanstack/react-store';
import { Checkbox } from 'antd';
import type { MenuProps } from 'antd';
import { styled } from 'styled-components';
import type { useTranslation } from '../../../i18n';
import { KeyboardShortcut } from '../KeyboardShortcut';
import { RowFormat } from './rowFormats';

type MenuItem = NonNullable<MenuProps['items']>[number];

/** Whether TSV and CSV start with the column names, for the rest of the session. */
export const columnNamesAtom = createAtom(true);

const COPY_FORMATS = [
  RowFormat.Tsv,
  RowFormat.Csv,
  RowFormat.Markdown,
  RowFormat.Json,
  RowFormat.SqlInsert,
];

const COLUMN_NAMES_SUFFIX = ':columnNames';

/** Whether a menu key is the toggle of the column names, whose click keeps its submenu open. */
export function isColumnNamesKey(key: string): boolean {
  return key.endsWith(COLUMN_NAMES_SUFFIX);
}

// the entry toggles it, so that a click anywhere on the line does
const PassiveCheckbox = styled(Checkbox)`
  pointer-events: none;
`;

interface RowsCopyItemParams {
  /** the key of the submenu, which prefixes the keys of its entries */
  key: string;
  label: string;
  t: ReturnType<typeof useTranslation>['t'];
  canCopyAs: (format: RowFormat) => boolean;
  onCopy: (format: RowFormat) => void;
  columnNames: boolean;
  onToggleColumnNames: () => void;
}

/** A submenu that copies rows: one entry per format, then the column names to toggle. */
export function rowsCopyItem({
  key,
  label,
  t,
  canCopyAs,
  onCopy,
  columnNames,
  onToggleColumnNames,
}: RowsCopyItemParams): MenuItem {
  return {
    key,
    label,
    children: [
      ...COPY_FORMATS.map((format) => ({
        key: `${key}:${format}`,
        label: t('table.copy.format', { format }),
        // what Ctrl+C writes
        extra: format === RowFormat.Tsv && (
          <KeyboardShortcut cmdOrCtrl pressedKey="c" />
        ),
        disabled: !canCopyAs(format),
        onClick: () => onCopy(format),
      })),
      { type: 'divider' as const },
      {
        key: `${key}${COLUMN_NAMES_SUFFIX}`,
        label: (
          <PassiveCheckbox checked={columnNames} tabIndex={-1}>
            {t('table.copy.columnNames')}
          </PassiveCheckbox>
        ),
        extra: t('table.copy.columnNames.formats'),
        onClick: onToggleColumnNames,
      },
    ],
  };
}
