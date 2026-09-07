import { ReactElement } from 'react';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { KeyboardShortcutTooltip } from '../KeyboardShortcut';
import { Strip, StripLink } from '../Style/Strip';

/**
 * The connections, as a run in the title bar: the active one carries the pip,
 * the last item opens the form for a new one.
 */
export default function Nav(): ReactElement | null {
  const { connectionSlugList, currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();
  const { t } = useTranslation();

  if (!connectionSlugList.length) {
    return null;
  }

  return (
    <Strip $caps $framed>
      {Array.from(connectionSlugList).map((connectionSlug) => {
        const connectionName =
          configuration.connections[connectionSlug]?.name || connectionSlug;

        return (
          <StripLink
            key={connectionSlug}
            active={connectionSlug === currentConnectionSlug}
            title={connectionName}
            to={`/connections/${connectionSlug}`}
          >
            {connectionName}
          </StripLink>
        );
      })}

      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="n">
        <StripLink active={false} aria-label={t('connect.new')} to="/connect">
          +
        </StripLink>
      </KeyboardShortcutTooltip>
    </Strip>
  );
}
