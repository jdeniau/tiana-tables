import type { JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import {
  commentForeground,
  foreground,
  selection,
  size,
  space,
} from '../../theme';
import {
  FramedRegion,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../Style/Region';

/** a saved connection: the same 24px row as the tables of the sidebar */
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md};
  height: ${size.control};
  padding: 0 ${space.md};

  &:hover {
    background: color-mix(in srgb, ${selection} 40%, transparent);
  }
`;

const Open = styled(Link)`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md};
  min-width: 0;
  color: ${foreground};
  text-decoration: none;

  &:hover {
    color: ${foreground};
  }
`;

const Host = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: ${commentForeground};
`;

/** shown on the row it belongs to, and to the keyboard */
const Edit = styled(Link)`
  flex: none;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${commentForeground};
  text-decoration: none;
  visibility: hidden;

  ${Row}:hover &,
  &:focus-visible {
    visibility: visible;
  }

  &:hover {
    color: ${foreground};
  }
`;

const Add = styled(Link)`
  color: inherit;
  text-decoration: none;

  &:hover {
    color: ${foreground};
  }
`;

/** The saved connections, one row each; the form has its own page. */
function ConnectionPage(): JSX.Element {
  const { t } = useTranslation();
  const connections: EncryptedConnectionObject[] = Object.values(
    useConfiguration().configuration.connections
  );

  if (connections.length === 0) {
    return <Navigate replace to="/connect/create" />;
  }

  return (
    <FramedRegion>
      <RegionHeader>
        <RegionGroup>
          <RegionName>{t('connection.list.title')}</RegionName>
          <RegionMeta>
            {t('connection.list.count', { count: connections.length })}
          </RegionMeta>
        </RegionGroup>
      </RegionHeader>

      <RegionBody>
        {connections.map((connection) => (
          <Row key={connection.slug}>
            <Open to={`/connections/${connection.slug}`}>
              <span>{connection.name}</span>
              <Host>
                {connection.user}@{connection.host}:{connection.port}
              </Host>
            </Open>
            <Edit to={`/connect/edit/${connection.slug}`}>{t('edit')}</Edit>
          </Row>
        ))}
      </RegionBody>

      <RegionFoot>
        <Add to="/connect/create">+ {t('connect.new')}</Add>
      </RegionFoot>
    </FramedRegion>
  );
}

export default ConnectionPage;
