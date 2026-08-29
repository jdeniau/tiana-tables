import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../main-process/updateCheck';

const NO_UPDATE: UpdateStatus = { available: false };

/** The main process caches its answer, so mounting this costs no network call. */
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

    return () => {
      isCanceled = true;
    };
  }, []);

  return status;
}
