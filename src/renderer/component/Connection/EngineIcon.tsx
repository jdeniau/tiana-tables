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

/** a logo is drawn edge to edge, so it reads at the size of a control's icon, not of the small text beside it */
const Logo = styled.svg`
  display: block;
  width: ${space.lg};
  height: ${space.lg};
  fill: currentColor;
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
    <Logo role="img" aria-label={name} viewBox="0 0 24 24">
      <title>{name}</title>
      <path d={ICON_BY_ENGINE[engine].path} />
    </Logo>
  );
}
