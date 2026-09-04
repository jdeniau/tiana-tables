import { styled } from 'styled-components';
import { SqlError } from '../../../sql/errorSerializer';
import { commentForeground, space, variableForeground } from '../../theme';

type Props = { error: SqlError };

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  padding: ${space.md};
`;

const Message = styled.div`
  color: ${variableForeground};
`;

const Code = styled.div`
  font-size: 11px;
  color: ${commentForeground};
`;

export default function SqlErrorComponent({ error }: Props) {
  return (
    <Wrapper>
      <Message>{error.message}</Message>
      <Code>
        {error.errno}: {error.code}
      </Code>
    </Wrapper>
  );
}
