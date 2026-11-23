import { ReactElement, RefObject, useEffect, useRef, useState } from 'react';
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Input, InputRef } from 'antd';
import { flushSync } from 'react-dom';
import { createGlobalStyle, styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import {
  background,
  commentForeground,
  fontSize,
  searchBackground,
  size,
  space,
} from '../../theme';
import { findInFocusedEditor } from '../MonacoEditor/findInFocusedEditor';
import {
  FindHighlight,
  FoundInPage,
  NOTHING_FOUND,
  PageFinder,
  createPageFinder,
} from './pageFinder';

const Bar = styled.div`
  position: fixed;
  top: calc(${size.titleBar} + ${space.sm});
  right: ${space.md};
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${space.xs};
  padding: ${space.xs};
  background: ${background};
  border: 1px solid ${commentForeground};
`;

const Count = styled.span`
  min-width: 10ch;
  font-size: ${fontSize.sm};
  color: ${commentForeground};
  text-align: end;
`;

const HighlightStyle = createGlobalStyle<object>`
  ::highlight(${FindHighlight.Match}) {
    background-color: color-mix(in srgb, ${searchBackground} 40%, ${background});
  }

  ::highlight(${FindHighlight.Active}) {
    background-color: ${searchBackground};
    color: ${background};
  }
`;

// a button never takes the focus: the search goes on from where it left off
const keepFocus = (event: { preventDefault: () => void }) =>
  event.preventDefault();

function usePageFinder(
  bar: RefObject<HTMLElement | null>
): FoundInPage & PageFinder {
  const [found, setFound] = useState(NOTHING_FOUND);
  const [finder] = useState(() =>
    createPageFinder(() => bar.current, setFound)
  );

  useEffect(() => finder.clear, [finder]);

  return { ...found, ...finder };
}

/** Ctrl/Cmd+F or the Edit menu's Find, outside the SQL editor: finds a text in what the page shows. */
export default function FindBar(): ReactElement | null {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const { matches, active, find, next, previous, clear } =
    usePageFinder(barRef);

  useEffect(() => {
    const show = () => {
      flushSync(() => setOpen(true));
      inputRef.current?.focus({ cursor: 'all' });

      // reopened on the text it was closed on
      if (!open) {
        find(text);
      }
    };

    // Monaco stops the propagation of its own Ctrl+F: the key never bubbles here from the editor
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'f' &&
        !event.defaultPrevented
      ) {
        event.preventDefault();
        show();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const unsubscribe = window.editMenu.onFind(() => {
      if (!findInFocusedEditor()) {
        show();
      }
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unsubscribe();
    };
  }, [open, text, find]);

  const close = () => {
    clear();
    setOpen(false);
  };

  if (!open) {
    return null;
  }

  return (
    <Bar ref={barRef}>
      <HighlightStyle />
      <Input
        ref={inputRef}
        size="small"
        placeholder={t('findBar.placeholder')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          find(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();

            if (event.shiftKey) {
              previous();
            } else {
              next();
            }
          } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
      />
      <Count>
        {text &&
          t('findBar.count', {
            active: active + 1,
            matches,
          })}
      </Count>
      <Button
        type="text"
        size="small"
        icon={<UpOutlined />}
        title={t('findBar.previous')}
        onMouseDown={keepFocus}
        onClick={previous}
      />
      <Button
        type="text"
        size="small"
        icon={<DownOutlined />}
        title={t('findBar.next')}
        onMouseDown={keepFocus}
        onClick={next}
      />
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        title={t('findBar.close')}
        onMouseDown={keepFocus}
        onClick={close}
      />
    </Bar>
  );
}
