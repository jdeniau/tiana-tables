import { useEffect, useRef, useState } from 'react';

/**
 * Taken from https://dev.to/ag-grid/react-18-avoiding-use-effect-getting-called-twice-4i9e
 *
 * Used only for navigation and callback registering. Do not use elsewhere.
 */
export default function useEffectOnce(effect: () => void | (() => void)) {
  const destroyFunc = useRef<void | (() => void)>(undefined);
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [_val, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }
      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
