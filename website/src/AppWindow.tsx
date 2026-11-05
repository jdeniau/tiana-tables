import type { ReactElement } from 'react';
import { useText } from './text';

const TABLES = [
  'abonnement',
  'article',
  'article_media',
  'article_revision',
  'article_tag',
  'auteur',
  'categorie',
  'code_promo',
  'commentaire',
  'dossier',
  'envoi_newsletter',
  'favori',
  'formule_abonnement',
  'inscription_newsletter',
  'lecture',
  'media',
  'paiement',
];

type Row = [
  id: number,
  title: string,
  status: string,
  authorId: number,
  publishedAt: [date: string, offset: string] | null,
  views: number,
  rating: string | null,
  frontPage: number,
];

const ROWS: Row[] = [
  [
    1,
    'Pourquoi le plan contre la sécheresse patine',
    'publie',
    4,
    ['2024-09-09 16:02:15', 'UTC+02:00'],
    3873,
    '3.11',
    0,
  ],
  [
    2,
    'La réforme agricole est-elle déjà enterrée ?',
    'publie',
    32,
    ['2026-08-28 10:27:01', 'UTC+02:00'],
    3234,
    null,
    0,
  ],
  [
    3,
    'La fibre optique en zone rurale, cinq ans après',
    'publie',
    16,
    ['2024-08-22 01:19:55', 'UTC+02:00'],
    13977,
    '4.27',
    0,
  ],
  [
    4,
    'Enquête sur le vinyle et ses nouveaux disquaires',
    'publie',
    41,
    ['2024-10-13 01:27:36', 'UTC+02:00'],
    3398,
    '4.78',
    0,
  ],
  [
    6,
    'Trois questions sur la loi de finances',
    'brouillon',
    33,
    null,
    0,
    null,
    0,
  ],
  [
    7,
    'La réforme de l’audiovisuel public',
    'brouillon',
    33,
    null,
    0,
    '3.95',
    0,
  ],
  [
    8,
    'Reportage à Brest : ce que le port prépare',
    'publie',
    39,
    ['2024-04-15 23:42:16', 'UTC+02:00'],
    1336,
    '4.12',
    0,
  ],
  [
    9,
    'Reportage à Brest : ceux qui restent',
    'publie',
    42,
    ['2024-12-07 17:46:11', 'UTC+01:00'],
    2307,
    null,
    0,
  ],
  [
    11,
    'Pourquoi la lutte contre le gaspillage piétine',
    'relecture',
    29,
    null,
    0,
    null,
    0,
  ],
  [
    12,
    'Les finances de la fédération en question',
    'publie',
    25,
    ['2026-06-26 18:28:00', 'UTC+02:00'],
    8030,
    '4.43',
    0,
  ],
  [
    13,
    'Reportage à Rennes : comment le métro change la ville',
    'publie',
    40,
    ['2025-12-30 11:17:21', 'UTC+01:00'],
    4407,
    '4.60',
    0,
  ],
  [
    14,
    'Pourquoi l’accès aux soins recule',
    'publie',
    38,
    ['2024-11-19 01:17:01', 'UTC+01:00'],
    792,
    '4.10',
    1,
  ],
  [
    15,
    'Enquête sur la pêche en eaux profondes',
    'brouillon',
    27,
    null,
    0,
    null,
    0,
  ],
];

const SELECTED_ID = 4;

/** The table page of the app, drawn: sidebar, filters and the grid of `article`. */
export function AppWindow(): ReactElement {
  const { site, app } = useText();
  const nullText = app('cell.detail.nullPlaceholder');
  const local = app('dateDisplay.option', { display: 'local' });

  return (
    <div className="win app" role="img" aria-label={site('app.label')}>
      <div className="app-bar">
        <span className="b">
          Tiana Tables <i>☰</i>
        </span>
        <span className="t on pipd">Le Fil (dev)</span>
        <span className="t plus">+</span>
        <span className="sql">SQL</span>
      </div>
      <div className="app-body">
        <aside className="side">
          <h3>
            TIANA_DEV <span>⌄</span>
          </h3>
          <div className="goto">
            <span>{app('tableList.navigate')}</span>
            <span>ctrl+K</span>
          </div>
          <ul className="tables">
            {TABLES.map((table) => (
              <li
                key={table}
                className={table === 'article' ? 'on' : undefined}
              >
                {table}
              </li>
            ))}
          </ul>
          <div className="side-foot">
            {app('tableList.count', { count: 25 })}
          </div>
        </aside>
        <div className="ws">
          <div className="ttabs">
            <span className="pipd">
              article<b>×</b>
            </span>
          </div>
          <div className="filters">
            <div className="rgh">
              <span className="n">{app('table.filters.title')}</span>
              <span className="r">
                <span className="action sm">{app('filter')}</span>
              </span>
            </div>
            <div className="filter-line">
              statut &lt;&gt; <span className="s">&apos;archive&apos;</span>
            </div>
            <div className="dots" />
          </div>
          <div className="result">
            <div className="rgh">
              <span className="n">article</span>
              <span className="m">
                {app('table.rows.count', { count: 100 })}
              </span>
              <span className="r">
                <span className="seg-l hide-sm">
                  {app('dateDisplay.label')}
                </span>
                <span className="seg hide-sm">
                  <span>
                    {app('dateDisplay.option', { display: 'server' })} · UTC
                  </span>
                  <span className="on">{local} · Europe/Paris</span>
                </span>
                <span className="seg">
                  <span className="on">{app('table.tab.data')}</span>
                  <span>{app('table.tab.structure')}</span>
                </span>
              </span>
            </div>
            <div className="gridwrap">
              <table className="tg">
                <thead>
                  <tr>
                    <th className="r">id</th>
                    <th>titre</th>
                    <th>statut</th>
                    <th className="r">auteur_id</th>
                    <th>
                      publie_le <em>{local}</em>
                    </th>
                    <th className="r">vues</th>
                    <th className="r">note_moyenne</th>
                    <th className="r">en_une</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(
                    ([
                      id,
                      title,
                      status,
                      authorId,
                      publishedAt,
                      views,
                      rating,
                      frontPage,
                    ]) => (
                      <tr
                        key={id}
                        className={id === SELECTED_ID ? 'sel' : undefined}
                      >
                        <td className="r n">{id}</td>
                        <td className="ti">{title}</td>
                        <td className="st">{status}</td>
                        <td className="r n fk">{authorId}</td>
                        {publishedAt ? (
                          <td>
                            {publishedAt[0]}
                            <span className="z">{publishedAt[1]}</span>
                          </td>
                        ) : (
                          <td className="nul">{nullText}</td>
                        )}
                        <td className="r n">{views}</td>
                        <td className={rating ? 'r n' : 'r nul'}>
                          {rating ?? nullText}
                        </td>
                        <td className="r n">{frontPage}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ws-foot">{app('table.rows.loadMore')}</div>
        </div>
      </div>
    </div>
  );
}
