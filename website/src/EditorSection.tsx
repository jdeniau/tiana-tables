import type { ReactElement } from 'react';
import { List, Prose, RegionHead, Stage } from './Frame';
import { useText } from './text';

const COMPLETIONS = [
  'acces',
  'auteur_id',
  'categorie_id',
  'chapo',
  'contenu',
  'dossier_id',
  'en_une',
  'id',
];

export function EditorSection(): ReactElement {
  const { site, rich, richList, app } = useText();

  return (
    <section className="region" id="editor">
      <RegionHead name={site('editor.title')} meta={site('editor.meta')} />
      <div className="split wide-right">
        <Prose>
          <p className="lead">{rich('editor.lead')}</p>
          <List items={richList('editor.items')} />
        </Prose>
        <Stage>
          <div className="window">
            <div className="panel-head">
              <span className="panel-name">{app('rawSql.query.title')}</span>
              <span className="panel-meta">
                {app('rawSql.query.statementCount', { count: 1 })}
              </span>
              <span className="panel-tools">
                <span className="action small">
                  {app('rawSql.submit')} <kbd>ctrl+↵</kbd>
                </span>
              </span>
            </div>
            <div className="ed-body">
              <pre className="code" aria-label={site('editor.label')}>
                <span className="current-statement">
                  <span className="keyword">SELECT</span>{' '}
                  <span className="alias">a</span>.titre,{' '}
                  <span className="alias">au</span>.nom,{' '}
                  <span className="alias">au</span>.prenom
                </span>
                <span className="current-statement">
                  <span className="keyword">FROM</span>{' '}
                  <span className="table-name">article</span>{' '}
                  <span className="alias">a</span>
                </span>
                <span className="current-statement">
                  <span className="keyword">JOIN</span>{' '}
                  <span className="table-name">auteur</span>{' '}
                  <span className="alias">au</span>{' '}
                  <span className="keyword">ON</span>{' '}
                  <span className="alias">a</span>.auteur_id ={' '}
                  <span className="alias">au</span>.id
                </span>
                <span className="current-statement">
                  <span className="keyword">WHERE</span>{' '}
                  <span className="alias">a</span>
                  .<span className="caret" />
                </span>
              </pre>
              <div className="suggest" aria-hidden="true">
                {COMPLETIONS.map((column, index) => (
                  <div key={column}>
                    <i />
                    {column}
                    {index === 0 && <small>article</small>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Stage>
      </div>
    </section>
  );
}
