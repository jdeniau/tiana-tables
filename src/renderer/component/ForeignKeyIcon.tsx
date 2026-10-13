import type { ReactElement } from 'react';
import { styled } from 'styled-components';
import { space } from '../theme';

const Svg = styled.svg`
  display: block;
  width: ${space.lg};
  height: ${space.lg};
`;

/** An arrow leaving the cell, stroked in the text colour. */
export default function ForeignKeyIcon(): ReactElement {
  return (
    <Svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </Svg>
  );
}
