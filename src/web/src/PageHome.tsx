import { AuctionClient, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { CardTxAdminCreatesAuction } from "./components/cards";

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

            <div className="page-section">
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

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxAdminCreatesAuction"]>>>();

    // === functions ===

    const fetchRecentAuctions = async () => {
        const txs = await auctionClient.fetchTxAdminCreatesAuction(null);
        setTxs(txs);
    };

    // const fetchConfig = async () => {
    //     const config = await auctionClient.fetchConfig();
    //     console.log(JSON.stringify(config, null, 2));
    // };

    useEffect(() => {
        fetchRecentAuctions();
        // fetchConfig();
    }, []);

    // === html ===

    return <>
        {txs?.data.map(tx => (
            <CardTxAdminCreatesAuction tx={tx} key={tx.digest} />
        ))}
    </>;
};
