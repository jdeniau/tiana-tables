import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import connectionDecorator, {
  STORY_CONNECTION,
} from '../../../.storybook/decorators/connectionDecorator';
import { openTablesDecorator } from '../../../.storybook/decorators/openTablesDecorator';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionColorKind } from '../../configuration/connectionColor';
import {
  testables,
  useConfiguration,
} from '../../contexts/ConfigurationContext';
import { RegionBody } from './Style/Region';
import TableList from './TableList';

const { ConfigurationContext } = testables;

const meta: Meta<typeof TableList> = {
  component: TableList,
  // the sidebar the list lives in
  decorators: [
    (Story) => (
      <RegionBody style={{ width: 212, height: 300 }}>
        <Story />
      </RegionBody>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TableList>;

const TABLES = ['foo', 'bar', 'baz'];

export const Primary: Story = {
  decorators: [openTablesDecorator([]), reactRouterDecorator],
  args: { tableList: TABLES },
};

/** the route names `bar` */
function OnTableBar(Story: () => React.ReactElement) {
  return (
    <MemoryRouter initialEntries={['/connections/test/shop/tables/bar']}>
      <Routes>
        <Route
          path="/connections/:connectionSlug/:databaseName/tables/:tableName"
          element={<Story />}
        />
      </Routes>
    </MemoryRouter>
  );
}

/** the route names a table: its row gets the fill and the accent border */
export const Selected: Story = {
  args: { tableList: TABLES },
  decorators: [openTablesDecorator([]), OnTableBar],
};

/** the story connection, marked with base08 */
function WithColouredConnection(Story: () => React.ReactElement) {
  const value = useConfiguration();

  return (
    <ConfigurationContext.Provider
      value={{
        ...value,
        configuration: {
          ...value.configuration,
          connections: {
            [STORY_CONNECTION.slug]: {
              ...STORY_CONNECTION,
              color: { kind: ConnectionColorKind.Palette, slot: 'base08' },
            },
          },
        },
      }}
    >
      <Story />
    </ConfigurationContext.Provider>
  );
}

/** on a connection with a colour, the border of the selected row takes it */
export const SelectedOnColouredConnection: Story = {
  args: { tableList: TABLES },
  decorators: [
    openTablesDecorator([]),
    OnTableBar,
    connectionDecorator,
    WithColouredConnection,
  ],
};
