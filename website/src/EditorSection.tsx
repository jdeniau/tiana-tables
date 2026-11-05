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
          <div className="win">
            <div className="rgh">
              <span className="n">{app('rawSql.query.title')}</span>
              <span className="m">
                {app('rawSql.query.statementCount', { count: 1 })}
              </span>
              <span className="r">
                <span className="action sm">
                  {app('rawSql.submit')} <kbd>ctrl+↵</kbd>
                </span>
              </span>
            </div>
            <div className="ed-body">
              <pre className="code" aria-label={site('editor.label')}>
                <span className="cur">
                  <span className="k">SELECT</span>{' '}
                  <span className="al">a</span>.titre,{' '}
                  <span className="al">au</span>.nom,{' '}
                  <span className="al">au</span>.prenom
                </span>
                <span className="cur">
                  <span className="k">FROM</span>{' '}
                  <span className="tbl">article</span>{' '}
                  <span className="al">a</span>
                </span>
                <span className="cur">
                  <span className="k">JOIN</span>{' '}
                  <span className="tbl">auteur</span>{' '}
                  <span className="al">au</span> <span className="k">ON</span>{' '}
                  <span className="al">a</span>.auteur_id ={' '}
                  <span className="al">au</span>.id
                </span>
                <span className="cur">
                  <span className="k">WHERE</span> <span className="al">a</span>
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
