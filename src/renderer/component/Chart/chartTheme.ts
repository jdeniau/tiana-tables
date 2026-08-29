import type { PartialTheme } from '@nivo/theming';
import type { AppTheme } from '../../../configuration/themes';
import {
  backgroundAlt,
  commentForeground,
  foreground,
  mutedForeground,
} from '../../theme';

/**
 * The chrome of a chart — axes, ticks, grid, legend, tooltip.
 *
 * Series colors are deliberately **not** themed: they keep a nivo scheme. The
 * base16 accent slots are semantic rather than chromatic, and some themes reuse
 * one colour across two of them (Dracula has `base0A === base0C`), which would
 * draw two series in the same colour.
 *
 * The chrome is another matter: nivo's default theme paints it dark on a
 * transparent ground, so on a dark app theme the axes simply vanish.
 */
export function buildChartTheme(theme: AppTheme): PartialTheme {
  const props = { theme };

  return {
    text: { fill: foreground(props) },
    axis: {
      domain: { line: { stroke: commentForeground(props) } },
      ticks: {
        line: { stroke: commentForeground(props) },
        text: { fill: mutedForeground(props) },
      },
      legend: { text: { fill: foreground(props) } },
    },
    grid: { line: { stroke: commentForeground(props), strokeOpacity: 0.4 } },
    legends: { text: { fill: foreground(props) } },
    tooltip: {
      container: {
        background: backgroundAlt(props),
        color: foreground(props),
      },
    },
  };
}
