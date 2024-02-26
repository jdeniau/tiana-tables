import { Outlet } from 'react-router';
import ConnectionStack from '../component/Connection/ConnectionStack';
import { ConfigurationContextProvider } from '../contexts/ConfigurationContext';
import { styled } from 'styled-components';
import Debug from '../component/Debug';
import ThemeSelector from '../component/ThemeSelector';
import { Layout } from 'antd';
import { getSetting } from '../theme';
import ConnectionNav from '../component/Connection/Nav';
import { ThemeContextProvider } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n';

const Header = styled(Layout.Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${({ theme }) => getSetting(theme, 'selection')};
`;

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => getSetting(theme, 'background')};
`;

export default function Root() {
  const { t } = useTranslation();

  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <ConnectionStack>
          <Layout>
            <Debug />
            <Header>
              <h2>Tiana Tables</h2>

              <ConnectionNav />

              <div>
                {t('theme.switch.label')} <ThemeSelector />
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
