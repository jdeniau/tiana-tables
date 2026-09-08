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
 * Whether the table palette is open, and the two ways it opens: from the app,
 * and from the main process, which owns the `Ctrl+K` accelerator.
 *
 * The hook returns state, never a component: a component declared in a hook
 * body is a new type on every render, so React unmounts and remounts the
 * palette — losing the search being typed into it.
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
