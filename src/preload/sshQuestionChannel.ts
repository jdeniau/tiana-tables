export enum SSH_QUESTION_CHANNEL {
  /** main to renderer: `ssh` asks the user something while a tunnel opens */
  ASK = 'ssh-question:ask',
  /** main to renderer: the question is no longer asked, answered elsewhere or taken back by `ssh` */
  DISMISS = 'ssh-question:dismiss',
  ANSWER = 'ssh-question:answer',
  /** renderer to main: the questions still asked, for a window that (re)loads meanwhile */
  PENDING = 'ssh-question:pending',
}
