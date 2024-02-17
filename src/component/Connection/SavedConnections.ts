// import Store from 'electron-store';
import { ConnectionObject } from '.';
// import fs from 'node:fs';
// import path from 'node:path';

// Define the path to the JSON file
// const dataFilePath = path.resolve(__dirname, 'data.json');

// Usage
// writeDataToFile({ key: 'value' });
// console.log(readDataFromFile());

// type StoreType = {
//   [key: string]: ConnectionObject;
// };

// TODO need a JSON schema validator here !
// const storage = new Store<StoreType>({
//   accessPropertiesByDotNotation: false, // remove this to handle "folder-like"
//   name: 'connections',
// });

// export default storage;
export default {
  listConnections: async (): Promise<null | Record<
    string,
    ConnectionObject
  >> => {
    const r = await window.config.readConfigurationFile();

    return r?.connections ?? null;
  },

  save: async (name: string, connection: ConnectionObject): Promise<void> => {
    await window.config.addConnectionToConfig(name, connection);
  },
};
