import { Button } from 'antd';
import { usePendingEditContext } from '../../../contexts/PendingEditContext';
import { PendingEditState } from '../../../sql/types';

export function PendingEditSyncButton() {
  const { pendingEdits, markAllAsApplied } = usePendingEditContext();

  const unappliedPendingEdits = pendingEdits.filter(
    (edit) => edit.state === PendingEditState.Pending
  );

  return (
    <Button
      title="Synchronize"
      danger={unappliedPendingEdits.length > 0}
      onClick={() => {
        window.sql.handlePendingEdits(pendingEdits).then((r) => {
          console.log(r);

          // Mark all as applied
          markAllAsApplied();
        });
        // alert(JSON.stringify(pendingEdits, null, 2));
      }}
    >
      🔃
      {unappliedPendingEdits.length}
    </Button>
  );
}
