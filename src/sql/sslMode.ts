/**
 * Whether a connection is encrypted, and whether the server's certificate is checked.
 *
 * libpq's `sslmode` vocabulary, so the `sslmode=require` of a connection string
 * reads as one of these as it is — `verify-full` spelt `verifyFull`, since a
 * key of an ICU `select` cannot hold a hyphen. `prefer` and `allow` are left
 * out: neither driver falls back to a plain connection when TLS fails.
 */
export enum SslMode {
  /** in the clear, as every connection was before the field existed */
  Disable = 'disable',
  /** encrypted, the certificate taken as it comes: libpq's `require` */
  Require = 'require',
  /** encrypted, to a certificate the system trusts and that names the host */
  VerifyFull = 'verifyFull',
}
