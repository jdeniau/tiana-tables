import type { ReactElement } from 'react';
import { List, Prose, RegionHead, Stage } from './Frame';
import { useCmdOrCtrl, useCtrl } from './cmdOrCtrl';
import { useText } from './text';

const ROWS: [id: number, status: string, authorId: number, views: number][] = [
  [11, 'relecture', 29, 0],
  [12, 'publie', 25, 8030],
  [13, 'publie', 40, 4407],
  [14, 'publie', 38, 792],
  [15, 'brouillon', 27, 0],
  [16, 'publie', 35, 2581],
  [18, 'publie', 35, 11085],
  [19, 'programme', 29, 0],
  [20, 'archive', 40, 1260],
];

/** Browsing and editing, side by side as the two halves of the table page. */
export function BrowseSection(): ReactElement {
  const { site, richList, app } = useText();
  const cmdOrCtrl = useCmdOrCtrl();
  const ctrl = useCtrl();

  return (
    <section className="region" id="browse">
      <div className="split">
        <div>
          <RegionHead name={site('browse.title')} meta={site('browse.meta')} />
          <Prose>
            <p className="lead">{site('browse.lead')}</p>
            <List items={richList('browse.items')} />
          </Prose>
          <Stage>
            <div className="window menu-anchor">
              <table className="grid">
                <thead>
                  <tr>
                    <th className="numeric">id</th>
                    <th>statut</th>
                    <th className="numeric">auteur_id</th>
                    <th className="numeric">vues</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([id, status, authorId, views]) => (
                    <tr key={id}>
                      <td className="numeric number">{id}</td>
                      <td className={id === 12 ? 'string selected' : 'string'}>
                        {status}
                      </td>
                      <td className="numeric number foreign-key">{authorId}</td>
                      <td className="numeric number">{views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="menu" aria-hidden="true">
                <div>
                  {app('table.contextMenu.edit', { editable: 'true' })}
                  <kbd>{app('table.contextMenu.edit.shortcut')}</kbd>
                </div>
                <div>
                  {app('table.contextMenu.setNull', { count: 1 })}
                  <kbd>{app('table.contextMenu.delete.shortcut')}</kbd>
                </div>
                <hr />
                <div>
                  {app('table.contextMenu.copy', { count: 1 })}
                  <kbd>{cmdOrCtrl}C</kbd>
                </div>
                <div>
                  {app('table.contextMenu.copyRow')}
                  <kbd>▸</kbd>
                </div>
                <hr />
                <div className="highlighted">
                  {app('table.contextMenu.filter')}
                  <kbd>▸</kbd>
                  <div className="submenu">
                    <div>{app('table.contextMenu.filter.cellValue')}</div>
                    <div>{app('table.contextMenu.filter.clipboard')}</div>
                    <div>{app('table.contextMenu.filter.freeText')}</div>
                  </div>
                </div>
                <div>
                  {app('table.goToId')}
                  <kbd>{ctrl}G</kbd>
                </div>
                <hr />
                <div className="danger">
                  {app('table.contextMenu.delete', { count: 1 })}
                </div>
              </div>
            </div>
          </Stage>
        </div>
        <div id="edit">
          <RegionHead name={site('edit.title')} meta={site('edit.meta')} />
          <Prose>
            <p className="lead">{site('edit.lead')}</p>
            <div className="editors" aria-label={site('edit.editors.label')}>
              {richList('edit.editors').map((editor, index) => (
                <span key={index}>{editor}</span>
              ))}
            </div>
            <p className="quiet">{site('edit.text')}</p>
          </Prose>
          <Stage>
            <div className="window dialog">
              <h4>{app('cell.write.changed.title')}</h4>
              <p>{app('cell.write.changed.description')}</p>
              <div className="values">
                <span>{app('cell.write.serverValue')}</span>
                <span>&apos;relecture&apos;</span>
                <span>{app('cell.write.yourValue')}</span>
                <span>&apos;publie&apos;</span>
              </div>
              <div className="btns">
                <span className="btn">{app('cell.write.cancel')}</span>
                <span className="action small">
                  {app('cell.write.overwrite')}
                </span>
              </div>
            </div>
          </Stage>
        </div>
      </div>
    </section>
  );
}
