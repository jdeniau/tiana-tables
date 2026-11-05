import type { ReactElement } from 'react';
import { List, Prose, RegionHead, Stage } from './Frame';
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
            <div className="win ctx">
              <table className="tg">
                <thead>
                  <tr>
                    <th className="r">id</th>
                    <th>statut</th>
                    <th className="r">auteur_id</th>
                    <th className="r">vues</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([id, status, authorId, views]) => (
                    <tr key={id} className={id === 12 ? 'sel' : undefined}>
                      <td className="r n">{id}</td>
                      <td className="st">{status}</td>
                      <td className="r n fk">{authorId}</td>
                      <td className="r n">{views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="menu" aria-hidden="true">
                <div>
                  {app('table.contextMenu.edit', { editable: 'true' })}
                  <kbd>{app('table.contextMenu.edit.shortcut')}</kbd>
                </div>
                <div>{app('table.contextMenu.setNull')}</div>
                <hr />
                <div>{app('table.contextMenu.copy')}</div>
                <div>
                  {app('table.contextMenu.copyRow')}
                  <kbd>▸</kbd>
                </div>
                <hr />
                <div className="hl">
                  {app('table.contextMenu.filter')}
                  <kbd>▸</kbd>
                  <div className="submenu">
                    <div>{app('table.contextMenu.filter.cellValue')}</div>
                    <div>{app('table.contextMenu.filter.clipboard')}</div>
                    <div>{app('table.contextMenu.filter.freeText')}</div>
                  </div>
                </div>
                <hr />
                <div className="danger">
                  {app('table.contextMenu.delete', { count: 1 })}
                  <kbd>{app('table.contextMenu.delete.shortcut')}</kbd>
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
            <div className="win dialog">
              <h4>{app('cell.write.changed.title')}</h4>
              <p>{app('cell.write.changed.description')}</p>
              <div className="vals">
                <span>{app('cell.write.serverValue')}</span>
                <span className="tg st">&apos;relecture&apos;</span>
                <span>{app('cell.write.yourValue')}</span>
                <span className="tg st">&apos;publie&apos;</span>
              </div>
              <div className="btns">
                <span className="btn">{app('cell.write.cancel')}</span>
                <span className="action sm">{app('cell.write.overwrite')}</span>
              </div>
            </div>
          </Stage>
        </div>
      </div>
    </section>
  );
}
