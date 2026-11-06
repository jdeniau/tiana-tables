import { styled } from 'styled-components';
import { commentForeground } from '../../theme';

/** The fixed part of a clause, before the value typed in a field: muted, so it reads apart from it. */
export const ClausePrefix = styled.span`
  color: ${commentForeground};
  white-space: nowrap;
`;
