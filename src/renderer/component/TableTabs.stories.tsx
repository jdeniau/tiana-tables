import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { openTablesDecorator } from '../../../.storybook/decorators/openTablesDecorator';
import TableTabs from './TableTabs';

/** the route decides the active tab, as it does in the app */
function routeDecorator(tableName: string) {
  return function WithRoute(Story: () => ReactElement) {
    return (
      <MemoryRouter
        initialEntries={[`/connections/test/shop/tables/${tableName}`]}
      >
        <Routes>
          <Route
            path="/connections/:connectionSlug/:databaseName/tables/:tableName"
            element={
              <div style={{ width: 560 }}>
                <Story />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };
}

const meta: Meta<typeof TableTabs> = {
  component: TableTabs,
};

export default meta;
type Story = StoryObj<typeof TableTabs>;

/** three memorised tables, the second one open */
export const Primary: Story = {
  decorators: [
    openTablesDecorator(['customers', 'orders', 'order_items']),
    routeDecorator('orders'),
  ],
};

/** the last tab is the temporary one: it is in italics, and it is the active one */
export const Preview: Story = {
  decorators: [
    openTablesDecorator(['customers', 'orders']),
    routeDecorator('shipments'),
  ],
};

/** past the 44px floor of every item, the run scrolls rather than collapses */
export const Overflowing: Story = {
  decorators: [
    openTablesDecorator([
      'customers',
      'orders',
      'order_items',
      'shipments',
      'invoices',
      'payment_methods',
      'product_categories',
    ]),
    routeDecorator('shipments'),
  ],
};
