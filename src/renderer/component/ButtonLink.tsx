import { MouseEvent, Ref, forwardRef } from 'react';
import { Button } from 'antd';
import { BaseButtonProps } from 'antd/es/button/button';
import { LinkProps, useHref, useLinkClickHandler } from 'react-router-dom';

type Props = LinkProps & BaseButtonProps;

/**
 * A bridge between antd Button and react-router-dom Link.
 *
 * Taken from https://reactrouter.com/en/main/upgrading/v5#remove-link-component-prop
 */
const ButtonLink = forwardRef(
  (
    { onClick, replace = false, state, target, to, ...rest }: Props,
    ref: Ref<HTMLElement>
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
