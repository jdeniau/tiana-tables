import type { ReactElement } from 'react';
import { type SimpleIcon, siMysql, siPostgresql } from 'simple-icons';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { DatabaseEngine } from '../../../sql/engine';
import { space } from '../../theme';

/** The logo of each engine, the dolphin standing for MariaDB too, as the engine does. */
const ICON_BY_ENGINE: Readonly<Record<DatabaseEngine, SimpleIcon>> = {
  [DatabaseEngine.MySQL]: siMysql,
  [DatabaseEngine.PostgreSQL]: siPostgresql,
};

/**
 * A logo is drawn edge to edge, so it reads at the size of a control's icon, not of the small text beside it.
 * The name is on the box because an SVG answers the mouse on its strokes only, and the box is positioned
 * because antd stretches a Menu item's link over the row with an `a::before`, which would cover it.
 */
const Logo = styled.span`
  position: relative;
  display: block;
  width: ${space.lg};
  height: ${space.lg};

  svg {
    display: block;
    width: 100%;
    height: 100%;
    fill: currentColor;
  }
`;

/** The engine as a monochrome logo in the text colour, named for screen readers and on hover. */
export default function EngineIcon({
  engine,
}: {
  engine: DatabaseEngine;
}): ReactElement {
  const { t } = useTranslation();
  const name = t('connection.engine.name', { engine });

  return (
    <Logo role="img" aria-label={name} title={name}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d={ICON_BY_ENGINE[engine].path} />
      </svg>
    </Logo>
  );
}
