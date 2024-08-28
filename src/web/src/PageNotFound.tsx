import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { FullScreenMsg } from "./components/FullScreenMsg";

export const PageNotFound: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();
    return <>
    {header}
    <div id="page-notfound" className="page-regular">


        <FullScreenMsg>
            PAGE NOT FOUND
        </FullScreenMsg>

    </div>
    </>;
};
