import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useNavigate } from 'react-router';

type ReturnType = {
  NavigateModal: React.FunctionComponent;
};

/**
 * Listen to navigation event from the main process and navigate to the given path.
 */
export function useNavigationListener(): ReturnType {
  const navigate = useNavigate();
  const [isNavigateModalOpen, setIsNavigateModalOpen] = useState(false);

  useEffect(() => {
    window.navigationListener.onNavigate((path) => {
      navigate(path);
    });

    window.navigationListener.onOpenNavigationPanel(() => {
      setIsNavigateModalOpen(true);
    });
  }, [navigate]);

  const NavigateModal = () => (
    <Modal
      title="Basic Modal"
      open={isNavigateModalOpen}
      onOk={() => {
        console.log('ox');
      }}
      onCancel={() => {
        setIsNavigateModalOpen(false);
      }}
    >
      Work in progress…
    </Modal>
  );

  return { NavigateModal };
}
