import {
  DEFAULT_PANEL_SIZES,
  MAX_PANEL_PERCENT,
  MIN_PANEL_SIZES,
  PANEL,
  formatPanelSize,
  parsePanelSize,
} from '../../configuration/panels';
import { useConfiguration } from '../../contexts/ConfigurationContext';

type SplitterPanelProps = {
  defaultSize: number | string;
  min: number;
  max: string;
};

/** Where the remembered panel sits among the panels of its `Splitter`. */
export enum PanelPosition {
  First = 'first',
  Last = 'last',
}

type PanelSize = {
  /** to spread on the `Splitter.Panel` whose size is remembered */
  panelProps: SplitterPanelProps;
  /** to pass to the `Splitter` owning that panel */
  onResizeEnd: (sizes: Array<number>) => void;
};

/**
 * Remembers the size of a resizable panel in the configuration.
 *
 * The size is stored as a **percentage of its splitter**, never in pixels: a
 * pixel size dragged on a wide screen and replayed on a narrow one can exceed
 * the container, and antd then scales the panel to the whole splitter and
 * leaves nothing for its sibling. A ratio cannot overflow, and it keeps the
 * layout the user chose whatever the window size.
 *
 * `max` bounds the drag itself — antd honours it while resizing, but not when
 * seeding a panel at mount, which is why the stored value is validated too.
 *
 * The panel stays uncontrolled while dragging: antd owns the size until the
 * drag ends, so moving the mouse does not re-render the whole tree.
 */
export function usePanelSize(
  panel: PANEL,
  position: PanelPosition = PanelPosition.First
): PanelSize {
  const { configuration, setPanelSize } = useConfiguration();
  const storedSize = parsePanelSize(configuration.panelSizes?.[panel]);

  const onResizeEnd = (sizes: Array<number>) => {
    const size = position === PanelPosition.Last ? sizes.at(-1) : sizes[0];
    // the panel sizes add up to the splitter itself, so their sum is the
    // container to compare against
    const total = sizes.reduce((sum, current) => sum + current, 0);

    if (size === undefined || total <= 0) {
      return;
    }

    setPanelSize(panel, formatPanelSize((size / total) * 100));
  };

  return {
    panelProps: {
      // pixels on the very first run only, when nothing was ever dragged
      defaultSize: storedSize ?? DEFAULT_PANEL_SIZES[panel],
      min: MIN_PANEL_SIZES[panel],
      max: `${MAX_PANEL_PERCENT}%`,
    },
    onResizeEnd,
  };
}
