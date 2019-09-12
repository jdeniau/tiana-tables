import * as React from 'react';
import styled from 'styled-components';
import TableList from './TableList';

const LayoutDiv = styled.div`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
`;
const HeaderDiv = styled.header``;
const ContentDiv = styled.div`
    display: flex;
    flex-grow: 1;
`;
const LeftPanelDiv = styled.div`
    background: salmon;
    min-width: 200px;
    overflow: auto;
`;
const RightPanelDiv = styled.div`
    background: green;
    flex-grow: 1;
    overflow: auto;
`;

const Layout = () => {
    return (<LayoutDiv>
        <HeaderDiv>
            <h2>Welcome to Fuzzy Potato !</h2>
        </HeaderDiv>
        <ContentDiv>
            <LeftPanelDiv>
                <TableList />
            </LeftPanelDiv>
            <RightPanelDiv>right panel</RightPanelDiv>
        </ContentDiv>
    </LayoutDiv>);
}

export default Layout;