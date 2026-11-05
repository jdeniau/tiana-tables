import '@fontsource/noto-sans-mono/400.css';
import '@fontsource/noto-sans-mono/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/syne-mono/400.css';
import './style.css';
import { createRoot } from 'react-dom/client';
import { unikittyLight } from '../../src/configuration/palettes/unikittyLight';
import { type AppTheme, DEFAULT_THEME } from '../../src/configuration/themes';
import { Site } from './Site';
import type { Release } from './release';
import { SiteLocale } from './siteLocale';

declare const __RELEASE__: Release;

const declarations = (theme: AppTheme): string =>
  Object.entries(theme.palette)
    .map(([slot, colour]) => `--${slot}:${colour};`)
    .join('') + `color-scheme:${theme.variant};`;

// the palettes followed until the visitor picks one: the app's default, and the light one of DESIGN.md
const systemPalettes = document.createElement('style');
systemPalettes.textContent = `:root{${declarations(DEFAULT_THEME)}}@media (prefers-color-scheme: light){:root{${declarations(unikittyLight)}}}`;
document.head.append(systemPalettes);

const locale =
  Object.values(SiteLocale).find(
    (value) => value === document.documentElement.lang
  ) ?? SiteLocale.En;

createRoot(document.getElementById('root')!).render(
  <Site locale={locale} release={__RELEASE__} />
);
