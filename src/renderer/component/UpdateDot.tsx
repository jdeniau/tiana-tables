import { Tooltip } from 'antd';
import { css, styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import type { InstallSourceKind } from '../../main-process/installSource';
import { UpdateStatus, UpdateStep } from '../../main-process/updateStatus';
import { classForeground, frame, space } from '../theme';

/** Sending these users to a download would bypass their package manager. */
const STORE_MANAGED: ReadonlySet<InstallSourceKind> =
  new Set<InstallSourceKind>(['flatpak', 'snap']);

/** the size the frame gives its marks, the pip of an active tab included */
const PIP = '6px';

/**
 * The dot is drawn inside a hit area that its negative margin keeps out of the layout.
 *
 * base0A [classes, markup bold]: attention, without the alarm of base08 — and
 * its own slot rather than the frame's accent, so the mark is never the pip of
 * an active tab. It does not follow the tint of a connection: it is the one
 * thing in the bar that is about the app, not about where you are.
 */
const dot = css`
  display: flex;
  flex: none;
  padding: ${space.xs};
  margin: calc(-1 * ${space.xs});
  border: none;
  background: none;
  cursor: pointer;

  &::before {
    content: '';
    width: ${PIP};
    height: ${PIP};
    background: ${classForeground};
  }

  &:focus-visible {
    outline: 1px solid ${frame.accent};
  }
`;

const DotButton = styled.button`
  ${dot}
`;

const DotLink = styled.a`
  ${dot}
`;

type Props = {
  updateStatus: UpdateStatus;
};

/** A version to install, as a mark beside the brand that leads to it. Nothing to install, nothing shown. */
export default function UpdateDot({ updateStatus }: Props) {
  const { t } = useTranslation();

  if (!updateStatus.available) {
    return null;
  }

  if (updateStatus.step === UpdateStep.Restart) {
    const message = t('update.restart');

    return (
      <Tooltip title={message}>
        <DotButton
          type="button"
          aria-label={message}
          onClick={() => window.update.restart()}
        />
      </Tooltip>
    );
  }

  if (STORE_MANAGED.has(updateStatus.installSource)) {
    return null;
  }

  const message = t('update.available', {
    source: updateStatus.installSource,
    version: updateStatus.version,
  });

  return (
    <Tooltip title={message}>
      <DotLink
        href={updateStatus.releaseUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={message}
      />
    </Tooltip>
  );
}
