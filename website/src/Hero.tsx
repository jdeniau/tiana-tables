import type { ReactElement } from 'react';
import { AppWindow } from './AppWindow';
import { DownloadPick } from './DownloadPick';
import { type Release, repositoryUrl } from './release';
import { useText } from './text';
import { PALETTES } from './themeChoice';

export function Hero({ release }: { release: Release }): ReactElement {
  const { site } = useText();
  const spec: [term: string, value: string][] = [
    [site('spec.engines'), site('spec.engines.value')],
    [site('spec.runsOn'), site('spec.runsOn.value')],
    [site('spec.connects'), site('spec.connects.value')],
    [
      site('spec.themes'),
      site('spec.themes.value', { count: PALETTES.length }),
    ],
    [site('spec.languages'), site('spec.languages.value')],
    [site('spec.account'), site('spec.account.value')],
    [site('spec.license'), 'MIT'],
    [site('spec.latest'), `v${release.version}`],
  ];

  return (
    <section className="region" id="top">
      <div className="hero-top">
        <div className="hero-text">
          <p className="eyebrow">{site('hero.eyebrow')}</p>
          <div className="hero-title">
            <h1>
              <span className="title-long">{site('hero.title')}</span>
              <span className="title-short">{site('hero.title.short')}</span>
              <span className="title-dot" aria-hidden="true" />
            </h1>
          </div>
          <p className="lead">{site('hero.lead')}</p>
          <div className="cta">
            <DownloadPick release={release} />
            <a className="ghost" href={repositoryUrl}>
              {site('hero.source')}
            </a>
          </div>
        </div>
        <dl className="spec">
          {spec.map(([term, value]) => (
            <div key={term} className="spec-row">
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="hero-app">
        <div className="stage">
          <AppWindow />
          <p className="caption">{site('app.caption')}</p>
        </div>
      </div>
    </section>
  );
}
