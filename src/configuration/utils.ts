export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{1,}/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '');
}
