/** The `code`s the SSH tunnel gives its own failures: `ssh` only tells them in words. */
export enum SshErrorCode {
  Missing = 'SSH_MISSING',
  AuthFailed = 'SSH_AUTH_FAILED',
  HostKeyChanged = 'SSH_HOST_KEY_CHANGED',
  HostKeyRejected = 'SSH_HOST_KEY_REJECTED',
  ForwardFailed = 'SSH_FORWARD_FAILED',
}
