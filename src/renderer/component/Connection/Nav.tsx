import { ReactElement } from 'react';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { KeyboardShortcutTooltip, ShortcutModifier } from '../KeyboardShortcut';
import {
  TabStrip,
  TabStripClosableLink,
  TabStripLink,
} from '../Style/TabStrip';

/**
 * The connections, as a run in the title bar: the active one carries the pip,
 * each closes on its cross or the middle button,
 * the last item opens the form for a new one.
 */
export default function Nav(): ReactElement | null {
  const { connectionSlugList, currentConnectionSlug, closeConnection } =
    useConnectionContext();
  const { configuration } = useConfiguration();
  const { t } = useTranslation();

  if (!connectionSlugList.length) {
    return null;
  }

  return (
    <TabStrip $caps $framed>
      {Array.from(connectionSlugList).map((connectionSlug) => {
        const connection = configuration.connections[connectionSlug];
        const connectionName = connection?.name || connectionSlug;

        return (
          <TabStripClosableLink
            key={connectionSlug}
            active={connectionSlug === currentConnectionSlug}
            // the engine in the tooltip only: the text of a tab is its name, and its colour the prod/dev mark
            title={
              connection
                ? `${connectionName} · ${t('connection.engine.name', { engine: connection.engine })}`
                : connectionName
            }
            to={`/connections/${connectionSlug}`}
            onClose={() => closeConnection(connectionSlug)}
            closeLabel={t('connection.close')}
          >
            {connectionName}
          </TabStripClosableLink>
        );
      })}

      <KeyboardShortcutTooltip
        modifier={ShortcutModifier.CmdOrCtrl}
        pressedKey="n"
      >
        <TabStripLink
          active={false}
          aria-label={t('connect.new')}
          to="/connect"
        >
          +
        </TabStripLink>
      </KeyboardShortcutTooltip>
    </TabStrip>
  );
}
