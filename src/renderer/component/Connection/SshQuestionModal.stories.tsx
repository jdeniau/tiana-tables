import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SshQuestionKind } from '../../../ssh/askpass/question';
import SshQuestionModal from './SshQuestionModal';

const meta: Meta<typeof SshQuestionModal> = {
  component: SshQuestionModal,
  args: { onAnswer: fn() },
};

export default meta;
type Story = StoryObj<typeof SshQuestionModal>;

// ssh's words, measured on OpenSSH 10.2
export const HostKey: Story = {
  args: {
    question: {
      id: 'q1',
      connection: 'mariadb via SSH (dev)',
      prompt:
        "The authenticity of host '[127.0.0.1]:12222 ([127.0.0.1]:12222)' can't be established.\nED25519 key fingerprint is: SHA256:ueXRH9X6tUARSk/X3pC5fp2OWGuFK1+5xGUK4mEtqyQ\nThis key is not known by any other names.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? ",
      kind: SshQuestionKind.HostKey,
    },
  },
  play: async ({ args }) => {
    const body = within(document.body);

    await userEvent.click(await body.findByRole('button', { name: 'Trust' }));

    await expect(args.onAnswer).toHaveBeenCalledWith('yes');
  },
};

export const Passphrase: Story = {
  args: {
    question: {
      id: 'q2',
      connection: 'postgres via SSH (dev)',
      prompt: "Enter passphrase for key '/home/me/.ssh/id_ed25519': ",
      kind: SshQuestionKind.Secret,
    },
  },
  play: async ({ args }) => {
    const body = within(document.body);

    await userEvent.type(
      await body.findByLabelText(/Enter passphrase for key/),
      'my passphrase{Enter}'
    );

    await expect(args.onAnswer).toHaveBeenCalledWith('my passphrase');
  },
};

export const Confirm: Story = {
  args: {
    question: {
      id: 'q3',
      connection: 'mariadb via SSH (dev)',
      prompt:
        'Allow use of key /home/me/.ssh/id_ed25519?\nKey fingerprint SHA256:ueXRH9X6tUARSk/X3pC5fp2OWGuFK1+5xGUK4mEtqyQ.',
      kind: SshQuestionKind.Confirm,
    },
  },
};

export const Notice: Story = {
  args: {
    question: {
      id: 'q4',
      connection: 'mariadb via SSH (dev)',
      prompt: 'Confirm user presence for key ED25519-SK SHA256:…',
      kind: SshQuestionKind.Notice,
    },
  },
};
