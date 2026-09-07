import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { styled } from 'styled-components';
import { display, displayWeight } from '../../theme';

const Solid = styled(Button)`
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

/**
 * The one solid block of a region — Run, Filter, Save and connect: the accent
 * fill from the tokens, the word in the display face, in caps.
 */
export function ActionButton(props: ButtonProps) {
  return <Solid color="primary" variant="solid" {...props} />;
}
