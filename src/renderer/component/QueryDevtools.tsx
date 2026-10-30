import { ReactElement, useEffect, useState } from 'react';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { styled } from 'styled-components';

const Dock = styled.div`
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 1000;
`;

/**
 * The TanStack Query devtools, opened and closed by "View > Toggle query devtools",
 * an entry of development only: the panel renders nothing in a packaged app.
 */
function QueryDevtools(): ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(
    () =>
      window.navigationListener.onToggleQueryDevtools(() =>
        setIsOpen((open) => !open)
      ),
    []
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Dock>
      <ReactQueryDevtoolsPanel onClose={() => setIsOpen(false)} />
    </Dock>
  );
}

export default QueryDevtools;
