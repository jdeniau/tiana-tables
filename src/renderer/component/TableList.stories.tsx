import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ShowTableStatus } from '../../sql/types';
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

function createTableStatusRow(
  // weirdly `Omit` does not work here
  params: Pick<ShowTableStatus, 'Name' | 'Rows' | 'Data_length' | 'Comment'>
): ShowTableStatus {
  return {
    constructor: { name: 'RowDataPacket' },
    ...params,
  };
}

const TABLES = ['foo', 'bar', 'baz'].map((Name) =>
  createTableStatusRow({ Name, Rows: 150, Data_length: 1234, Comment: '' })
);

export const Primary: Story = {
  decorators: [reactRouterDecorator],
  args: { tableStatusList: TABLES },
};

/** the route names a table: its row gets the fill and the accent rule */
export const Selected: Story = {
  args: { tableStatusList: TABLES },
  decorators: [
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
