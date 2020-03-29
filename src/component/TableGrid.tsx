import * as React from 'react';
import styled from 'styled-components';
import { FieldInfo } from 'mysql';
import { getSetting } from '../theme';
import Cell from './Cell';

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
  fields: null | FieldInfo[];
}

function TableGrid({ fields, result }: TableGridProps): React.ReactElement {
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
          {/* eslint-disable react/jsx-key */}
          {/* TODO : use the table primary key to make a real key */}
          {result.map((row: object) => (
            <tr>
              {fields.map((field) => (
                <Td key={field.name}>
                  <Cell type={field.type} value={row[field.name]} />
                </Td>
              ))}
            </tr>
          ))}
          {/* eslint-enable react/jsx-key */}
        </tbody>
      )}
    </Table>
  );
}

export default TableGrid;
