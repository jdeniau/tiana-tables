import { Layout } from 'antd';
import { Outlet, useMatch, useNavigate } from 'react-router';
import { styled, useTheme } from 'styled-components';
import packageJson from '../../../package.json';
import {
  ConfigurationContextProvider,
  useConfiguration,
} from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { ThemeContextProvider } from '../../contexts/ThemeContext';
import { useTranslation } from '../../i18n';
import ConnectionStack from '../component/Connection/ConnectionStack';
import ConnectionNav from '../component/Connection/Nav';
import { KeyboardShortcutTooltip } from '../component/KeyboardShortcut';
import PathBar from '../component/PathBar';
import SettingsMenu from '../component/SettingsMenu';
import { TabStrip, TabStripLink } from '../component/Style/TabStrip';
import { Brand, TitleBar, TitleGroup } from '../component/Style/TitleBar';
import useEffectOnce from '../hooks/useEffectOnce';
import useUpdateStatus from '../hooks/useUpdateStatus';
import { background } from '../theme';
import { ConnectionTint, resolveConnectionTint } from '../theme/connectionTint';

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  background-color: ${background};
`;

/** the way to the SQL page, carrying the pip while the page is open */
function ToggleRawSqlButton() {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { t } = useTranslation();
  const onSqlPage =
    useMatch('/connections/:connectionSlug/:databaseName/sql') !== null;

  // The database is part of the link, so there is no SQL page to offer without
  // one: on a connection that failed to open, the slug is in the URL but no
  // database was ever resolved, and the tab would point at `/null/sql`.
  if (!currentConnectionSlug || !database) {
    return null;
  }

  return (
    <TabStrip $caps>
      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="t">
        <TabStripLink
          active={onSqlPage}
          to={`/connections/${currentConnectionSlug}/${database}/sql`}
        >
          {t('sqlPanel.callerButton')}
        </TabStripLink>
      </KeyboardShortcutTooltip>
    </TabStrip>
  );
}

/**
 * The colour the current connection is marked with, resolved against the
 * theme. Without a current connection, or without a colour on it, the frame
 * keeps the palette.
 */
function useCurrentConnectionTint(): ConnectionTint | undefined {
  const { currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();
  const theme = useTheme();

  const connection = currentConnectionSlug
    ? configuration.connections[currentConnectionSlug]
    : undefined;

  return resolveConnectionTint(connection?.color, theme);
}

/** The frame: the brand, the settings and the connections left, the SQL toggle right. */
function AppTitleBar() {
  const updateStatus = useUpdateStatus();
  const tint = useCurrentConnectionTint();

  return (
    <TitleBar $tint={tint}>
      <TitleGroup>
        <Brand to="/">Tiana Tables</Brand>
        <SettingsMenu
          version={packageJson.version}
          updateStatus={updateStatus}
        />
        <ConnectionNav />
      </TitleGroup>

      <TitleGroup>
        <ToggleRawSqlButton />
      </TitleGroup>
    </TitleBar>
  );
}

export default function Root() {
  const navigate = useNavigate();

  // Use `useEffectOnce` here as we don't want to register twice the same event
  // Do not use elsewhere, it's a hacky hook
  useEffectOnce(() => {
    console.info(
      `[startup][renderer] root-route-ready: +${Math.round(performance.now())}ms`
    );

    // returned, so the listener is removed with the component
    return window.navigationListener.onNavigate((path) => {
      console.log('onNavigate called with path: ', path);
      navigate(path);
    });
  });

  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <ConnectionStack>
          <Layout>
            <PathBar />
            <AppTitleBar />

            <Content>
              <Outlet />
            </Content>
          </Layout>
        </ConnectionStack>
      </ThemeContextProvider>
    </ConfigurationContextProvider>
  );
}
