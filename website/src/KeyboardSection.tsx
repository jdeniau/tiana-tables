import type { ReactElement } from 'react';
import { Prose, RegionHead, Stage } from './Frame';
import { useAlt, useCmdOrCtrl, useCtrl } from './cmdOrCtrl';
import { type SiteKey, useText } from './text';

/** The main shortcuts of the app, drawn as a query result. */
export function KeyboardSection(): ReactElement {
  const { site, app } = useText();
  const cmdOrCtrl = useCmdOrCtrl();
  const ctrl = useCtrl();
  const alt = useAlt();

  const shortcuts: Array<[keys: string, action: SiteKey]> = [
    [`${cmdOrCtrl}K`, 'keyboard.navigate'],
    [`${cmdOrCtrl}T`, 'keyboard.sqlPanel'],
    [`${cmdOrCtrl}↵`, 'keyboard.run'],
    ['↑ ↓ ← →', 'keyboard.move'],
    ['⇧ ↑ ↓ ← →', 'keyboard.extend'],
    ['↵', 'keyboard.edit'],
    [app('table.contextMenu.delete.shortcut'), 'keyboard.delete'],
    [`${cmdOrCtrl}C`, 'keyboard.copy'],
    [`${ctrl}G`, 'keyboard.goToId'],
    [site('keyboard.escape.key'), 'keyboard.escape'],
    [`${ctrl}Tab`, 'keyboard.connection'],
    [`${alt}← ${alt}→`, 'keyboard.history'],
  ];

  return (
    <section className="region" id="keyboard">
      <RegionHead name={site('keyboard.title')} meta={site('keyboard.meta')} />
      <div className="split wide-right">
        <Prose>
          <p className="lead">{site('keyboard.lead')}</p>
          <p className="quiet">{site('keyboard.text')}</p>
        </Prose>
        <Stage>
          <div className="window">
            <div className="panel-head">
              <span className="panel-meta">
                <span className="keyword">SELECT</span>{' '}
                <span className="operator">*</span>{' '}
                <span className="keyword">FROM</span>{' '}
                <span className="table-name">shortcuts</span>
              </span>
              <span className="panel-tools">
                <span className="panel-meta">
                  {app('table.rows.count', { count: shortcuts.length })}
                </span>
              </span>
            </div>
            <div className="table-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    <th>key</th>
                    <th>action</th>
                  </tr>
                </thead>
                <tbody>
                  {shortcuts.map(([keys, action]) => (
                    <tr key={action}>
                      <td>
                        <kbd>{keys}</kbd>
                      </td>
                      <td className="string">{site(action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Stage>
      </div>
    </section>
  );
}
