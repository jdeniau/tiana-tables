import { type ReactElement, useId, useState } from 'react';
import { Input, Modal, Typography } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import {
  type SshAnswer,
  type SshQuestion,
  SshQuestionKind,
} from '../../../ssh/askpass/question';

/** `ssh`'s words as it wrote them, line breaks and fingerprint included */
const Prompt = styled(Typography.Paragraph)`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

interface SshQuestionModalProps {
  question: SshQuestion;
  onAnswer: (answer: SshAnswer) => void;
}

/** What `ssh` asks while it opens a tunnel; cancelling answers `null`, which `ssh` takes as a refusal. */
export default function SshQuestionModal({
  question,
  onAnswer,
}: SshQuestionModalProps): ReactElement {
  const { t } = useTranslation();
  const [secret, setSecret] = useState('');
  const promptId = useId();
  const { kind, connection, prompt } = question;

  const answer = (): void => {
    switch (kind) {
      case SshQuestionKind.Secret:
        onAnswer(secret);
        break;
      case SshQuestionKind.HostKey:
      case SshQuestionKind.Confirm:
        onAnswer('yes');
        break;
      case SshQuestionKind.Notice:
        onAnswer(null);
        break;
    }
  };

  return (
    <Modal
      open
      title={t('connection.ssh.question.title', { kind, connection })}
      okText={t('connection.ssh.question.answer', { kind })}
      cancelText={t('connection.ssh.question.cancel', { kind })}
      // a notice has nothing to answer: `ssh` takes it back itself
      okButtonProps={{ hidden: kind === SshQuestionKind.Notice }}
      onOk={answer}
      onCancel={() => onAnswer(null)}
      maskClosable={false}
    >
      <Prompt id={promptId}>{prompt}</Prompt>

      {kind === SshQuestionKind.HostKey && (
        <Typography.Paragraph type="secondary">
          {t('connection.ssh.question.hostKeyHelp')}
        </Typography.Paragraph>
      )}

      {kind === SshQuestionKind.Secret && (
        <Input.Password
          aria-labelledby={promptId}
          autoFocus
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          onPressEnter={answer}
        />
      )}
    </Modal>
  );
}
