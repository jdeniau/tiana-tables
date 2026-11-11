import '@fontsource/noto-sans-mono/400.css';
import '@fontsource/noto-sans-mono/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/syne-mono/400.css';
import './style.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type {
  PrerenderArguments,
  PrerenderResult,
} from 'vite-prerender-plugin';
import { Site } from './Site';
import type { Release } from './release';
import { SiteLocale, localeOfPath, localePath } from './siteLocale';
import { createText } from './text';

declare const __RELEASE__: Release;

const ORIGIN = 'https://tiana-tables.deniau.me';

/** Called at build by vite-prerender-plugin for `/`, then for each link it returns. */
export async function prerender({
  url,
}: PrerenderArguments): Promise<PrerenderResult> {
  const { renderToString } = await import('react-dom/server.edge');
  const locale = localeOfPath(url);
  const { site } = createText(locale);

  return {
    html: renderToString(<Site locale={locale} release={__RELEASE__} />),
    links: new Set(Object.values(SiteLocale).map(localePath)),
    head: {
      lang: locale,
      title: site('meta.title'),
      elements: new Set([
        meta('name', 'description', site('meta.description')),
        meta('property', 'og:title', site('meta.title')),
        meta('property', 'og:description', site('meta.description')),
        link({ rel: 'canonical', href: `${ORIGIN}${localePath(locale)}` }),
        ...Object.values(SiteLocale).map((other) =>
          link({
            rel: 'alternate',
            hreflang: other,
            href: `${ORIGIN}${localePath(other)}`,
          })
        ),
        // the page for a language the site is not written in
        link({
          rel: 'alternate',
          hreflang: 'x-default',
          href: `${ORIGIN}${localePath(SiteLocale.En)}`,
        }),
      ]),
    },
  };
}

const meta = (key: string, name: string, content: string) => ({
  type: 'meta',
  props: { [key]: name, content },
});
const link = (props: Record<string, string>) => ({ type: 'link', props });

// absent while prerendering in Node
if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  const locale = localeOfPath(location.pathname);
  const page = <Site locale={locale} release={__RELEASE__} />;
  if (root?.hasChildNodes()) {
    hydrateRoot(root, page);
  } else if (root) {
    // the dev server serves the bare template: no content, nor language
    document.documentElement.lang = locale;
    createRoot(root).render(page);
  }
}
