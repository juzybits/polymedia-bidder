import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageNew: React.FC = () =>
{
    // === state ===

    const { auctionClient, header } = useOutletContext<AppContext>();
    const coinType = "0x2::sui::SUI"; // TODO dropdown
    const itemIds = [ // TODO selector
        "0x123"
    ];

    // === functions ===

    const createAuction = async (): Promise<void> => {
    };

    // === html ===

    return (
    <div id="page-new" className="page-regular">

        {header}

        <div>
            <h1>CREATE AUCTION</h1>

            <button className="btn">
                CREATE
            </button>
        </div>

    </div>
    );
};
