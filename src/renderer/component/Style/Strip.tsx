import { ComponentPropsWithRef } from 'react';
import { css, styled } from 'styled-components';
import {
  accent,
  commentForeground,
  emphasisForeground,
  space,
  variableForeground,
} from '../../theme';

/** the square before an active item — the one selection motif of the frame */
const PIP = '6px';

/**
 * A run of sibling items — statement tabs, connections — separated by a 1px
 * rule, never by whitespace alone. Every item shrinks the same way, so three
 * items degrade to three ellipses rather than to two full tabs and a bare
 * separator. The right gutter keeps the run off whatever follows it.
 */
export const Strip = styled.div<{ $caps?: boolean }>`
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  margin-inline-end: ${space.xl};
  font-size: 11px;

  ${({ $caps }) =>
    $caps &&
    css`
      text-transform: uppercase;
      letter-spacing: 0.06em;
    `}
`;

const Item = styled.button<{ $active: boolean; $failed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${PIP};
  flex: 0 1 auto;
  min-width: 44px;
  padding: 0 ${space.md};
  border: 0;
  background: none;
  font: inherit;
  /* a button does not inherit these from its run, its UA style resets them */
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  color: ${(props) =>
    props.$failed
      ? variableForeground(props)
      : props.$active
        ? emphasisForeground(props)
        : commentForeground(props)};

  & + & {
    border-inline-start: 1px solid ${commentForeground};
  }

  &:first-child {
    padding-inline-start: 0;
  }

  &:focus-visible {
    outline: 1px solid ${accent};
  }
`;

const Pip = styled.span`
  flex: none;
  width: ${PIP};
  height: ${PIP};
  background: ${accent};
`;

const Label = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type StripItemProps = ComponentPropsWithRef<'button'> & {
  active: boolean;
  /** a failed statement keeps its place in the run, in the error colour */
  failed?: boolean;
};

/** the rest of the props reach the button, so a `Tooltip` can wrap an item */
export function StripItem({
  active,
  failed = false,
  children,
  ...rest
}: StripItemProps) {
  return (
    <Item
      type="button"
      aria-current={active || undefined}
      {...rest}
      $active={active}
      $failed={failed}
    >
      {active && <Pip />}
      <Label>{children}</Label>
    </Item>
  );
}
