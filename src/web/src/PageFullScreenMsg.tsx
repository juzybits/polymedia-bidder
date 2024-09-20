import React from "react";
import { useAppContext } from "./App";

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
    const { header } = useAppContext();

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
