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
 * A region of the workspace, as DESIGN.md rule 3 has it: named in condensed
 * caps inside its own header row, with no fill of its own. The rule between
 * two regions is drawn by whatever stacks them — the `Splitter` bar on the SQL
 * and table pages — so that it is never doubled.
 */
export const Region = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

export const RegionHeader = styled.header`
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md};
  height: ${size.regionHeader};
  padding: 0 ${space.md};
`;

/** the name and its meta on one side, the controls on the other */
export const RegionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  min-width: 0;
`;

export const RegionName = styled.h2`
  flex: none;
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
  flex: none;
  font-size: 11px;
  color: ${commentForeground};
  white-space: nowrap;
`;

export const RegionBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: ${selection} ${background};
`;

/** A 24px row under the body: a row count, a "load more" */
export const RegionFoot = styled.footer`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${space.sm};
  height: ${size.control};
  padding: 0 ${space.md};
  border-top: 1px solid ${commentForeground};
  font-size: 11px;
  color: ${commentForeground};
`;
