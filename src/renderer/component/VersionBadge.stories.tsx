import type { Meta, StoryObj } from '@storybook/react';
import VersionBadge from './VersionBadge';

const meta: Meta<typeof VersionBadge> = {
  component: VersionBadge,
  args: {
    version: '1.2.0',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VersionBadge>;

export const UpToDate: Story = {
  args: {
    updateStatus: { available: false },
  },
};

export const DownloadedPackage: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'linuxPackage',
    },
  },
};

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

/** A store already handles it: no dot at all. */
export const StoreManaged: Story = {
  args: {
    updateStatus: {
      available: true,
      version: '1.3.0',
      installSource: 'flatpak',
    },
  },
};
