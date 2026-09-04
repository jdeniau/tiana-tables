import { Button, Layout } from 'antd';
import { Link } from 'react-router-dom';
import { css, styled } from 'styled-components';
import {
  commentForeground,
  display,
  displayWeight,
  emphasisForeground,
  foreground,
  space,
} from '../../theme';
import ButtonLink from '../ButtonLink';

/**
 * The title bar of the shell: its height, padding and background come from
 * the antd `Layout` tokens, the rule under it is the one structural device.
 * The brand and the connections sit left, the actions right, nothing in the
 * middle.
 */
export const TitleBar = styled(Layout.Header)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.lg};
  border-bottom: 1px solid ${commentForeground};
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.lg};
  min-width: 0;
`;

/** the software name, in the display face, mixed case */
export const Brand = styled(Link)`
  flex: none;
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 17px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: ${emphasisForeground};
  text-decoration: none;

  &:hover {
    color: ${emphasisForeground};
  }
`;

/** an action of the title bar: one word in 11px caps, muted until hovered */
const titleAction = css`
  &&& {
    height: auto;
    padding: 0;
    background: transparent;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${commentForeground};
  }

  &&&:hover {
    color: ${foreground};
  }
`;

export const TitleAction = styled(Button)`
  ${titleAction}
`;

export const TitleActionLink = styled(ButtonLink)`
  ${titleAction}
`;
