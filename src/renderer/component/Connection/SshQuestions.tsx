import { type ReactElement, useEffect, useState } from 'react';
import type { SshQuestion } from '../../../ssh/askpass/question';
import SshQuestionModal from './SshQuestionModal';

/** The questions `ssh` asks while tunnels open, one at a time, in the order they came. */
export default function SshQuestions(): ReactElement | null {
  const [questions, setQuestions] = useState<Array<SshQuestion>>([]);
  const current = questions[0];

  useEffect(() => {
    // a question both asked and pending is queued twice, and leaves by its id
    const add = (incoming: Array<SshQuestion>): void =>
      setQuestions((asked) => [...asked, ...incoming]);
    const remove = (questionId: string): void =>
      setQuestions((asked) => asked.filter(({ id }) => id !== questionId));

    const stopAsking = window.sshQuestion.onAsk((question) => add([question]));
    // answered in another window, or taken back by `ssh`
    const stopDismissing = window.sshQuestion.onDismiss(remove);
    // asked before this window (re)loaded: `ssh` still waits for them
    void window.sshQuestion.pending().then(add);

    return () => {
      stopAsking();
      stopDismissing();
    };
  }, []);

  if (!current) {
    return null;
  }

  return (
    <SshQuestionModal
      // a new question starts with an empty field
      key={current.id}
      question={current}
      onAnswer={(answer) => {
        setQuestions((asked) => asked.filter(({ id }) => id !== current.id));
        void window.sshQuestion.answer({ questionId: current.id, answer });
      }}
    />
  );
}
