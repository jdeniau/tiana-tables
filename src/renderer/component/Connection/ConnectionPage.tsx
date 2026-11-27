import type { JSX } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Menu, MenuProps, Spin } from 'antd';
import { matchPath, useNavigation } from 'react-router';
import { Link, Navigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import { opensFile } from '../../../sql/engine';
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
import EngineIcon from './EngineIcon';
import { groupConnections } from './connectionGroups';

type MenuItem = Required<MenuProps>['items'][number];

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

/**
 * Cut at its start when the row is too narrow, since a file's name and a server's database come last.
 * Positioned for its `title`, under the `a::before` antd stretches over the row.
 */
const Address = styled(RegionMeta)`
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
`;

/** Where the connection leads: its file, or the account, server and database it opens. */
function addressOf(connection: EncryptedConnectionObject): string {
  if (opensFile(connection)) {
    return connection.file;
  }

  const { user, host, port, database } = connection;

  return `${user}@${host}:${port}${database ? `/${database}` : ''}`;
}

function ConnectionAddress({
  connection,
}: {
  connection: EncryptedConnectionObject;
}) {
  const address = addressOf(connection);

  return (
    <Address title={address}>
      {/* left to right inside the right-to-left box, or a path's leading `/` would end it */}
      <bdi>{address}</bdi>
    </Address>
  );
}

/**
 * The connection the router is on its way to, if any.
 *
 * Read-only: the rows stay plain `Link`s, and the state clears itself when the
 * navigation ends — whether it lands, fails on a timeout, or is replaced by a
 * click on another row.
 */
function usePendingConnectionSlug(): string | undefined {
  const navigation = useNavigation();

  if (navigation.state === 'idle') {
    return undefined;
  }

  return matchPath(
    '/connections/:connectionSlug/*',
    navigation.location.pathname
  )?.params.connectionSlug;
}

/** The saved connections, one row each; the form has its own page. */
function ConnectionPage(): JSX.Element {
  const { t } = useTranslation();
  const pendingConnectionSlug = usePendingConnectionSlug();
  const connections: Array<EncryptedConnectionObject> = Object.values(
    useConfiguration().configuration.connections
  );

  if (connections.length === 0) {
    return <Navigate replace to="/connect/create" />;
  }

  // the same Menu as the sidebar's tables, so the rows are the same rows
  const connectionItem = (connection: EncryptedConnectionObject): MenuItem => ({
    key: connection.slug,
    label: (
      <Open
        to={`/connections/${connection.slug}`}
        aria-busy={connection.slug === pendingConnectionSlug}
      >
        <span>{connection.name}</span>
        {connection.slug === pendingConnectionSlug ? (
          <RegionGroup>
            <Spin size="small" />
            <RegionMeta>{t('connection.connecting')}</RegionMeta>
          </RegionGroup>
        ) : (
          <RegionGroup>
            <ConnectionAddress connection={connection} />
            <RegionMeta>
              <EngineIcon engine={connection.engine} />
            </RegionMeta>
          </RegionGroup>
        )}
      </Open>
    ),
    extra: (
      <Edit
        type="text"
        size="small"
        icon={<EditOutlined />}
        aria-label={t('edit')}
        title={t('edit')}
        to={`/connect/edit/${connection.slug}`}
      />
    ),
  });

  const { ungrouped, groups } = groupConnections(connections);
  const items: Array<MenuItem> = [
    ...ungrouped.map(connectionItem),
    ...groups.map(({ name, connections: members }): MenuItem => ({
      type: 'group',
      key: `group:${name}`,
      label: name,
      children: members.map(connectionItem),
    })),
  ];

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
