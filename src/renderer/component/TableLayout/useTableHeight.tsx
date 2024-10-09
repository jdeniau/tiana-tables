import { useEffect, useMemo, useRef, useState } from 'react';

export function useTableHeight(): [number, React.RefObject<HTMLDivElement>] {
  const [yTableScroll, setYTableScroll] = useState<number>(0);
  const resizeRef = useRef<HTMLDivElement>(null);

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        const entry = entries[0];
        const divHeight = entry.borderBoxSize[0].blockSize;

        const tableHeader =
          resizeRef.current?.querySelector('.ant-table-header');

        const tableHeaderHeight =
          tableHeader?.getBoundingClientRect().height ?? 0;

        const titleHeader =
          resizeRef.current?.querySelector('.ant-table-title');
        const titleHeight = titleHeader?.getBoundingClientRect().height ?? 0;

        // I don't know why we need to subtract 1 from the height, but if not, the div will have a scrollbar
        setYTableScroll(divHeight - tableHeaderHeight - titleHeight - 1);
      }),
    []
  );

  useEffect(() => {
    const resizeRefCurrent = resizeRef.current;

    if (resizeRefCurrent) {
      resizeObserver.observe(resizeRefCurrent);
    }

    return () => {
      if (resizeRefCurrent) {
        resizeObserver.unobserve(resizeRefCurrent);
      }
    };
  }, [resizeObserver]);

  return [yTableScroll, resizeRef];
}
