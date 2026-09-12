import { ComponentPropsWithRef, ReactNode, RefAttributes } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { css, styled } from 'styled-components';
import { fontSize, frame, size, space, variableForeground } from '../../theme';

/** the square before an active item — the one selection motif of the frame */
const PIP = '6px';

/**
 * A run of sibling items — statement tabs, connections — separated by a 1px
 * rule, never by whitespace alone. Every item shrinks the same way, so three
 * items degrade to three ellipses rather than to two full tabs and a bare
 * separator. The owner adds the gutter that keeps the run off what follows.
 */
export const TabStrip = styled.div<{
  $caps?: boolean;
  $framed?: boolean;
  $scroll?: boolean;
}>`
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  font-size: ${fontSize.sm};

  /* The rule sits between the children of the run, whatever they are: a bare link, a button, or a tab holding a close button.
     The doubled class outweighs the border reset each item does on itself — same specificity, and the item's class comes after. */
  && > * + * {
    border-inline-start: 1px solid ${frame.muted};
  }

  && > :first-child {
    padding-inline-start: 0;
  }

  /* Past the floor every item has, the run scrolls rather than shrink further.
     No scrollbar: Chromium draws it rounded and with arrow buttons, and it takes a third of a 32px row. */
  ${({ $scroll }) =>
    $scroll &&
    css`
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    `}

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
      &&& > :first-child {
        padding-inline-start: ${space.md};
        border-inline-start: 1px solid ${frame.muted};
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
        ? frame.emphasis
        : frame.muted};

  &:focus-visible {
    outline: 1px solid ${frame.accent};
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
  background: ${frame.accent};
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

/** The close affordance: it holds its place at all times, or the run would shift under the pointer. */
const Close = styled.button`
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: ${size.segment};
  height: ${size.segment};
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  opacity: 0;

  &:hover {
    color: ${frame.emphasis};
  }

  &:focus-visible {
    opacity: 1;
    outline: 1px solid ${frame.accent};
  }
`;

/** the tab itself is not the link: the close button could not live inside an `<a>` */
const ClosableItem = styled.div<ItemProps>`
  ${item}
  /* the 44px floor of a bare item leaves a closable tab one character between its padding and its cross */
  min-width: 96px;
  padding-inline-end: ${space.xs};
  cursor: default;

  &:hover ${Close} {
    opacity: 1;
  }

  ${({ $active }) =>
    $active &&
    css`
      ${Close} {
        opacity: 1;
      }
    `}
`;

const TabLink = styled(Link)`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: ${PIP};
  min-width: 0;
  color: inherit;
  text-decoration: none;

  &:hover {
    color: inherit;
    text-decoration: none;
  }
`;

const TabLabel = styled(Label)<{ $preview: boolean }>`
  font-style: ${({ $preview }) => ($preview ? 'italic' : 'normal')};
`;

/** An item that navigates and can be closed; the middle button closes it too. */
export function TabStripClosableLink({
  active,
  preview = false,
  failed = false,
  children,
  to,
  onClose,
  closeLabel,
  ...rest
}: CommonProps &
  ComponentPropsWithRef<'div'> & {
    /** a temporary tab, replaced by the next table opened with a single click */
    preview?: boolean;
    to: LinkProps['to'];
    onClose(): void;
    closeLabel: string;
  }) {
  return (
    <ClosableItem
      {...rest}
      $active={active}
      $failed={failed}
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <TabLink to={to} aria-current={active ? 'page' : undefined}>
        {active && <Pip />}
        <TabLabel $preview={preview}>{children}</TabLabel>
      </TabLink>

      <Close
        type="button"
        aria-label={closeLabel}
        title={closeLabel}
        onClick={onClose}
      >
        ×
      </Close>
    </ClosableItem>
  );
}
