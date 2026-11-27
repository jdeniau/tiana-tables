import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect, waitFor, within } from 'storybook/test';
import dataRouterDecorator from '../../../../.storybook/decorators/dataRouterDecorator';
import { DEFAULT_LOCALE } from '../../../configuration/locale';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { DatabaseEngine } from '../../../sql/engine';
import { Centered } from '../Style/Region';
import ConnectionPage from './ConnectionPage';

const { ConfigurationContext } = testables;

const LONG_PATH =
  '/home/me/Documents/projects/2026/field-notes/archive/notes.db';

const meta: Meta<typeof ConnectionPage> = {
  component: ConnectionPage,
  decorators: [
    (Story) => (
      <Centered style={{ height: '90vh' }}>
        <Story />
      </Centered>
    ),
    dataRouterDecorator,
    (Story) => (
      <ConnectionContext
        value={{
          currentConnectionSlug: null,
          connectionSlugList: [],
          addConnectionToList: async (connectionName) => {
            action('addConnectionToList')(connectionName);
          },
          closeConnection: (connectionName) => {
            action('closeConnection')(connectionName);
          },
        }}
      >
        <Story />
      </ConnectionContext>
    ),
    (Story) => (
      <ConfigurationContext
        value={{
          configuration: {
            version: 1,
            theme: DEFAULT_THEME.name,
            locale: DEFAULT_LOCALE,
            connections: {
              test: {
                name: 'test',
                engine: DatabaseEngine.PostgreSQL,
                slug: 'test',
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                password: '',
                database: 'shop',
              },
              'production connection': {
                name: 'prod',
                engine: DatabaseEngine.MySQL,
                slug: 'prod',
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: '',
              },
              notes: {
                name: 'notes',
                engine: DatabaseEngine.SQLite,
                slug: 'notes',
                file: LONG_PATH,
              },
              'client-b': {
                name: 'client B',
                engine: DatabaseEngine.MySQL,
                slug: 'client-b',
                host: 'db.client-b.example',
                port: 3306,
                user: 'app',
                password: '',
                group: 'Client B',
              },
              'client-a-prod': {
                name: 'client A prod',
                engine: DatabaseEngine.PostgreSQL,
                slug: 'client-a-prod',
                host: 'db.client-a.example',
                port: 5432,
                user: 'app',
                password: '',
                database: 'shop',
                group: 'Client A',
              },
              'client-a-staging': {
                name: 'client A staging',
                engine: DatabaseEngine.PostgreSQL,
                slug: 'client-a-staging',
                host: 'staging.client-a.example',
                port: 5432,
                user: 'app',
                password: '',
                database: 'shop',
                group: 'Client A',
              },
            },
          },

          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
          },
          setActiveDatabase: (connectionName, value) => {
            action('setActiveDatabase')(connectionName, value);
          },
          setActiveTable: (connectionName, database, tableName) => {
            action('setActiveTable')(connectionName, database, tableName);
          },
          setPanelSize: (panel, size) => {
            action('setPanelSize')(panel, size);
          },
          setDateDisplay: (dateDisplay) => {
            action('setDateDisplay')(dateDisplay);
          },
          editConnection: (name, connection) => {
            action('editConnection')(name, connection);
          },
          deleteConnection: async (slug) => {
            action('deleteConnection')(slug);
          },
          changeLanguage: (language) => {
            action('changeLanguage')(language);
          },
        }}
      >
        <Story />
      </ConfigurationContext>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionPage>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  // a path too long for its row is cut at its start: the file name stays in view, the logo in the row
  play: async ({ canvasElement }) => {
    const address = await waitFor(() =>
      within(canvasElement).getByTitle(LONG_PATH)
    );
    const text = address.querySelector('bdi');
    const row = address.closest('a');
    const logo = row?.querySelector('[role="img"]');

    expect(text?.getBoundingClientRect().left).toBeLessThan(
      address.getBoundingClientRect().left
    );
    expect(text?.getBoundingClientRect().right).toBeLessThanOrEqual(
      address.getBoundingClientRect().right
    );
    expect(logo?.getBoundingClientRect().right).toBeLessThanOrEqual(
      row?.getBoundingClientRect().right ?? 0
    );

    // the mouse reaches the whole path, though antd stretches the link over the row
    const { x, y, width, height } = address.getBoundingClientRect();

    expect(
      document
        .elementFromPoint(x + width / 2, y + height / 2)
        ?.closest('[title]')
    ).toBe(address);
  },
};

// export const Edit: Story = {
//   args: {
//     connection: {
//       name: 'test',
//       host: 'localhost',
//       port: 3307,
//       user: 'test-user',
//       password: '',
//     },
//   },
// };
