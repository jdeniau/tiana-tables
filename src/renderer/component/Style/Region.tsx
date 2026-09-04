import { styled } from 'styled-components';
import {
  background,
  commentForeground,
  display,
  displayWeight,
  emphasisForeground,
  selection,
  size,
  space,
} from '../../theme';

/**
 * A region of the workspace, as DESIGN.md rule 3 has it: bounded by a 1px
 * rule, named in condensed caps inside its own header row. No fill of its own
 * — structure rides on the line, whatever the palette.
 */
export const Region = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid ${commentForeground};
`;

export const RegionHeader = styled.header`
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: ${space.sm};
  height: ${size.regionHeader};
  padding: 0 ${space.md};
`;

export const RegionName = styled.h2`
  margin: 0;
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${emphasisForeground};
`;

/** The meta text of a header row: a statement count, `14 rows · 42 ms` */
export const RegionMeta = styled.span`
  font-size: 11px;
  color: ${commentForeground};
`;

export const RegionBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: ${selection} ${background};
`;
