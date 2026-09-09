import { SettingOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react';
import { Button, Layout } from 'antd';
import { useTheme } from 'styled-components';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../../configuration/connectionColor';
import { resolveConnectionTint } from '../../theme/connectionTint';
import { TabStrip, TabStripItem } from './TabStrip';
import { Brand, TitleBar, TitleGroup } from './TitleBar';

const CONNECTIONS = ['local (dev)', 'staging', 'production'];

/**
 * The frame as a connection colour paints it: the fill is the colour, and
 * everything in the bar — brand, connections, settings, hairlines — turns
 * light or dark by contrast with it.
 */
function Demo({ color }: { color?: ConnectionColor }) {
  const theme = useTheme();

  return (
    <Layout>
      <TitleBar $tint={resolveConnectionTint(color, theme)}>
        <TitleGroup>
          <Brand to="/">Tiana Tables</Brand>
          <Button type="text" size="small" icon={<SettingOutlined />} />
          <TabStrip $caps $framed>
            {CONNECTIONS.map((name) => (
              <TabStripItem key={name} active={name === 'production'}>
                {name}
              </TabStripItem>
            ))}
          </TabStrip>
        </TitleGroup>

        <TitleGroup>
          <TabStrip $caps>
            <TabStripItem active={false}>SQL</TabStripItem>
          </TabStrip>
        </TitleGroup>
      </TitleBar>
    </Layout>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  parameters: { layout: 'fullscreen' },
  // the brand is a link, so the bar needs a router
  decorators: [reactRouterDecorator],
};

export default meta;
type Story = StoryObj<typeof Demo>;

/** no colour on the connection: the bar is the palette's background */
export const Plain: Story = {};

/** base08 [errors and deletions] — the slot a production connection asks for */
export const PaletteColour: Story = {
  args: {
    color: { kind: ConnectionColorKind.Palette, slot: 'base08' },
  },
};

/** a colour of one's own, dark: the text goes to base07 [emphasis] */
export const DarkCustomColour: Story = {
  args: { color: { kind: ConnectionColorKind.Custom, hex: '#4b0d1f' } },
};

/** a colour of one's own, pale: the text goes to base00 [background] */
export const PaleCustomColour: Story = {
  args: { color: { kind: ConnectionColorKind.Custom, hex: '#f6c9a8' } },
};
