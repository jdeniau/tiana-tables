import { ReactElement, useEffect, useRef, useState } from 'react';
import { Flex, Input, InputRef, List, Modal, Spin } from 'antd';
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

  const filteredTableStatusList = tableStatusList?.filter(
    (item) =>
      !searchText || item.Name.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    if (isNavigateModalOpen) {
      searchRef.current?.focus();
    }
  }, [isNavigateModalOpen]);

  return (
    <Modal
      title={t('navigation_modal.title')}
      open={isNavigateModalOpen}
      onOk={() => {
        console.log('ox');
      }}
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
          onChange={(e) => setSearchText(e.target.value)}
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
            renderItem={(item: TableStatusRow) => (
              <ItemListWithHover
                onClick={() => {
                  setIsNavigateModalOpen(false);
                  navigate(
                    `/connections/${currentConnectionName}/${database}/tables/${item.Name}`
                  );
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

const ItemListWithHover = styled(List.Item)`
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => getSetting(theme, 'selection')};
  }
`;
