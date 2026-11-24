import type { Meta, StoryObj } from '@storybook/react-vite';
import { Layout } from 'antd';
import { expect, fn, userEvent } from 'storybook/test';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { Brand, TitleBar, TitleGroup } from '../Style/TitleBar';
import Nav from './Nav';

const closeConnection = fn();

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
      <ConnectionContext
        value={{
          currentConnectionSlug: 'production',
          connectionSlugList: ['test', 'production', 'staging', 'development'],
          addConnectionToList: () => {},
          closeConnection,
        }}
      >
        <Story />
      </ConnectionContext>
    ),
    reactRouterDecorator,
  ],
};

export default meta;
type Story = StoryObj<typeof Nav>;

export const Primary: Story = {
  render: () => <Nav />,
};

export const CloseConnection: Story = {
  render: () => <Nav />,
  play: async ({ canvas }) => {
    closeConnection.mockClear();
    const crosses = canvas.getAllByRole('button', {
      name: 'Close connection',
    });

    await userEvent.click(crosses[2]);
    await expect(closeConnection).toHaveBeenLastCalledWith('staging');

    await userEvent.pointer({
      keys: '[MouseMiddle]',
      target: canvas.getByText('development'),
    });
    await expect(closeConnection).toHaveBeenLastCalledWith('development');
    await expect(closeConnection).toHaveBeenCalledTimes(2);
  },
};
