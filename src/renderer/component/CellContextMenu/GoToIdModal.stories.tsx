import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import connectionDecorator from '../../../../.storybook/decorators/connectionDecorator';
import { FieldKind } from '../../../sql/resultField';
import GoToIdModal from './GoToIdModal';

const meta: Meta<typeof GoToIdModal> = {
  component: GoToIdModal,
  decorators: [connectionDecorator],
  args: {
    open: true,
    primaryKey: [{ column: 'id', kind: FieldKind.Number }],
    onCancel: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof GoToIdModal>;

export const SingleKey: Story = {
  play: async ({ args }) => {
    const body = within(document.body);

    await userEvent.keyboard('42{Enter}');

    await expect(body.getByRole('spinbutton')).toHaveValue('42');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenCalledWith('`id` = 42');
  },
};

// one field per column of the key, and nothing sent until each holds a value
export const CompositeKey: Story = {
  args: {
    primaryKey: [
      { column: 'article_id', kind: FieldKind.Number },
      { column: 'code', kind: FieldKind.String },
    ],
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const filter = body.getByRole('button', { name: 'Filter' });

    await userEvent.keyboard('1{Enter}');
    await expect(filter).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(body.getByRole('textbox'), '7');
    await userEvent.click(filter);

    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenCalledWith(
      "`article_id` = 1 AND `code` = '7'"
    );
  },
};
