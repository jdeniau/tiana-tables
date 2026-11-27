import {
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { List, Prose, RegionHead, Stage } from './Frame';
import { useCmdOrCtrl } from './cmdOrCtrl';
import {
  type Line,
  type Piece,
  STEPS,
  TABLES_BY_USE,
  linesOf,
  stepAt,
} from './editorScript';
import { useText } from './text';

/** Whether half of `ref` is in the viewport: the loop only plays where it is seen. */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.5 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

/** The step of the loop the editor shows, and how many keys it pressed since the page loaded. */
function useStep(playing: boolean): [index: number, presses: number] {
  const [index, setIndex] = useState(0);
  const [presses, setPresses] = useState(0);

  useEffect(() => {
    if (
      !playing ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = setTimeout(() => {
      const next = (index + 1) % STEPS.length;
      setIndex(next);
      if (stepAt(next).key) {
        setPresses((count) => count + 1);
      }
    }, stepAt(index).hold);
    return () => clearTimeout(timer);
  }, [playing, index]);

  return [index, presses];
}

function CodePiece({ piece }: { piece: Piece }): ReactElement {
  const className = [piece.kind, piece.ghost && 'ghost-text']
    .filter(Boolean)
    .join(' ');

  return <span className={className || undefined}>{piece.text}</span>;
}

/** A line of the editor; `step` restarts the caret's blink at each step, as typing does. */
function CodeLine({
  line,
  className,
  step,
}: {
  line: Line;
  className: string | undefined;
  step: number;
}): ReactElement {
  const caret = line.caret ?? line.pieces.length;

  return (
    <span className={className}>
      {line.pieces.slice(0, caret).map((piece, index) => (
        <CodePiece key={index} piece={piece} />
      ))}
      {line.caret !== null && <span key={step} className="caret" />}
      {line.pieces.slice(caret).map((piece, index) => (
        <CodePiece key={caret + index} piece={piece} />
      ))}
    </span>
  );
}

export function EditorSection(): ReactElement {
  const { site, rich, richList, app } = useText();
  const cmdOrCtrl = useCmdOrCtrl();
  const windowRef = useRef<HTMLDivElement>(null);
  const [index, presses] = useStep(useInView(windowRef));
  const step = stepAt(index);

  return (
    <section className="region" id="editor">
      <RegionHead name={site('editor.title')} meta={site('editor.meta')} />
      <div className="split wide-right">
        <Prose>
          <p className="lead">{site('editor.lead')}</p>
          <div className="feature">
            <h3>{site('editor.builder.title')}</h3>
            <p>{rich('editor.builder.text')}</p>
          </div>
          <List items={richList('editor.items')} />
        </Prose>
        <Stage>
          <div className="window" ref={windowRef}>
            <div className="panel-head">
              <span className="panel-name">{app('rawSql.query.title')}</span>
              <span className="panel-meta">
                {app('rawSql.query.statementCount', { count: 1 })}
              </span>
              <span className="panel-tools">
                <span className="action small">
                  {app('rawSql.submit')} <kbd>{cmdOrCtrl}↵</kbd>
                </span>
              </span>
            </div>
            <div className="ed-body">
              <pre className="code" aria-label={site('editor.label')}>
                {linesOf(step).map((line, lineIndex) => (
                  <CodeLine
                    key={lineIndex}
                    line={line}
                    step={index}
                    className={
                      line.ghost
                        ? 'ghost-line'
                        : step.typed
                          ? 'current-statement'
                          : undefined
                    }
                  />
                ))}
              </pre>
              {step.suggest && (
                <div className="suggest" aria-hidden="true">
                  {TABLES_BY_USE.map((table) => (
                    <div key={table}>
                      <i />
                      {table}
                    </div>
                  ))}
                </div>
              )}
              {presses > 0 && step.key && (
                <kbd key={presses} className="keypress" aria-hidden="true">
                  {step.key}
                </kbd>
              )}
            </div>
          </div>
          <p className="caption">{rich('editor.caption')}</p>
        </Stage>
      </div>
    </section>
  );
}
