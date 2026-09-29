import { Layout } from 'antd';
import { Link } from 'react-router-dom';
import { css, styled } from 'styled-components';
import { brand, fontSize, frame, space } from '../../theme';
import { ConnectionTint } from '../../theme/connectionTint';

/**
 * The title bar of the shell: its height comes from the antd `Layout` tokens,
 * the rule under it is the one structural device. The brand, the menu and the
 * connections sit left, the SQL toggle right, nothing in the middle.
 *
 * `$tint` is the colour of the current connection, if it has one: it re-points
 * the frame colours for this element and its descendants, which is what paints
 * the fill and turns everything in the bar light or dark.
 */
export const TitleBar = styled(Layout.Header)<{ $tint?: ConnectionTint }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.lg};
  border-bottom: 1px solid ${frame.muted};

  ${({ $tint }) =>
    $tint &&
    css`
      --frame-bg: ${$tint.background};
      --frame-text: ${$tint.text};
      --frame-muted: ${$tint.muted};
      --frame-emphasis: ${$tint.text};
      --frame-accent: ${$tint.text};
    `}

  /* The fill and the inherited text colour are read here, where the tint is
     declared: antd would resolve them on the Layout element above, since that
     is where it declares its own variables. The doubled class is what gives
     these two declarations the weight to outrank antd's header rule. */
  && {
    background: ${frame.background};
    color: ${frame.text};
    /* the window controls sit over the bar: left on macOS, right elsewhere */
    padding-inline-start: calc(${space.md} + env(titlebar-area-x, 0px));
    padding-inline-end: calc(
      ${space.md} +
        100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw)
    );
  }

  /* the bar moves the window, what can be clicked in it does not */
  -webkit-app-region: drag;

  & a,
  & button {
    -webkit-app-region: no-drag;
  }
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md};
  min-width: 0;
`;

/** The software name and the mark that rides on it, tight against each other. */
export const BrandGroup = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${space.xs};
`;

/** the software name, in its own face, mixed case */
export const Brand = styled(Link)`
  flex: none;
  font-family: ${brand};
  font-size: 17px;
  line-height: 1;
  color: ${frame.emphasis};
  text-decoration: none;

  &:hover {
    color: ${frame.emphasis};
  }
`;

/** says the app runs from the sources, next to the software name */
export const DevModeMark = styled.span`
  flex: none;
  font-size: ${fontSize.sm};
  color: ${frame.muted};
  white-space: nowrap;
`;
