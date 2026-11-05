import type { ReactElement } from 'react';
import { Prose, RegionHead } from './Frame';
import { type SiteKey, useText } from './text';

/** An engine is named as is, a feature by a message; a null status prints as NULL. */
const SCOPE: [name: string | { key: SiteKey }, status: SiteKey | null][] = [
  ['MySQL', 'databases.supported'],
  ['MariaDB', 'databases.supported'],
  ['PostgreSQL', 'databases.supported'],
  [{ key: 'databases.ssl' }, 'databases.supported'],
  [{ key: 'databases.ssh' }, 'databases.supported'],
  [{ key: 'databases.others' }, null],
  [{ key: 'databases.admin' }, 'databases.outOfScope'],
];

/** Where the app runs, and the databases it reaches. */
export function PrivacySection(): ReactElement {
  const { site, richList, app } = useText();
  const label = (name: (typeof SCOPE)[number][0]): string =>
    typeof name === 'string' ? name : site(name.key);

  return (
    <section className="region" id="privacy">
      <div className="split">
        <div>
          <RegionHead
            name={site('privacy.title')}
            meta={site('privacy.meta')}
          />
          <Prose>
            <p className="claim">
              {richList('privacy.statement').map((line, index) => (
                <span key={index}>{line}</span>
              ))}
            </p>
            <p>{site('privacy.lead')}</p>
            <p className="quiet">{site('privacy.text')}</p>
          </Prose>
        </div>
        <div id="databases">
          <RegionHead
            name={site('databases.title')}
            meta={site('databases.meta')}
          />
          <Prose>
            <div className="window">
              <div className="panel-head">
                <span className="panel-meta">
                  <span className="keyword">SELECT</span>{' '}
                  <span className="operator">*</span>{' '}
                  <span className="keyword">FROM</span>{' '}
                  <span className="table-name">support</span>
                </span>
                <span className="panel-tools">
                  <span className="panel-meta">
                    {app('table.rows.count', { count: SCOPE.length })}
                  </span>
                </span>
              </div>
              <div className="table-scroll">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>engine</th>
                      <th>status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCOPE.map(([name, status]) => (
                      <tr key={label(name)}>
                        <td>{label(name)}</td>
                        {status ? (
                          <td className="string">{site(status)}</td>
                        ) : (
                          <td className="null">
                            {app('cell.detail.nullPlaceholder')}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="quiet">{site('databases.text')}</p>
          </Prose>
        </div>
      </div>
    </section>
  );
}
