import { styled } from 'styled-components';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Content = styled.div`
  width: 50%;
  min-width: 400px;
  align-self: center;
`;

export default function ModalLike({ children }: { children: React.ReactNode }) {
  return (
    <Container>
      <Content>{children}</Content>
    </Container>
  );
}
