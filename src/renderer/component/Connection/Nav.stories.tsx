import type { Meta, StoryObj } from '@storybook/react';
import { Layout } from 'antd';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { Brand, TitleBar, TitleGroup } from '../Style/TitleBar';
import Nav from './Nav';

const meta: Meta<typeof Nav> = {
  component: Nav,
  parameters: { layout: 'fullscreen' },
  // the first decorator is the innermost: the title bar holds the nav, the
  // router wraps everything, since the brand is a link too
  decorators: [
    (Story) => (
      <Layout>
        <TitleBar>
          <TitleGroup>
            <Brand to="/">Tiana Tables</Brand>
            <Story />
          </TitleGroup>
        </TitleBar>
      </Layout>
    ),
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
    reactRouterDecorator,
  ],
};

export default meta;
type Story = StoryObj<typeof Nav>;

export const Primary: Story = {
  render: () => <Nav />,
};
