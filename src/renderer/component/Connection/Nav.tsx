import { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { KeyboardShortcutTooltip } from '../KeyboardShortcut';
import { Strip, StripItem } from '../Style/Strip';

/**
 * The connections, as a run in the title bar: the active one carries the pip,
 * the last item opens the form for a new one.
 */
export default function Nav(): ReactElement | null {
  const { connectionSlugList, currentConnectionSlug } = useConnectionContext();
  const { configuration } = useConfiguration();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!connectionSlugList.length) {
    return null;
  }

  return (
    <Strip $caps>
      {Array.from(connectionSlugList).map((connectionSlug) => {
        const connectionName =
          configuration.connections[connectionSlug]?.name || connectionSlug;

        return (
          <StripItem
            key={connectionSlug}
            active={connectionSlug === currentConnectionSlug}
            title={connectionName}
            onClick={() => navigate(`/connections/${connectionSlug}`)}
          >
            {connectionName}
          </StripItem>
        );
      })}

      <KeyboardShortcutTooltip cmdOrCtrl pressedKey="n">
        <StripItem
          active={false}
          aria-label={t('connect.new')}
          onClick={() => navigate('/connect')}
        >
          +
        </StripItem>
      </KeyboardShortcutTooltip>
    </Strip>
  );
}
