import { Outlet } from 'react-router';
import ConnectionStack from '../component/Connection/ConnectionStack';
import {
  ConfigurationContextProvider,
  ThemeContextProvider,
} from '../Contexts';
import { styled } from 'styled-components';
import Debug from '../component/Debug';
import ThemeSelector from '../component/ThemeSelector';

const HeaderDiv = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 46px;
`;

export default function Root() {
  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <ConnectionStack>
          <Debug />

          <HeaderDiv>
            <h2>Welcome to Tiana Tables !</h2>
            <div>
              Theme: <ThemeSelector />
            </div>
          </HeaderDiv>
          <Outlet />
        </ConnectionStack>
      </ThemeContextProvider>
    </ConfigurationContextProvider>
  );
}
