import { type ReactElement } from 'react';
import { Segmented, type SegmentedProps } from 'antd';
import { styled } from 'styled-components';
import { selection } from '../../theme';

/** Ours, given to the labels through antd's semantic `classNames`: its own classes are private. */
const LABEL_CLASS = 'region-segmented-label';

// antd's `:where(…)` rules have no specificity, so `&&` wins without `!important`;
// the cast gives back the generic of `Segmented`, which `styled()` drops
const Frame = styled(Segmented)`
  && {
    border: 1px solid ${selection};
  }

  && .${LABEL_CLASS} {
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
` as unknown as typeof Segmented;

/**
 * The antd `Segmented` of a region header, at the right of it: the flat track and the filled segment
 * are its tokens (`ThemeContext`), the hairline frame and the caps are set here.
 */
export function RegionSegmented<Value>(
  props: Omit<SegmentedProps<Value>, 'size' | 'classNames' | 'styles'>
): ReactElement {
  return (
    <Frame<Value> {...props} size="small" classNames={{ label: LABEL_CLASS }} />
  );
}
