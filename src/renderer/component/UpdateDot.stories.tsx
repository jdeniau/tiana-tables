import type { Meta, StoryObj } from '@storybook/react';
import { Layout } from 'antd';
import { useTheme } from 'styled-components';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../configuration/connectionColor';
import type { UpdateStatus } from '../../main-process/updateCheck';
import { resolveConnectionTint } from '../theme/connectionTint';
import { Brand, BrandGroup, TitleBar, TitleGroup } from './Style/TitleBar';
import UpdateDot from './UpdateDot';

/** the mark where it lives: on the brand, in the bar that sizes it */
function Demo({
  updateStatus,
  color,
}: {
  updateStatus: UpdateStatus;
  color?: ConnectionColor;
}) {
  const theme = useTheme();

  return (
    <Layout>
      <TitleBar $tint={resolveConnectionTint(color, theme)}>
        <TitleGroup>
          <BrandGroup>
            <Brand to="/">Tiana Tables</Brand>
            <UpdateDot updateStatus={updateStatus} />
          </BrandGroup>
        </TitleGroup>
      </TitleBar>
    </Layout>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'linuxPackage',
    },
  },
  parameters: { layout: 'fullscreen' },
  // the brand is a link, so the bar needs a router
  decorators: [reactRouterDecorator],
};

export default meta;
type Story = StoryObj<typeof Demo>;

/** Nothing to install: the brand carries no mark. */
export const UpToDate: Story = {
  args: {
    updateStatus: { available: false },
  },
};

export const DownloadedPackage: Story = {};

export const AppImage: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'appimage',
    },
  },
};

/** Windows/macOS: Squirrel should have applied it, so its presence is a symptom. */
export const AutomaticUpdateFailed: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'selfUpdating',
    },
  },
};

/** Unknown packaging: the message must stay true whatever the real situation. */
export const UnknownSource: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'unknown',
    },
  },
};

/** A store already handles it: no mark at all. */
export const StoreManaged: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'flatpak',
    },
  },
};

/** base08 [errors]: base0A holds its own on the darkest tint a connection offers. */
export const TintedFrame: Story = {
  args: {
    color: { kind: ConnectionColorKind.Palette, slot: 'base08' },
  },
};

/** A pale tint is the hard case: base0A is a light slot, and does not follow it. */
export const PaleTintedFrame: Story = {
  args: {
    color: { kind: ConnectionColorKind.Custom, hex: '#f6c9a8' },
  },
};
