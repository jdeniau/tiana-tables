import { ComponentPropsWithRef, ReactNode, RefAttributes } from 'react';
import { Link, LinkProps } from 'react-router-dom';
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
 * separator. The owner adds the gutter that keeps the run off what follows.
 */
export const TabStrip = styled.div<{ $caps?: boolean; $framed?: boolean }>`
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;

  ${({ $caps }) =>
    $caps &&
    css`
      text-transform: uppercase;
      letter-spacing: 0.06em;
    `}

  /* a rule before the first item too, when the run follows something else */
  ${({ $framed }) =>
    $framed &&
    css`
      && > :first-child {
        padding-inline-start: ${space.md};
        border-inline-start: 1px solid ${commentForeground};
      }
    `}
`;

type ItemProps = { $active: boolean; $failed: boolean };

const item = css<ItemProps>`
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

const ItemButton = styled.button<ItemProps>`
  ${item}
`;

/** a navigation is a link, even in a desktop app: it keeps the router's semantics */
const ItemLink = styled(Link)<ItemProps>`
  ${item}
  text-decoration: none;

  &:hover {
    text-decoration: none;
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

type CommonProps = {
  active: boolean;
  /** a failed statement keeps its place in the run, in the error colour */
  failed?: boolean;
  children: ReactNode;
};

function Content({
  active,
  children,
}: Pick<CommonProps, 'active' | 'children'>) {
  return (
    <>
      {active && <Pip />}
      <Label>{children}</Label>
    </>
  );
}

/** An item that acts: the rest of the props reach the button, so a `Tooltip` can wrap it. */
export function TabStripItem({
  active,
  failed = false,
  children,
  ...rest
}: CommonProps & ComponentPropsWithRef<'button'>) {
  return (
    <ItemButton
      type="button"
      aria-current={active || undefined}
      {...rest}
      $active={active}
      $failed={failed}
    >
      <Content active={active}>{children}</Content>
    </ItemButton>
  );
}

/** An item that navigates: a router `Link`, so the destination is a real one. */
export function TabStripLink({
  active,
  failed = false,
  children,
  ...rest
}: CommonProps & LinkProps & RefAttributes<HTMLAnchorElement>) {
  return (
    <ItemLink
      aria-current={active ? 'page' : undefined}
      {...rest}
      $active={active}
      $failed={failed}
    >
      <Content active={active}>{children}</Content>
    </ItemLink>
  );
}
