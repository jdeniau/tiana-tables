import { createContext } from 'react';
import { Connection } from 'mysql';

const ConnectionContext = createContext<Connection | null>(null);

export default ConnectionContext;
