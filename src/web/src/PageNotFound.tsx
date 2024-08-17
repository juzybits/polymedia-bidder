import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { FullScreenMsg } from "./components/FullScreenMsg";

export const PageNotFound: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();
    return (
    <div id="page-notfound" className="page-regular">

        {header}

        <FullScreenMsg>
            PAGE NOT FOUND
        </FullScreenMsg>

    </div>
    );
};
