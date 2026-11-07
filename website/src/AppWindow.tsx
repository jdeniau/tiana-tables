import type { ReactElement } from 'react';
import { useCmdOrCtrl } from './cmdOrCtrl';
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

const ROWS: Array<Row> = [
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
  const cmdOrCtrl = useCmdOrCtrl();
  const nullText = app('cell.detail.nullPlaceholder');
  const local = app('dateDisplay.option', { display: 'local' });

  return (
    <div className="window app" role="img" aria-label={site('app.label')}>
      <div className="app-bar">
        <span className="app-name">
          Tiana Tables <i>☰</i>
        </span>
        <span className="tab active live-dot">Le Fil (dev)</span>
        <span className="tab plus">+</span>
        <span className="sql">SQL</span>
      </div>
      <div className="app-body">
        <aside className="side">
          <h3>
            TIANA_DEV <span>⌄</span>
          </h3>
          <div className="goto">
            <span>{app('tableList.navigate')}</span>
            <span>{cmdOrCtrl}K</span>
          </div>
          <ul className="tables">
            {TABLES.map((table) => (
              <li
                key={table}
                className={table === 'article' ? 'active' : undefined}
              >
                {table}
              </li>
            ))}
          </ul>
          <div className="side-foot">
            {app('tableList.count', { count: 25 })}
          </div>
        </aside>
        <div className="workspace">
          <div className="table-tabs">
            <span className="live-dot">
              article<b>×</b>
            </span>
          </div>
          <div className="filters">
            <div className="panel-head">
              <span className="panel-name">{app('table.filters.title')}</span>
              <span className="panel-tools">
                <span className="action small">{app('filter')}</span>
              </span>
            </div>
            <div className="filter-line">
              statut &lt;&gt;{' '}
              <span className="string">&apos;archive&apos;</span>
            </div>
            <div className="dots" />
          </div>
          <div className="result">
            <div className="panel-head">
              <span className="panel-name">article</span>
              <span className="panel-meta">
                {app('table.rows.count', { count: 100 })}
              </span>
              <span className="panel-tools">
                <span className="segmented-label hide-sm">
                  {app('dateDisplay.label')}
                </span>
                <span className="segmented hide-sm">
                  <span>
                    {app('dateDisplay.option', { display: 'server' })} · UTC
                  </span>
                  <span className="active">{local} · Europe/Paris</span>
                </span>
                <span className="segmented">
                  <span className="active">{app('table.tab.data')}</span>
                  <span>{app('table.tab.structure')}</span>
                </span>
              </span>
            </div>
            <div className="gridwrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th className="numeric">id</th>
                    <th>titre</th>
                    <th>statut</th>
                    <th className="numeric">auteur_id</th>
                    <th>
                      publie_le <em>{local}</em>
                    </th>
                    <th className="numeric">vues</th>
                    <th className="numeric">note_moyenne</th>
                    <th className="numeric">en_une</th>
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
                        className={id === SELECTED_ID ? 'selected' : undefined}
                      >
                        <td className="numeric number">{id}</td>
                        <td className="truncated">{title}</td>
                        <td className="string">{status}</td>
                        <td className="numeric number foreign-key">
                          {authorId}
                        </td>
                        {publishedAt ? (
                          <td>
                            {publishedAt[0]}
                            <span className="time-zone">{publishedAt[1]}</span>
                          </td>
                        ) : (
                          <td className="null">{nullText}</td>
                        )}
                        <td className="numeric number">{views}</td>
                        <td
                          className={rating ? 'numeric number' : 'numeric null'}
                        >
                          {rating ?? nullText}
                        </td>
                        <td className="numeric number">{frontPage}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="workspace-foot">{app('table.rows.loadMore')}</div>
        </div>
      </div>
    </div>
  );
}
