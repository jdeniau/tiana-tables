import { styled } from 'styled-components';
import type { FieldPacket } from 'mysql2/promise';
import { getSetting } from '../../src/theme';
import Cell from './Cell';
import { ReactElement } from 'react';

const Table = styled.table`
  border: 3px solid ${(props) => getSetting(props.theme, 'caret')};
  width: 100%;
  border-collapse: collapse;
`;

const Td = styled.td`
  border: 1px solid ${(props) => getSetting(props.theme, 'caret')};
  padding: 5px 4px;
`;

const Th = styled.th`
  border: 1px solid ${(props) => getSetting(props.theme, 'caret')};
  padding: 5px 4px;
`;

const Thead = styled.thead`
  border-bottom: 3px solid ${(props) => getSetting(props.theme, 'caret')};
`;

interface TableGridProps {
  result: null | object[];
  fields: null | FieldPacket[];
}

function TableGrid({ fields, result }: TableGridProps): ReactElement {
  return (
    <Table>
      {fields && (
        <Thead>
          <tr>
            {fields.map((field) => (
              <Th key={field.name}>{field.name}</Th>
            ))}
          </tr>
        </Thead>
      )}
      {result && fields && (
        <tbody>
          {/* TODO : use the table primary key to make a real key */}
          {result.map((row: object) => (
            <tr>
              {fields.map((field) => (
                <Td key={field.name}>
                  {/* @ts-expect-error field name is in object. Need a better type ? */}
                  <Cell type={field.type} value={row[field.name]} />
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      )}
    </Table>
  );
}

export default TableGrid;
