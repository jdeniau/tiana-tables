import { MouseEvent, ReactElement } from 'react';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { KeyboardShortcutTooltip } from '../KeyboardShortcut';
import { TabStrip, TabStripLink } from '../Style/TabStrip';

/**
 * The connections, as a run in the title bar: the active one carries the pip,
 * the last item opens the form for a new one.
 */
export default function Nav(): ReactElement | null {
  const { connectionSlugList, currentConnectionSlug, closeConnection } =
    useConnectionContext();
  const { configuration } = useConfiguration();
  const { t } = useTranslation();

  /** Middle click closes the connection, the way it closes a browser tab. */
  function handleAuxClick(
    event: MouseEvent<HTMLAnchorElement>,
    connectionSlug: string
  ): void {
    if (event.button !== 1) {
      return;
    }

    // Without this, Chromium asks for a window of its own for the link.
    event.preventDefault();

    closeConnection(connectionSlug);
  }

  if (!connectionSlugList.length) {
    return null;
  }

  return (
    <TabStrip $caps $framed>
      {Array.from(connectionSlugList).map((connectionSlug) => {
        const connectionName =
          configuration.connections[connectionSlug]?.name || connectionSlug;

        return (
          <TabStripLink
            key={connectionSlug}
            active={connectionSlug === currentConnectionSlug}
            onAuxClick={(event) => {
              handleAuxClick(event, connectionSlug);
            }}
            title={connectionName}
            to={`/connections/${connectionSlug}`}
          >
            {connectionName}
          </TabStripLink>
        );
      })}

      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="n">
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
