import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageHome: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();

    return (
    <div id="page-home" className="page-regular">

        {header}

        <div>
            <h1>Home</h1>
        </div>

    </div>
    );
};
