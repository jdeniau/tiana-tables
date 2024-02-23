import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ConnectionContext } from '../../Contexts';
import Nav from './Nav';

const meta: Meta<typeof Nav> = {
  component: Nav,
  decorators: [
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: 'production',
          connectionNameList: ['test', 'production', 'staging', 'development'],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setCurrentConnectionName: (connection) => {
            action('setCurrentConnectionName')(connection);
          },
          connectTo: () => {},
        }}
      >
        <Story />
      </ConnectionContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Nav>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  render: () => <Nav />,
};
