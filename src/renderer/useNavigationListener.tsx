import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ShowDatabasesResult } from '../sql/types';
import NavigateModal from './component/NavigateModal';

type WithDatabaseListProps = {
  databaseList: ShowDatabasesResult | undefined;
};

type ReturnType = {
  NavigateModal: React.FunctionComponent<WithDatabaseListProps>;
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

  const NavigateModalComponent = ({ databaseList }: WithDatabaseListProps) => (
    <NavigateModal
      databaseList={databaseList}
      isNavigateModalOpen={isNavigateModalOpen}
      setIsNavigateModalOpen={setIsNavigateModalOpen}
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
  databaseList,
}: {
  children: ReactNode;
} & WithDatabaseListProps): JSX.Element {
  const { NavigateModal, openNavigateModal } = useNavigationListener();

  return (
    <NavigateModalContext.Provider value={{ openNavigateModal }}>
      <NavigateModal databaseList={databaseList} />

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
