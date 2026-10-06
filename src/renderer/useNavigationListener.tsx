import {
  type JSX,
  ReactNode,
  createContext,
  use,
  useEffect,
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

  const openNavigateModal = () => {
    setIsNavigateModalOpen(true);
  };

  return { isNavigateModalOpen, setIsNavigateModalOpen, openNavigateModal };
}

function NavigateModalContextProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isNavigateModalOpen, setIsNavigateModalOpen, openNavigateModal } =
    useNavigationListener();

  const contextValue = { openNavigateModal };

  return (
    <NavigateModalContext value={contextValue}>
      <NavigateModal
        isNavigateModalOpen={isNavigateModalOpen}
        setIsNavigateModalOpen={setIsNavigateModalOpen}
      />

      {children}
    </NavigateModalContext>
  );
}

export function useNavigateModalContext(): NavigateModalContext {
  const context = use(NavigateModalContext);

  if (!context) {
    throw new Error(
      '`useNavigateModalContext` must be used within a `NavigateModalContextProvider`'
    );
  }

  return context;
}

export default NavigateModalContextProvider;
