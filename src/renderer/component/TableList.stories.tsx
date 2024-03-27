import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ShowTableStatus } from '../../sql/types';
import TableList from './TableList';

const meta: Meta<typeof TableList> = {
  component: TableList,
  decorators: [reactRouterDecorator],
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

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    tableStatusList: [
      createTableStatusRow({
        Name: 'foo',
        Rows: 150,
        Data_length: 1234,
        Comment: '',
      }),
      createTableStatusRow({
        Name: 'bar',
        Rows: 150,
        Data_length: 1234,
        Comment: '',
      }),
      createTableStatusRow({
        Name: 'baz',
        Rows: 150,
        Data_length: 1234,
        Comment: '',
      }),
    ],
  },
};
