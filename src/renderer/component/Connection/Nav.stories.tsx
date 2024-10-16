import type { Meta, StoryObj } from '@storybook/react';
import { Layout } from 'antd';
import { styled } from 'styled-components';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { selection } from '../../theme';
import Nav from './Nav';

const Header = styled(Layout.Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${selection};
`;

const meta: Meta<typeof Nav> = {
  component: Nav,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionSlug: 'production',
          connectionSlugList: ['test', 'production', 'staging', 'development'],
          addConnectionToList: () => {},
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
