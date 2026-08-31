import { ReactElement, useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { Alert, Flex, Select, Space } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { styled, useTheme } from 'styled-components';
import { useTranslation } from '../../../i18n';
import {
  ChartConfig,
  ChartKind,
  defaultChartConfig,
  numericFieldIndexes,
} from './chartConfig';
import { buildChartTheme } from './chartTheme';
import { MAX_POINTS, toBarData, toLineSeries } from './toSeries';

interface ChartPanelProps {
  result: readonly RowDataPacket[];
  fields: readonly FieldPacket[];
  rowsAsArray?: boolean;
}

/**
 * nivo's `Responsive*` components measure their parent, so that parent needs a
 * height of its own. Inside the page's `Splitter.Panel` (`height: 100%`,
 * `min-height: 0`) an unconstrained wrapper collapses and the chart renders at
 * zero height — with no error to explain it.
 */
const ChartArea = styled.div`
  flex: 1;
  min-height: 320px;

  /* nivo renders its <svg> at exactly this box's measured height, but an inline
     element also reserves the line box's descender space under it — 6px at the
     default font size. Those 6px overflow the panel, which then scrolls: the
     scrollbar steals 15px of width, the svg (measured a frame earlier) overflows
     horizontally, that scrollbar steals 15px of height, nivo re-measures smaller,
     both scrollbars go away, and the whole thing starts over every frame. Making
     the svg a block removes the phantom 6px, and with them the loop. */
  svg {
    display: block;
  }
`;

const MARGIN = { top: 20, right: 140, bottom: 70, left: 70 };

/**
 * Series colours come from nivo, not from the app theme — see `chartTheme.ts`.
 * `category10` rather than nivo's default scheme: the latter opens on two pale
 * neighbouring tones that are hard to tell apart, and its lighter one all but
 * disappears on a light theme's background.
 */
const COLORS = { scheme: 'category10' } as const;

const LEGEND = {
  anchor: 'right' as const,
  direction: 'column' as const,
  translateX: 120,
  itemWidth: 100,
  itemHeight: 20,
  symbolSize: 12,
};

const LINE_LEGENDS = [LEGEND];
/** a bar legend names the series, which nivo calls the keys */
const BAR_LEGENDS = [{ ...LEGEND, dataFrom: 'keys' as const }];

function ChartPanel({
  result,
  fields,
  rowsAsArray = false,
}: ChartPanelProps): ReactElement | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const [config, setConfig] = useState<ChartConfig | null>(() =>
    defaultChartConfig(fields)
  );

  const chartTheme = useMemo(() => buildChartTheme(theme), [theme]);

  const columnOptions = useMemo(
    () =>
      fields.map((field, index) => ({ value: index, label: field.name ?? '' })),
    [fields]
  );

  const numericOptions = useMemo(
    () =>
      numericFieldIndexes(fields).map((index) => ({
        value: index,
        label: fields[index].name ?? '',
      })),
    [fields]
  );

  const rendered = useMemo(() => {
    if (!config) {
      return null;
    }

    const input = { rows: result, fields, config, rowsAsArray };

    return config.kind === 'line'
      ? { kind: 'line' as const, ...toLineSeries(input) }
      : { kind: 'bar' as const, ...toBarData(input) };
  }, [result, fields, config, rowsAsArray]);

  // `chartUnavailableReason` already gated the tab, so this is only reachable
  // while the user is between two selections
  if (!config || !rendered) {
    return null;
  }

  const axisBottom = {
    tickRotation: -45,
    legend: fields[config.x]?.name ?? '',
    legendOffset: 60,
    legendPosition: 'middle' as const,
  };

  return (
    <Flex vertical gap="small" style={{ height: '100%', minHeight: 0 }}>
      <Space wrap>
        <Select<ChartKind>
          value={config.kind}
          onChange={(kind) => setConfig({ ...config, kind })}
          options={[
            { value: 'line', label: t('chart.kind.line') },
            { value: 'bar', label: t('chart.kind.bar') },
          ]}
          style={{ width: 120 }}
        />
        <Select<number>
          value={config.x}
          onChange={(x) =>
            setConfig({ ...config, x, y: config.y.filter((y) => y !== x) })
          }
          options={columnOptions}
          style={{ minWidth: 160 }}
          title={t('chart.axis.x')}
        />
        <Select<Array<number>>
          mode="multiple"
          value={config.y}
          onChange={(y) => setConfig({ ...config, y })}
          options={numericOptions}
          placeholder={t('chart.axis.y')}
          style={{ minWidth: 220 }}
        />
      </Space>

      {rendered.isTruncated && (
        <Alert
          type="warning"
          showIcon
          message={t('chart.truncated', { count: MAX_POINTS })}
        />
      )}

      <ChartArea>
        {rendered.kind === 'line' ? (
          <ResponsiveLine
            data={rendered.series}
            theme={chartTheme}
            margin={MARGIN}
            colors={COLORS}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', stacked: false }}
            axisBottom={axisBottom}
            enablePoints={rendered.series[0]?.data.length <= 60}
            useMesh
            animate={false}
            legends={LINE_LEGENDS}
          />
        ) : (
          <ResponsiveBar
            data={rendered.data}
            keys={rendered.keys}
            indexBy={rendered.indexBy}
            theme={chartTheme}
            margin={MARGIN}
            colors={COLORS}
            groupMode="grouped"
            axisBottom={axisBottom}
            animate={false}
            legends={BAR_LEGENDS}
          />
        )}
      </ChartArea>
    </Flex>
  );
}

export default ChartPanel;
