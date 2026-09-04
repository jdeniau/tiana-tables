import { ReactNode } from 'react';
import { styled } from 'styled-components';
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
export const Strip = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  margin-inline-end: ${space.xl};
  font-size: 11px;
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

type StripItemProps = {
  active: boolean;
  /** a failed statement keeps its place in the run, in the error colour */
  failed?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
};

export function StripItem({
  active,
  failed = false,
  title,
  onClick,
  children,
}: StripItemProps) {
  return (
    <Item
      type="button"
      $active={active}
      $failed={failed}
      title={title}
      aria-current={active || undefined}
      onClick={onClick}
    >
      {active && <Pip />}
      <Label>{children}</Label>
    </Item>
  );
}
