import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';
import {
  accent,
  background,
  fontSize,
  foreground,
  mutedForeground,
  selection,
  size,
  space,
} from '../../theme';

/**
 * The switch between two views of one result region: the run of segments that
 * sits at the right of the region header, framed, the current one filled.
 *
 * It is the antd `Segmented` of the SQL page's Data / Chart switch, in links —
 * the two views of a table are two routes, and a navigation is a link. The
 * values are the ones the `Segmented` tokens carry in `ThemeContext` (a
 * transparent track framed by a `base02` hairline, the current segment filled
 * with `base04` on the background colour), so both switches read alike.
 */
export const ViewSwitch = styled.nav`
  display: inline-flex;
  flex: none;
  border: 1px solid ${selection};
  font-size: ${fontSize.sm};
`;

/**
 * One segment. `NavLink` fills the one the location is on — `end` where a
 * longer path nests under the destination, or the shorter one stays filled on
 * the longer one's page.
 */
export const ViewSwitchLink = styled(NavLink)`
  display: flex;
  flex: none;
  align-items: center;
  height: ${size.segment};
  padding: 0 ${space.sm};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-decoration: none;
  color: ${mutedForeground};

  &:hover {
    color: ${foreground};
    text-decoration: none;
  }

  /* the class NavLink adds itself once the location matches its own
     destination; it comes after the hover, so the filled segment keeps its
     text colour under the pointer */
  &.active {
    background: ${mutedForeground};
    color: ${background};
  }

  &:focus-visible {
    outline: 1px solid ${accent};
  }
`;
