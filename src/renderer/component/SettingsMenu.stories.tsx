import type { Meta, StoryObj } from '@storybook/react';
import { Layout } from 'antd';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import SettingsMenu from './SettingsMenu';
import { Brand, TitleBar, TitleGroup } from './Style/TitleBar';

const meta: Meta<typeof SettingsMenu> = {
  component: SettingsMenu,
  args: {
    version: '1.5.0',
    updateStatus: { available: false },
  },
  parameters: { layout: 'fullscreen' },
  // the title bar the menu hangs off, in the layout that sizes it
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
    // outermost: the brand is a link
    reactRouterDecorator,
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsMenu>;

export const Closed: Story = {};
