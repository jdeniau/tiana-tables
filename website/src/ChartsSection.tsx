import type { ReactElement } from 'react';
import { Prose, RegionHead, Stage } from './Frame';
import { useText } from './text';

/** Monthly reads of the sample dataset, from 2024-01 to 2026-09. */
const READS = [
  1, 1, 10, 10, 19, 14, 17, 30, 32, 52, 52, 40, 40, 41, 66, 69, 91, 62, 84, 94,
  86, 110, 97, 132, 148, 126, 131, 198, 189, 242, 284, 295, 337,
];
const READERS = [
  1, 0, 5, 3, 14, 8, 8, 16, 20, 28, 33, 26, 27, 26, 37, 38, 57, 41, 52, 47, 50,
  64, 53, 72, 79, 75, 81, 100, 107, 135, 165, 150, 182,
];
const SERIES: [values: number[], colour: string][] = [
  [READS, 'var(--base0C)'],
  [READERS, 'var(--base09)'],
];

const WIDTH = 640;
const HEIGHT = 280;
const LEFT = 40;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 30;
const MAX = 350;
const TICKS = [0, 50, 100, 150, 200, 250, 300, 350];
const LABELLED_MONTHS = [0, 6, 12, 18, 24, 30];

const x = (index: number): number =>
  LEFT + ((WIDTH - LEFT - RIGHT) * index) / (READS.length - 1);
const y = (value: number): number =>
  TOP + (HEIGHT - TOP - BOTTOM) * (1 - value / MAX);
const month = (index: number): string =>
  `${2024 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;

/** The line chart of the result, coloured by the palette's custom properties. */
function Chart({ label }: { label: string }): ReactElement {
  return (
    <svg
      id="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={LEFT}
            x2={WIDTH - RIGHT}
            y1={y(tick)}
            y2={y(tick)}
            style={{ stroke: tick ? 'var(--base02)' : 'var(--base03)' }}
          />
          <text
            x={LEFT - 8}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="10"
            style={{ fill: 'var(--base03)' }}
          >
            {tick}
          </text>
        </g>
      ))}
      {LABELLED_MONTHS.map((index) => (
        <text
          key={index}
          x={x(index)}
          y={HEIGHT - 10}
          textAnchor="middle"
          fontSize="10"
          style={{ fill: 'var(--base03)' }}
        >
          {month(index)}
        </text>
      ))}
      {SERIES.map(([values, colour]) => (
        <g key={colour} style={{ stroke: colour, fill: colour }}>
          <polyline
            points={values
              .map((value, index) => `${x(index)},${y(value)}`)
              .join(' ')}
            fill="none"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {values.map((value, index) => (
            <circle
              key={index}
              cx={x(index)}
              cy={y(value)}
              r="2.5"
              stroke="none"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function ChartsSection(): ReactElement {
  const { site, rich, app } = useText();

  return (
    <section className="region" id="charts">
      <RegionHead name={site('charts.title')} meta={site('charts.meta')} />
      <div className="split wide-left">
        <Stage>
          <div className="win">
            <div className="rgh">
              <span className="n">{app('rawSql.result.title')}</span>
              <span className="m">
                {app('rawSql.result.meta.rows', { count: 33, ms: 13 })}
              </span>
              <span className="r">
                <span className="seg">
                  <span>{app('chart.tab.data')}</span>
                  <span className="on">{app('chart.tab.chart')}</span>
                </span>
              </span>
            </div>
            <div className="chart-ctl">
              <span>{app('chart.kind.line')}</span>
              <span>mois</span>
              <span>
                <b>lectures ×</b>
                <b>lecteurs_identifies ×</b>
              </span>
            </div>
            <div className="legend">
              <span className="a">lectures</span>
              <span className="b">lecteurs_identifies</span>
            </div>
            <Chart label={site('charts.label')} />
          </div>
        </Stage>
        <Prose>
          <p className="lead">{site('charts.lead')}</p>
          <blockquote>{rich('charts.quote')}</blockquote>
          <p className="quiet">{site('charts.text')}</p>
        </Prose>
      </div>
    </section>
  );
}
