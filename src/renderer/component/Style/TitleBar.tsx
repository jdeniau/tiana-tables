import { Layout } from 'antd';
import { Link } from 'react-router-dom';
import { css, styled } from 'styled-components';
import { brand, frame, space } from '../../theme';
import { ConnectionTint } from '../../theme/connectionTint';

/**
 * The title bar of the shell: its height and padding come from the antd
 * `Layout` tokens, the rule under it is the one structural device. The brand,
 * the settings and the connections sit left, the SQL toggle right, nothing in
 * the middle.
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
  }
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
  color: ${frame.emphasis};
  text-decoration: none;

  &:hover {
    color: ${frame.emphasis};
  }
`;
