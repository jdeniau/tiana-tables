import { Outlet } from 'react-router';
import ConnectionStack from '../component/Connection/ConnectionStack';
import {
  ConfigurationContextProvider,
  ThemeContextProvider,
} from '../Contexts';
import { styled } from 'styled-components';
import Debug from '../component/Debug';
import ThemeSelector from '../component/ThemeSelector';
import { Layout } from 'antd';
import { getSetting } from '../theme';

const Header = styled(Layout.Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${({ theme }) => getSetting(theme, 'background')};
`;

const Content = styled(Layout.Content)`
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

export default function Root() {
  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <ConnectionStack>
          <Layout>
            <Debug />
            <Header>
              <h2>Tiana Tables</h2>
              <div>
                Theme: <ThemeSelector />
              </div>
            </Header>

            <Content>
              <Outlet />
            </Content>
          </Layout>
        </ConnectionStack>
      </ThemeContextProvider>
    </ConfigurationContextProvider>
  );
}
