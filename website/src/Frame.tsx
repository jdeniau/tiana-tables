import type { ReactElement, ReactNode } from 'react';

/** The header row of a region: its name in condensed caps, then a meta text. */
export function RegionHead({
  name,
  meta,
}: {
  name: string;
  meta: string;
}): ReactElement {
  return (
    <header className="region-head">
      <h2 className="region-name">{name}</h2>
      <span className="region-meta">{meta}</span>
    </header>
  );
}

/** Running text beside a drawn window: a lead sentence, then the details. */
export function Prose({ children }: { children: ReactNode }): ReactElement {
  return <div className="prose">{children}</div>;
}

export function List({ items }: { items: Array<ReactNode> }): ReactElement {
  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** The dotted ground a drawn window of the app stands on. */
export function Stage({ children }: { children: ReactNode }): ReactElement {
  return <div className="stage">{children}</div>;
}
