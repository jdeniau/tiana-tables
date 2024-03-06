export function log(domain: string, message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log(`${domain} ${message}`, ...args);
}
