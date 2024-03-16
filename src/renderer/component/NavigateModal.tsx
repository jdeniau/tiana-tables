import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Flex, Input, InputRef, List, Modal, Spin } from 'antd';
import Fuse from 'fuse.js';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useTranslation } from '../../i18n';
import {
  TableStatusRow,
  useTableStatusList,
} from '../hooks/sql/useTableStatusList';
import { getSetting } from '../theme';

type Props = {
  isNavigateModalOpen: boolean;
  setIsNavigateModalOpen: (isOpened: boolean) => void;
};

export default function NavigateModal({
  isNavigateModalOpen,
  setIsNavigateModalOpen,
}: Props): ReactElement {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const tableStatusList = useTableStatusList();
  const { currentConnectionName } = useConnectionContext();
  const { database } = useDatabaseContext();
  const navigate = useNavigate();
  const searchRef = useRef<InputRef>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  let filteredTableStatusList = tableStatusList;

  if (searchText) {
    const fuze = new Fuse(tableStatusList ?? [], {
      keys: ['Name'],
      threshold: 0.4,
    });

    filteredTableStatusList = fuze.search(searchText).map((item) => item.item);
  }

  const navigateToItem = useCallback(
    (item: TableStatusRow) => {
      setIsNavigateModalOpen(false);
      navigate(
        `/connections/${currentConnectionName}/${database}/tables/${item.Name}`
      );
    },
    [currentConnectionName, database, navigate, setIsNavigateModalOpen]
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
    >
      <Flex vertical gap="small">
        <Input.Search
          ref={searchRef}
          placeholder={t('navigation_modal.search.placeholder')}
          value={searchText}
          onChange={(e) => {
            resetActiveIndex(!e.target.value);
            setSearchText(e.target.value);
          }}
        />

        {!filteredTableStatusList ? (
          // display loader
          <Flex justify="center">
            <Spin />
          </Flex>
        ) : (
          <List
            bordered
            dataSource={filteredTableStatusList}
            renderItem={(item: TableStatusRow, index: number) => (
              <ItemListWithHover
                key={item.Name}
                $active={index === activeIndex}
                onClick={() => {
                  navigateToItem(item);
                }}
              >
                {item.Name}
              </ItemListWithHover>
            )}
          />
        )}
      </Flex>
    </Modal>
  );
}

const ItemListWithHover = styled(List.Item)<{ $active: boolean }>`
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => getSetting(theme, 'selection')};
  }

  ${({ $active, theme }) =>
    $active ? `background-color: ${getSetting(theme, 'selection')};` : ''}
`;