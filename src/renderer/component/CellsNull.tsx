import { type ReactElement, useEffect } from 'react';
import { Modal, Typography } from 'antd';
import { useTranslation } from '../../i18n';
import { getCellEditability } from '../../sql/columnEditing';
import { isNullish } from '../utils/isNullish';
import type { CellDetail } from './CellDetailModal';
import { type CellWrite, useCellWrite } from './CellWrite';

/** Whether the detail modal would save a NULL in the cell. */
export function canBeSetNull({ column, rowKey }: CellDetail): boolean {
  return (
    getCellEditability(column.detail, rowKey !== null).editable &&
    column.detail?.nullable === true
  );
}

/** The writes that set the cells to NULL, short of those that cannot be or already are. */
export function setNullWrites(
  details: ReadonlyArray<CellDetail>
): Array<CellWrite> {
  return details
    .filter((detail) => canBeSetNull(detail) && !isNullish(detail.value))
    .map((detail) => ({ detail, newValue: null, originalValue: detail.value }));
}

/** Sets the cells to NULL: one at once, several once confirmed through `onAsk`. */
export function useSetNull(
  onAsk: (writes: ReadonlyArray<CellWrite>) => void
): (writes: ReadonlyArray<CellWrite>) => void {
  const { writeCells } = useCellWrite();

  return (writes) => {
    if (writes.length > 1) {
      onAsk(writes);
    } else {
      void writeCells(writes);
    }
  };
}

interface CellsNullProps {
  scrollElement: HTMLElement | null;
  /** the selected cells, empty while rows are selected */
  selectedCells: () => Array<CellDetail>;
  /** the writes the confirmation asks about, `null` while it is closed */
  pending: ReadonlyArray<CellWrite> | null;
  onPendingChange: (pending: ReadonlyArray<CellWrite> | null) => void;
}

/** The Delete key on the selected cells of the focused grid, and the confirmation it asks before setting several to NULL. */
export default function CellsNull({
  scrollElement,
  selectedCells,
  pending,
  onPendingChange,
}: CellsNullProps): ReactElement {
  const { t } = useTranslation();
  const { writeCells } = useCellWrite();
  const setNull = useSetNull(onPendingChange);
  const count = pending?.length ?? 0;

  useEffect(() => {
    if (!scrollElement) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key !== 'Delete' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const writes = setNullWrites(selectedCells());

      if (writes.length > 0) {
        event.preventDefault();
        setNull(writes);
      }
    };

    scrollElement.addEventListener('keydown', onKeyDown);

    return () => scrollElement.removeEventListener('keydown', onKeyDown);
  }, [scrollElement, selectedCells, setNull]);

  return (
    <Modal
      open={pending !== null}
      title={t('table.setNull.title', { count })}
      okText={t('table.setNull.confirm')}
      // Delete then Enter writes, Escape cancels
      okButtonProps={{ danger: true, autoFocus: true }}
      cancelText={t('table.setNull.cancel')}
      onOk={() => {
        if (pending) {
          void writeCells(pending);
        }

        onPendingChange(null);
      }}
      onCancel={() => onPendingChange(null)}
      destroyOnHidden
    >
      <Typography.Paragraph>
        {t('table.setNull.description', { count })}
      </Typography.Paragraph>
    </Modal>
  );
}
