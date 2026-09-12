import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TableTab,
  buildTableTabs,
  tableAfterClose,
} from '../renderer/component/tableTabs';

type OpenTablesContextProps = {
  /** the strip, memorised tables first, the temporary one last */
  tabs: Array<TableTab>;

  /** memorises a table: it stays open, and it is written to the configuration */
  memoriseTable(tableName: string): void;

  closeTable(tableName: string): void;
};

const OpenTablesContext = createContext<OpenTablesContextProps | null>(null);
OpenTablesContext.displayName = 'OpenTablesContext';

type ProviderProps = {
  connectionSlug: string;
  database: string;

  /** the memorised tables, as the loader read them from the configuration */
  openTables: Array<string>;

  children: ReactNode;
};

/**
 * The open tables of one database — mount it with the database as its `key`.
 * The temporary tab is the table of the route that has not been memorised, so the table list, a foreign key link, ⌘K and the back button need no code of their own.
 */
export function OpenTablesContextProvider({
  connectionSlug,
  database,
  openTables: initialOpenTables,
  children,
}: ProviderProps) {
  const navigate = useNavigate();
  const { tableName } = useParams();
  const [openTables, setOpenTables] = useState(initialOpenTables);
  const [previewTable, setPreviewTable] = useState<string | undefined>(() =>
    tableName && !initialOpenTables.includes(tableName) ? tableName : undefined
  );

  // The route is the one thing every way of opening a table goes through, the back button included.
  // It follows a change of route and nothing else: on a change of `openTables` it would hand the tab we just closed straight back.
  useEffect(() => {
    if (tableName && !openTables.includes(tableName)) {
      setPreviewTable(tableName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const persist = useCallback(
    (next: Array<string>) => {
      setOpenTables(next);
      window.config.setOpenTables(connectionSlug, database, next);
    },
    [connectionSlug, database]
  );

  const memoriseTable = useCallback(
    (name: string) => {
      if (openTables.includes(name)) {
        return;
      }

      persist([...openTables, name]);

      // the click before this one opened the table, so the temporary slot is its own — landed, or still on its way
      setPreviewTable(undefined);
    },
    [openTables, persist]
  );

  const closeTable = useCallback(
    async (name: string) => {
      // the tab we are on is the only one whose closing has somewhere to go
      if (name === tableName) {
        const target = tableAfterClose(
          buildTableTabs(openTables, previewTable),
          name
        );

        if (target) {
          navigate(
            `/connections/${connectionSlug}/${database}/tables/${target}`
          );
        } else {
          // nothing left to open, and the database page redirects to the active table: clear it, or the closed one comes back
          await window.config.setActiveTable(connectionSlug, database, null);
          navigate(`/connections/${connectionSlug}/${database}`);
        }
      }

      if (previewTable === name) {
        setPreviewTable(undefined);
      }

      if (openTables.includes(name)) {
        persist(openTables.filter((table) => table !== name));
      }
    },
    [
      connectionSlug,
      database,
      navigate,
      openTables,
      persist,
      previewTable,
      tableName,
    ]
  );

  const value = useMemo(
    () => ({
      tabs: buildTableTabs(openTables, previewTable),
      memoriseTable,
      closeTable,
    }),
    [closeTable, memoriseTable, openTables, previewTable]
  );

  return (
    <OpenTablesContext.Provider value={value}>
      {children}
    </OpenTablesContext.Provider>
  );
}

export function useOpenTablesContext(): OpenTablesContextProps {
  const context = useContext(OpenTablesContext);

  if (context === null) {
    throw new Error(
      'useOpenTablesContext must be used inside an OpenTablesContextProvider'
    );
  }

  return context;
}
