import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import Nav from './Nav';
import styled from 'styled-components';
import { Layout } from 'antd';
import { getSetting } from '../../theme';

const Header = styled(Layout.Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${({ theme }) => getSetting(theme, 'selection')};
`;

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
    (Story) => (
      <Header>
        <Story />
      </Header>
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
