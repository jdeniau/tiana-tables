import { MouseEvent, ReactElement, Ref } from 'react';
import { Button, type ButtonProps } from 'antd';
import { LinkProps, useHref, useLinkClickHandler } from 'react-router-dom';

type Props = LinkProps &
  Omit<ButtonProps, 'href' | 'onClick'> & { ref?: Ref<HTMLButtonElement> };

/**
 * A bridge between antd Button and react-router-dom Link.
 *
 * Taken from https://reactrouter.com/en/main/upgrading/v5#remove-link-component-prop
 */
export default function ButtonLink({
  onClick,
  replace = false,
  state,
  target,
  to,
  ref,
  ...rest
}: Props): ReactElement {
  const href = useHref(to);
  const handleClick = useLinkClickHandler(to, {
    replace,
    state,
    target,
  });

  return (
    <Button
      {...rest}
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          handleClick(event);
        }
      }}
      ref={ref}
      target={target}
    />
  );
}
