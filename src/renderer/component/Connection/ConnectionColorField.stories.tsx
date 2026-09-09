import { useState } from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../../configuration/connectionColor';
import ConnectionColorField from './ConnectionColorField';

const meta: Meta<typeof ConnectionColorField> = {
  component: ConnectionColorField,
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionColorField>;

/** the row as a `Form.Item` drives it: the choice is held outside */
export const Interactive: Story = {
  render: function Render() {
    const [value, setValue] = useState<ConnectionColor | undefined>(undefined);

    return (
      <ConnectionColorField
        value={value}
        onChange={(next) => {
          action('onChange')(next);
          setValue(next);
        }}
      />
    );
  },
};

export const NoColour: Story = { args: { value: undefined } };

export const PaletteColour: Story = {
  args: {
    value: { kind: ConnectionColorKind.Palette, slot: 'base0B' },
  },
};

export const CustomColour: Story = {
  args: { value: { kind: ConnectionColorKind.Custom, hex: '#ff8800' } },
};
