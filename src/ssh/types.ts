/** A bastion the connection goes through, reached by the system's `ssh`: what is absent, `~/.ssh/config` decides. */
export type SshTunnel = {
  /** a host name, or a `Host` alias of `~/.ssh/config` */
  host: string;
  port?: number;
  user?: string;
};
