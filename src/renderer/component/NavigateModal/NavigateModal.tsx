import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Flex, Input, InputRef, List, Modal } from 'antd';
import Fuse from 'fuse.js';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { selection } from '../../theme';

export type NavigationItem = {
  key: string;
  name: string;
  link: string;
  Icon: React.ElementType;
};

type Props = {
  isNavigateModalOpen: boolean;
  setIsNavigateModalOpen: (isOpened: boolean) => void;
  navigationItemList: Array<NavigationItem>;
};

export default function NavigateModal({
  isNavigateModalOpen,
  setIsNavigateModalOpen,
  navigationItemList,
}: Props): ReactElement {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();
  const searchRef = useRef<InputRef>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  let filteredTableStatusList = navigationItemList;

  if (searchText) {
    const fuze = new Fuse(navigationItemList, {
      keys: ['name'],
      threshold: 0.4,
    });

    filteredTableStatusList = fuze.search(searchText).map((item) => item.item);
  }

  const navigateToItem = useCallback(
    (item: NavigationItem) => {
      setIsNavigateModalOpen(false);

      navigate(item.link);
    },
    [navigate, setIsNavigateModalOpen]
  );

  // focus input when the modal shows up
  useEffect(() => {
    if (isNavigateModalOpen) {
      searchRef.current?.focus();
    }
  }, [isNavigateModalOpen]);

  // handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!filteredTableStatusList) {
        return;
      }

      const filteredTableStatusListLength = filteredTableStatusList.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();

        setActiveIndex((prev) =>
          Math.min(prev + 1, filteredTableStatusListLength - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();

        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter') {
        if (activeIndex !== -1) {
          navigateToItem(filteredTableStatusList[activeIndex]);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeIndex,
    filteredTableStatusList,
    navigate,
    navigateToItem,
    setIsNavigateModalOpen,
  ]);

  const resetActiveIndex = (searchIsEmpty: boolean) => {
    // if search is empty, then reset to no value selected, if not, then activate the first item
    setActiveIndex(searchIsEmpty ? -1 : 0);
  };

  return (
    <Modal
      title={t('navigation_modal.title')}
      open={isNavigateModalOpen}
      onCancel={() => {
        setIsNavigateModalOpen(false);
      }}
      footer={null}
      width={800}
      style={{
        // do not overflow the viewport, and keep 100px of padding
        top: '100px', // this is the default, but do keep this in case antd change it's default value
        maxHeight: 'calc(100vh - 200px)',
        overflow: 'hidden',
      }}
    >
      <Flex
        vertical
        gap="small" // do not overflow the viewport
        style={{
          maxHeight: 'min(calc(100vh - 250px), 600px)', // max 600 px, but can not be bigger than the height minus 250px
          overflow: 'hidden', // Enable scroll if content exceeds the max height
        }}
      >
        <Input.Search
          ref={searchRef}
          placeholder={t('navigation_modal.search.placeholder')}
          value={searchText}
          onChange={(e) => {
            resetActiveIndex(!e.target.value);
            setSearchText(e.target.value);
          }}
        />

        <List
          style={{ overflow: 'auto' }}
          bordered
          dataSource={filteredTableStatusList}
          renderItem={(item: NavigationItem, index: number) => (
            <ItemListWithHover
              key={item.key}
              $active={index === activeIndex}
              onClick={() => {
                navigateToItem(item);
              }}
            >
              <item.Icon /> {item.name}
            </ItemListWithHover>
          )}
        />
      </Flex>
    </Modal>
  );
}

const ItemListWithHover = styled(List.Item)<{
  $active: boolean;
}>`
  cursor: pointer;

  &:hover {
    background-color: ${selection};
  }

  ${({ $active, theme }) =>
    $active ? `background-color: ${selection({ theme })};` : ''}
`;
