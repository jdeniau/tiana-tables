import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ShowTableStatus } from '../sql/types';
import NavigateModal from './component/NavigateModal';

type ReturnType = {
  NavigateModal: React.FunctionComponent<{
    tableStatusList: ShowTableStatus[];
  }>;
  openNavigateModal: () => void;
};

/**
 * Listen to navigation event from the main process and navigate to the given path.
 */
function useNavigationListener(): ReturnType {
  const [isNavigateModalOpen, setIsNavigateModalOpen] = useState(false);

  useEffect(() => {
    window.navigationListener.onOpenNavigationPanel(() => {
      setIsNavigateModalOpen(true);
    });
  }, []);

  const NavigateModalComponent = ({
    tableStatusList,
  }: {
    tableStatusList: ShowTableStatus[];
  }) => (
    <NavigateModal
      isNavigateModalOpen={isNavigateModalOpen}
      setIsNavigateModalOpen={setIsNavigateModalOpen}
      tableStatusList={tableStatusList}
    />
  );

  const openNavigateModal = () => {
    setIsNavigateModalOpen(true);
  };

  return { NavigateModal: NavigateModalComponent, openNavigateModal };
}

type NavigateModalContext = { openNavigateModal: () => void };
const NavigateModalContext = createContext<NavigateModalContext | null>(null);

function NavigateModalContextProvider({
  children,
  tableStatusList,
}: {
  children: ReactNode;
  tableStatusList: ShowTableStatus[];
}): JSX.Element {
  const { NavigateModal, openNavigateModal } = useNavigationListener();

  return (
    <NavigateModalContext.Provider value={{ openNavigateModal }}>
      <NavigateModal tableStatusList={tableStatusList} />

      {children}
    </NavigateModalContext.Provider>
  );
}

export function useNavigateModalContext(): NavigateModalContext {
  const context = useContext(NavigateModalContext);

  if (!context) {
    throw new Error(
      '`useNavigateModalContext` must be used within a `NavigateModalContextProvider`'
    );
  }

  return context;
}

export default NavigateModalContextProvider;
