import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../main-process/updateStatus';

const NO_UPDATE: UpdateStatus = { available: false };

/** The main process caches GitHub's answer, and sends what the auto-updater changes later on. */
export default function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>(NO_UPDATE);

  useEffect(() => {
    let isCanceled = false;

    window.update
      .check()
      .then((result) => {
        if (!isCanceled) {
          setStatus(result);
        }
      })
      .catch(() => {
        // a failed check must never surface; the main process logs why
      });

    const unsubscribe = window.update.onStatusChange(setStatus);

    return () => {
      isCanceled = true;
      unsubscribe();
    };
  }, []);

  return status;
}
