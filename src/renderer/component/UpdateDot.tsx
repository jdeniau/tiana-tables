import { Tooltip } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import type { InstallSourceKind } from '../../main-process/installSource';
import type { UpdateStatus } from '../../main-process/updateCheck';
import { classForeground } from '../theme';

/** Sending these users to a download would bypass their package manager. */
const STORE_MANAGED: ReadonlySet<InstallSourceKind> =
  new Set<InstallSourceKind>(['flatpak', 'snap']);

/** the size the frame gives its marks, the pip of an active tab included */
const PIP = '6px';

/**
 * base0A [classes, markup bold]: attention, without the alarm of base08 — and
 * its own slot rather than the frame's accent, so the mark is never the pip of
 * an active tab. It does not follow the tint of a connection: it is the one
 * thing in the bar that is about the app, not about where you are.
 */
const Dot = styled.span`
  flex: none;
  width: ${PIP};
  height: ${PIP};
  background: ${classForeground};
`;

type Props = {
  updateStatus: UpdateStatus;
};

/** A version to install, as a mark beside the brand. Nothing to install, nothing shown. */
export default function UpdateDot({ updateStatus }: Props) {
  const { t } = useTranslation();

  if (
    !updateStatus.available ||
    STORE_MANAGED.has(updateStatus.installSource)
  ) {
    return null;
  }

  const message = t('update.available', {
    source: updateStatus.installSource,
    version: updateStatus.version,
  });

  return (
    <Tooltip title={message}>
      {/* focusable and labelled, so the message is not mouse-only */}
      <Dot role="img" tabIndex={0} aria-label={message} />
    </Tooltip>
  );
}
