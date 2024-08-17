import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { AuctionClient } from "@polymedia/auction-sdk";

export const PageHome: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();

    return (
    <div id="page-home" className="page-regular">

        {header}

        <div className="page-content">

            <div className="page-section">
                <h1>Home</h1>
            </div>

            <div className="page-section card">
                <div className="section-description">
                    <h2>Recent auctions</h2>
                </div>
                <SectionRecentAuctions />
            </div>

        </div>

    </div>
    );
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsCreateAuction"]>>>();

    // === functions ===

    const fetchRecentAuctions = async () => {
        const txs = await auctionClient.fetchTxsCreateAuction(null);
        setTxs(txs);
    };

    useEffect(() => {
        fetchRecentAuctions();
    }, []);

    // === html ===

    return <>
    {txs?.data.map(tx => (
        <div key={tx.digest} style={{ whiteSpace: 'pre-wrap' }} className="break-all">
            {JSON.stringify(tx, null, 2)}
        </div>
    ))}
    </>;
};
