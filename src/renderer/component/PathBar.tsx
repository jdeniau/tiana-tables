import { ReactElement, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { styled } from 'styled-components';
import { background, commentForeground, space } from '../theme';

const Bar = styled.div`
  padding: ${space.xs} ${space.md};
  background-color: ${background};
  border-bottom: 1px solid ${commentForeground};
  color: ${commentForeground};
`;

/**
 * A debugging aid, shown and hidden by "View > Toggle path bar" — displayed
 * by default in development, hidden in a packaged app.
 */
function PathBar(): ReactElement | null {
  const [showPath, setShowPath] = useState(window.isDev);
  const location = useLocation();

  useEffect(
    () => window.navigationListener.onPathBarVisibilityChange(setShowPath),
    []
  );

  if (!showPath) {
    return null;
  }

  return (
    <Bar>
      {location.pathname}
      {location.search}
    </Bar>
  );
}

export default PathBar;
