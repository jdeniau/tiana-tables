import type { SshQuestion, SshQuestionAnswer } from '../ssh/askpass/question';
import { Unsubscribe, bindChannel, subscribe } from './bindChannel';
import { SSH_QUESTION_CHANNEL } from './sshQuestionChannel';

interface SshQuestionBridge {
  onAsk(callback: (question: SshQuestion) => void): Unsubscribe;
  onDismiss(callback: (questionId: string) => void): Unsubscribe;
  answer(payload: SshQuestionAnswer): Promise<void>;
  pending(): Promise<Array<SshQuestion>>;
}

export const sshQuestion: SshQuestionBridge = {
  onAsk: (callback) => subscribe(SSH_QUESTION_CHANNEL.ASK, callback),
  onDismiss: (callback) => subscribe(SSH_QUESTION_CHANNEL.DISMISS, callback),
  answer: bindChannel(SSH_QUESTION_CHANNEL.ANSWER),
  pending: bindChannel(SSH_QUESTION_CHANNEL.PENDING),
};
