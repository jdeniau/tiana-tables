import { Flex, Layout } from 'antd';
import { Outlet, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import packageJson from '../../../package.json';
import { ConfigurationContextProvider } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { ThemeContextProvider } from '../../contexts/ThemeContext';
import { useTranslation } from '../../i18n';
import ButtonLink from '../component/ButtonLink';
import ConnectionStack from '../component/Connection/ConnectionStack';
import ConnectionNav from '../component/Connection/Nav';
import Debug from '../component/Debug';
import { KeyboardShortcutTooltip } from '../component/KeyboardShortcut';
import LangSelector from '../component/LangSelector';
import ThemeSelector from '../component/ThemeSelector';
import useEffectOnce from '../hooks/useEffectOnce';
import { background, foreground, selection } from '../theme';

export const Header = styled(Layout.Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${selection};
`;

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  background-color: ${background};
`;

export const RootLink = styled(Link)`
  color: ${foreground};
  text-decoration: none;

  &:hover {
    color: ${foreground};
  }
`;

function ToggleRawSqlButton() {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { t } = useTranslation();

  if (!currentConnectionSlug) {
    return null;
  }

  return (
    <KeyboardShortcutTooltip cmdOrCtrl pressedKey="t">
      <ButtonLink to={`/connections/${currentConnectionSlug}/${database}/sql`}>
        {t('sqlPanel.callerButton')}
      </ButtonLink>
    </KeyboardShortcutTooltip>
  );
}

export default function Root() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Use `useEffectOnce` here as we don't want to register twice the same event
  // Do not use elsewhere, it's a hacky hook
  useEffectOnce(() => {
    window.navigationListener.onNavigate((path) => {
      console.log('onNavigate called with path: ', path);
      navigate(path);
    });
  });

  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <ConnectionStack>
          <Layout>
            <Debug />
            <Header>
              <Flex align="center" gap="small">
                <h2>
                  <RootLink to="/">Tiana Tables</RootLink>
                </h2>
                <span>v{packageJson.version}</span>
              </Flex>

              <ConnectionNav />

              <Flex gap="small" align="center">
                {t('language.switch.label')} <LangSelector />
                {t('theme.switch.label')} <ThemeSelector />
              </Flex>

              <ToggleRawSqlButton />
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
