import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { openTablesDecorator } from '../../../.storybook/decorators/openTablesDecorator';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { RegionBody } from './Style/Region';
import TableList from './TableList';

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

/** the route names a table: its row gets the fill and the accent rule */
export const Selected: Story = {
  args: { tableList: TABLES },
  decorators: [
    openTablesDecorator([]),
    (Story) => (
      <MemoryRouter initialEntries={['/connections/test/shop/tables/bar']}>
        <Routes>
          <Route
            path="/connections/:connectionSlug/:databaseName/tables/:tableName"
            element={<Story />}
          />
        </Routes>
      </MemoryRouter>
    ),
  ],
};
