import { ReactElement } from 'react';
import { useLocation } from 'react-router';
import { styled } from 'styled-components';

const DebugContainer = styled.div`
  padding: 3px;
  background: #d2d2d2;
`;
const Url = styled.div`
  background: #fff;
  color: #000;
  border-radius: 3px;
  padding: 2px 5px;
`;

function Debug(): ReactElement | null {
  const location = useLocation();

  if (!window.isDev) {
    return null;
  }

  return (
    <DebugContainer>
      <Url>
        {location.pathname}
        {location.search}
      </Url>
    </DebugContainer>
  );
}

export default Debug;
