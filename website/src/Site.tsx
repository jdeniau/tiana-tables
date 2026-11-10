import { type ReactElement, useEffect, useState } from 'react';
import { BrowseSection } from './BrowseSection';
import { ChartsSection } from './ChartsSection';
import { DownloadSection } from './DownloadSection';
import { EditorSection } from './EditorSection';
import { Hero } from './Hero';
import { KeyboardSection } from './KeyboardSection';
import { PrivacySection } from './PrivacySection';
import { SshSection } from './SshSection';
import { ThemesSection } from './ThemesSection';
import { type Release, repositoryUrl } from './release';
import { SiteLocale, localePath } from './siteLocale';
import { type SiteKey, TextProvider, createText, useText } from './text';
import {
  PALETTES,
  SystemPalettes,
  ThemeChoiceProvider,
  useThemeChoice,
} from './themeChoice';

/** The sections the title bar links to, in page order. */
const NAV: Array<[id: string, label: SiteKey]> = [
  ['editor', 'nav.editor'],
  ['browse', 'nav.browse'],
  ['keyboard', 'nav.keyboard'],
  ['privacy', 'nav.privacy'],
  ['charts', 'nav.charts'],
  ['themes', 'nav.themes'],
  ['ssh', 'nav.ssh'],
  ['download', 'nav.download'],
];

/** The section a third of the way down the viewport: the title bar pips its link. */
function useCurrentSection(): string | null {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = (): void => {
      const line = window.scrollY + window.innerHeight * 0.35;
      let found: string | null = null;
      for (const [id] of NAV) {
        const section = document.getElementById(id);
        if (section && section.offsetTop <= line) {
          found = id;
        }
      }
      setCurrent(found);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return current;
}

function ThemeSelect(): ReactElement {
  const { site } = useText();
  const { name, pick } = useThemeChoice();

  return (
    <span className="tb-theme">
      <label
        className="tb-label"
        htmlFor="theme-select"
        data-shortcut="T"
        aria-hidden="true"
      >
        {site('theme.label')}
      </label>
      <select
        id="theme-select"
        className="select"
        aria-label={site('theme.label')}
        aria-keyshortcuts="T"
        value={name ?? ''}
        onChange={(event) => pick(event.target.value || null)}
      >
        <option value="">{site('theme.system')}</option>
        {(['dark', 'light'] as const).map((variant) => (
          <optgroup
            key={variant}
            label={site(variant === 'dark' ? 'theme.dark' : 'theme.light')}
          >
            {PALETTES.filter((theme) => theme.variant === variant).map(
              (theme) => (
                <option key={theme.name} value={theme.name}>
                  {theme.name}
                </option>
              )
            )}
          </optgroup>
        ))}
      </select>
    </span>
  );
}

function TitleBar(): ReactElement {
  const { site, locale } = useText();
  const current = useCurrentSection();
  const other = locale === SiteLocale.En ? SiteLocale.Fr : SiteLocale.En;

  return (
    <header className="titlebar">
      <div className="titlebar-in">
        <a className="brand" href="#top">
          <img src="/favicon.png" alt="" width="22" height="22" />
          <span>Tiana Tables</span>
        </a>
        <nav className="run" aria-label={site('nav.label')}>
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={id === current ? 'true' : undefined}
            >
              {site(label)}
            </a>
          ))}
        </nav>
        <div className="tb-tools">
          <ThemeSelect />
          <a
            className="lang"
            href={localePath(other)}
            hrefLang={other}
            lang={other}
          >
            {site('language.other')}
          </a>
          <a className="tb-github" href={repositoryUrl}>
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}

/** The whole page, prerendered at build and hydrated in the browser. */
export function Site({
  locale,
  release,
}: {
  locale: SiteLocale;
  release: Release;
}): ReactElement {
  const text = createText(locale);

  return (
    <TextProvider value={text}>
      <ThemeChoiceProvider>
        <SystemPalettes />
        <TitleBar />
        <div className="page">
          <main className="frame">
            <Hero release={release} />
            <EditorSection />
            <BrowseSection />
            <KeyboardSection />
            <PrivacySection />
            <ChartsSection />
            <ThemesSection />
            <SshSection />
            <DownloadSection release={release} />
            <footer className="foot">
              <img src="/favicon.png" alt="" width="28" height="28" />
              <span>{text.site('foot.credits')}</span>
              <span className="spacer" />
              <a href={repositoryUrl}>GitHub</a>
              <a href={`${repositoryUrl}/issues`}>{text.site('foot.issues')}</a>
              <a href={`${repositoryUrl}/releases`}>
                {text.site('foot.releases')}
              </a>
            </footer>
          </main>
        </div>
      </ThemeChoiceProvider>
    </TextProvider>
  );
}
