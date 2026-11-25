import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import ClearQueryHistory from './ClearQueryHistory';

const clear = fn(() => Promise.resolve());

/** Puts the mock in the bridge for one story, and the bridge back after it. */
function answerClear(): () => void {
  const bridge = window.queryHistory;

  clear.mockClear();
  window.queryHistory = { ...bridge, clear };

  return () => {
    window.queryHistory = bridge;
  };
}

const meta: Meta<typeof ClearQueryHistory> = {
  component: ClearQueryHistory,
  beforeEach: answerClear,
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ClearQueryHistory>;

export const Default: Story = {};

/** Confirmed: the history goes, and the button says so. */
export const Cleared: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear query history…' })
    );
    const dialog = await body.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Clear' })
    );

    expect(clear).toHaveBeenCalledOnce();
    const cleared = await canvas.findByRole('button', {
      name: 'Query history cleared',
    });
    expect(cleared).toBeDisabled();
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

/** Escape leaves the history as it was. */
export const Cancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear query history…' })
    );
    await body.findByRole('dialog');
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    expect(clear).not.toHaveBeenCalled();
    expect(
      canvas.getByRole('button', { name: 'Clear query history…' })
    ).toBeEnabled();
  },
};
