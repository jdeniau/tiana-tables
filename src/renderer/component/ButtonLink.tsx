import { MouseEvent, Ref, forwardRef } from 'react';
import { Button, type ButtonProps } from 'antd';
import { LinkProps, useHref, useLinkClickHandler } from 'react-router-dom';

type Props = LinkProps & Omit<ButtonProps, 'href' | 'onClick'>;

/**
 * A bridge between antd Button and react-router-dom Link.
 *
 * Taken from https://reactrouter.com/en/main/upgrading/v5#remove-link-component-prop
 */
const ButtonLink = forwardRef(
  (
    { onClick, replace = false, state, target, to, ...rest }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
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
);

ButtonLink.displayName = 'ButtonLink';

export default ButtonLink;
