import type { CSSProperties, ReactElement } from 'react';
import { ACCENT_SLOTS } from '../../src/configuration/palettes/types';
import { RegionHead } from './Frame';
import { useText } from './text';
import { PALETTES, useThemeChoice } from './themeChoice';

export function ThemesSection(): ReactElement {
  const { site } = useText();
  const { name, pick } = useThemeChoice();

  return (
    <section className="region" id="themes">
      <RegionHead
        name={site('themes.title')}
        meta={site('themes.meta', { count: PALETTES.length })}
      />
      <div className="themes">
        <p className="lead">{site('themes.lead')}</p>
        {(['dark', 'light'] as const).map((variant) => (
          <div key={variant} className="tgroup">
            <h3>{site(variant === 'dark' ? 'theme.dark' : 'theme.light')}</h3>
            <div className="chips">
              {PALETTES.filter((theme) => theme.variant === variant).map(
                (theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    className="chip"
                    aria-pressed={theme.name === name}
                    onClick={() => pick(theme.name)}
                    style={
                      {
                        '--c0': theme.palette.base00,
                        '--c5': theme.palette.base05,
                        '--cD': theme.palette.base0D,
                      } as CSSProperties
                    }
                  >
                    {theme.name}
                    <span className="swatch" aria-hidden="true">
                      {ACCENT_SLOTS.map((slot) => (
                        <i
                          key={slot}
                          style={{ background: theme.palette[slot] }}
                        />
                      ))}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
