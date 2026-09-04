import { Button, Layout } from 'antd';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import {
  brand,
  commentForeground,
  emphasisForeground,
  foreground,
  space,
} from '../../theme';

/**
 * The title bar of the shell: its height, padding and background come from
 * the antd `Layout` tokens, the rule under it is the one structural device.
 * The brand, the settings and the connections sit left, the SQL toggle right,
 * nothing in the middle.
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
  gap: ${space.md};
  min-width: 0;
`;

/** the software name, in its own face, mixed case */
export const Brand = styled(Link)`
  flex: none;
  font-family: ${brand};
  font-size: 17px;
  line-height: 1;
  color: ${emphasisForeground};
  text-decoration: none;

  &:hover {
    color: ${emphasisForeground};
  }
`;

/** an icon action of the title bar, muted until hovered */
export const TitleIcon = styled(Button)`
  &&& {
    height: auto;
    padding: 0;
    background: transparent;
    font-size: 13px;
    color: ${commentForeground};
  }

  &&&:hover {
    color: ${foreground};
  }
`;
