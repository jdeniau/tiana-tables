import { createContext } from 'react';
import { Connection } from 'mysql';

export const ConnectionContext = createContext<Connection | null>(null);
