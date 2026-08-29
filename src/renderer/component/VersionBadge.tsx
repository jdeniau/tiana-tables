import { Tooltip } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import type { InstallSourceKind } from '../../main-process/installSource';
import type { UpdateStatus } from '../../main-process/updateCheck';
import { classForeground } from '../theme';

/**
 * Sources where a store installs the update on its own. Telling those users to
 * go and download a package would push them to bypass their package manager.
 */
const STORE_MANAGED: ReadonlySet<InstallSourceKind> =
  new Set<InstallSourceKind>(['flatpak', 'snap']);

/**
 * base0A — the "attention" slot of the palette, without the alarm of base08,
 * which is reserved for errors and destructive actions.
 */
const Dot = styled.span`
  display: inline-block;
  width: 0.5em;
  height: 0.5em;
  margin-left: 0.3em;
  border-radius: 50%;
  vertical-align: super;
  background-color: ${classForeground};
`;

type Props = {
  version: string;
  updateStatus: UpdateStatus;
};

/**
 * The version number in the header, with a discreet dot when a newer release
 * exists. Discreet enough that it needs no "dismiss" state: there is nothing
 * to dismiss, and so nothing to persist.
 */
function VersionBadge({ version, updateStatus }: Props) {
  const { t } = useTranslation();

  if (
    !updateStatus.available ||
    STORE_MANAGED.has(updateStatus.installSource)
  ) {
    return <span>v{version}</span>;
  }

  const message = t('update.available', {
    source: updateStatus.installSource,
    version: updateStatus.version,
  });

  return (
    <Tooltip title={message}>
      {/* focusable and labelled, so the message is not mouse-only */}
      <span tabIndex={0} aria-label={message}>
        v{version}
        <Dot />
      </span>
    </Tooltip>
  );
}

export default VersionBadge;
