import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import NavigateModal from './component/NavigateModal';

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

  const NavigateModalComponent = () => (
    <NavigateModal
      isNavigateModalOpen={isNavigateModalOpen}
      setIsNavigateModalOpen={setIsNavigateModalOpen}
    />
  );

  return { NavigateModal: NavigateModalComponent };
}
