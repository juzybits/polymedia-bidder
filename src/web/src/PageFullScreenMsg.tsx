import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";


export const PageNotFound: React.FC = () =>
{
    return <PageFullScreenMsg>PAGE NOT FOUND</PageFullScreenMsg>;
};


export const PageFullScreenMsg: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) =>
{
    const { header } = useOutletContext<AppContext>();

    return <>
        {header}
        <div id="page-error" className="page-regular">
            <div className="full-screen-msg">
                <div className="msg">
                    {children}
                </div>
            </div>
        </div>
    </>;
};
