import { styled } from 'styled-components';
import { display, displayWeight } from '../../theme';

/** The word on a solid block — Run, Save and connect: the display face, in caps. */
export const ActionLabel = styled.span`
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;
