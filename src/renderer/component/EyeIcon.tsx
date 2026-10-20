import type { ReactElement } from 'react';
import { styled } from 'styled-components';
import { space } from '../theme';

const Svg = styled.svg`
  display: block;
  width: ${space.lg};
  height: ${space.lg};
`;

/** An open eye, stroked in the text colour. */
export default function EyeIcon(): ReactElement {
  return (
    <Svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden
    >
      <path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z" />
      <circle cx="7" cy="7" r="1.8" />
    </Svg>
  );
}
