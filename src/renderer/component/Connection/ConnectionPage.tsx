import type { JSX } from 'react';
import { Menu, MenuProps } from 'antd';
import { Link, Navigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import { foreground, size, space } from '../../theme';
import ButtonLink from '../ButtonLink';
import {
  FramedRegion,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../Style/Region';

/**
 * The label fills the row, as the tables of the sidebar do: the name, and
 * where the connection goes, on one 24px line that is a link.
 */
const Open = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md};
  min-width: 0;
  padding: 0 ${space.md};
  line-height: ${size.control};
  color: ${foreground};

  &:hover {
    color: ${foreground};
  }
`;

/** shown on the row it belongs to — the Menu's `li` — and to the keyboard */
const Edit = styled(ButtonLink)`
  visibility: hidden;

  li:hover &,
  &:focus-visible {
    visibility: visible;
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

  // the same Menu as the sidebar's tables, so the rows are the same rows
  const items: MenuProps['items'] = connections.map((connection) => ({
    key: connection.slug,
    label: (
      <Open to={`/connections/${connection.slug}`}>
        <span>{connection.name}</span>
        <RegionMeta>
          {connection.user}@{connection.host}:{connection.port}
        </RegionMeta>
      </Open>
    ),
    extra: (
      <Edit type="text" size="small" to={`/connect/edit/${connection.slug}`}>
        {t('edit')}
      </Edit>
    ),
  }));

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
        <Menu items={items} selectable={false} />
      </RegionBody>

      <RegionFoot>
        <ButtonLink type="text" size="small" to="/connect/create">
          + {t('connect.new')}
        </ButtonLink>
      </RegionFoot>
    </FramedRegion>
  );
}

export default ConnectionPage;
