import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { Types } from 'mysql';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import Cell from './Cell';

const meta: Meta<typeof Cell> = {
  component: Cell,
  decorators: [
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: 'test',
          connectionNameList: ['test'],
          connectTo: async (connection) => {
            action('connectTo')(connection);
          },
        }}
      >
        <DatabaseContext.Provider
          value={{
            database: 'mocked-db',
            setDatabase: () => {},
            // @ts-expect-error -- we don't need to implement the whole context
            executeQuery: async (query) => {
              action('executeQuery')(query);

              return Promise.resolve([
                [{ Name: 'foo' }, { Name: 'bar' }, { Name: 'baz' }],
              ]);
            },
          }}
        >
          <Story />
        </DatabaseContext.Provider>
      </ConnectionContext.Provider>
    ),
  ],
  parameters: {
    controls: { exclude: ['type'] },
  },
};

export default meta;
type Story = StoryObj<typeof Cell>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const WithNULLValue: Story = {
  args: {
    type: Types.VARCHAR,
    value: null,
  },
  argTypes: {
    value: { control: { type: null } },
  },
};

export const WithStringType: Story = {
  args: {
    type: Types.VARCHAR,
    value: 'VARCHAR value',
  },
};

export const WithNumberType: Story = {
  args: {
    type: Types.FLOAT,
    value: 123.45,
  },
};

export const WithDateType: Story = {
  args: {
    type: Types.DATETIME,
    value: new Date('Jan 20 2020'),
  },
};

export const WithBlobType: Story = {
  args: {
    type: Types.BLOB,
    value: 'BLOB value',
  },
};

export const WithJSONType: Story = {
  args: {
    type: Types.JSON,
    value: JSON.stringify({ backgroundColor: 'red' }),
  },
};

export const WithENUMType: Story = {
  args: {
    type: Types.ENUM,
    value: 'ENUM value',
  },
};

// stories.add('with NULL value', () => (
//     <Cell type={Types.VARCHAR} value={null} />
//   ));

//   stories.add('with string type', () => (
//     <Cell type={Types.VARCHAR} value={text('VARCHAR', 'VARCHAR value')} />
//   ));

//   stories.add('with number type', () => (
//     <Cell type={Types.FLOAT} value={number('FLOAT', 123.45)} />
//   ));

//   stories.add('with date type', () => {
//     const defaultDate = new Date('Jan 20 2020');
//     const dateString = date('DATETIME', defaultDate);

//     return <Cell type={Types.DATETIME} value={new Date(dateString)} />;
//   });

//   stories.add('with blob type', () => (
//     <Cell type={Types.BLOB} value={text('BLOB', 'BLOB value')} />
//   ));

//   stories.add('with JSON type', () => {
//     const label = 'Styles';
//     const defaultValue = {
//       backgroundColor: 'red',
//     };

//     return (
//       <Cell
//         type={Types.JSON}
//         value={JSON.stringify(object(label, defaultValue))}
//       />
//     );
//   });

//   stories.add('with ENUM/SET type', () => (
//     <Cell type={Types.ENUM} value={text('ENUM', 'ENUM value')} />
//   ));
