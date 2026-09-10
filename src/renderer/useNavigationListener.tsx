import {
  type JSX,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NavigateModal from './component/NavigateModal';

type NavigateModalContext = { openNavigateModal: () => void };
const NavigateModalContext = createContext<NavigateModalContext | null>(null);

type NavigationListener = {
  isNavigateModalOpen: boolean;
  setIsNavigateModalOpen: (isOpened: boolean) => void;
  openNavigateModal: () => void;
};

/**
 * Listen to navigation event from the main process and navigate to the given path.
 */
function useNavigationListener(): NavigationListener {
  const [isNavigateModalOpen, setIsNavigateModalOpen] = useState(false);

  useEffect(
    () =>
      window.navigationListener.onOpenNavigationPanel(() => {
        setIsNavigateModalOpen(true);
      }),
    []
  );

  const openNavigateModal = useCallback(() => {
    setIsNavigateModalOpen(true);
  }, []);

  return { isNavigateModalOpen, setIsNavigateModalOpen, openNavigateModal };
}

function NavigateModalContextProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isNavigateModalOpen, setIsNavigateModalOpen, openNavigateModal } =
    useNavigationListener();

  const contextValue = useMemo(
    () => ({ openNavigateModal }),
    [openNavigateModal]
  );

  return (
    <NavigateModalContext.Provider value={contextValue}>
      <NavigateModal
        isNavigateModalOpen={isNavigateModalOpen}
        setIsNavigateModalOpen={setIsNavigateModalOpen}
      />

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
