import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../main-process/updateCheck';

const NO_UPDATE: UpdateStatus = { available: false };

/**
 * The main process answers once per session and caches the result, so this
 * hook can run on every mount without adding a single network call.
 */
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
        // Not knowing whether an update exists is never worth showing: the
        // main process already logs why.
      });

    return () => {
      isCanceled = true;
    };
  }, []);

  return status;
}
