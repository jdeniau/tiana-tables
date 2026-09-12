export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{1,}/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '');
}

/**
 * The slug a connection gets, suffixed while another connection holds it.
 *
 * Two names can slugify the same — `docker (dev)` and `Docker-Dev` both give
 * `docker-dev` — and the slug is the key a connection is stored under, so a
 * collision would overwrite the connection already there.
 */
export function uniqueSlug(name: string, takenSlugs: Array<string>): string {
  const base = slugify(name);
  const taken = new Set(takenSlugs);

  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }

  return `${base}-${suffix}`;
}
