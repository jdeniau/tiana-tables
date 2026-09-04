import { Suspense, lazy } from 'react';
import { Layout } from 'antd';
import { Outlet, useNavigate } from 'react-router';
import { styled } from 'styled-components';
import packageJson from '../../../package.json';
import { ConfigurationContextProvider } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { ThemeContextProvider } from '../../contexts/ThemeContext';
import { useTranslation } from '../../i18n';
import ConnectionStack from '../component/Connection/ConnectionStack';
import ConnectionNav from '../component/Connection/Nav';
import { KeyboardShortcutTooltip } from '../component/KeyboardShortcut';
import SettingsMenu from '../component/SettingsMenu';
import {
  Brand,
  TitleActionLink,
  TitleBar,
  TitleGroup,
} from '../component/Style/TitleBar';
import useEffectOnce from '../hooks/useEffectOnce';
import useUpdateStatus from '../hooks/useUpdateStatus';
import { background } from '../theme';

const Debug = lazy(() => import('../component/Debug'));

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  background-color: ${background};
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
      <TitleActionLink
        type="text"
        to={`/connections/${currentConnectionSlug}/${database}/sql`}
      >
        {t('sqlPanel.callerButton')}
      </TitleActionLink>
    </KeyboardShortcutTooltip>
  );
}

export default function Root() {
  const navigate = useNavigate();
  const updateStatus = useUpdateStatus();

  // Use `useEffectOnce` here as we don't want to register twice the same event
  // Do not use elsewhere, it's a hacky hook
  useEffectOnce(() => {
    console.info(
      `[startup][renderer] root-route-ready: +${Math.round(performance.now())}ms`
    );

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
            {window.isDev ? (
              <Suspense fallback={null}>
                <Debug />
              </Suspense>
            ) : null}
            <TitleBar>
              <TitleGroup>
                <Brand to="/">Tiana Tables</Brand>
                <ConnectionNav />
              </TitleGroup>

              <TitleGroup>
                <ToggleRawSqlButton />
                <SettingsMenu
                  version={packageJson.version}
                  updateStatus={updateStatus}
                />
              </TitleGroup>
            </TitleBar>

            <Content>
              <Outlet />
            </Content>
          </Layout>
        </ConnectionStack>
      </ThemeContextProvider>
    </ConfigurationContextProvider>
  );
}
