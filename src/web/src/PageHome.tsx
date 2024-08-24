import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { AuctionClient, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";

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

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsCreateAuction"]>>>();

    // === functions ===

    const fetchRecentAuctions = async () => {
        const txs = await auctionClient.fetchTxsCreateAuction(null);
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

const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction,
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card auction-card">
            <h3>Name: {tx.inputs.name}</h3>
            <p>Type: {tx.inputs.type_coin}</p>
            <p>Description: {tx.inputs.description}</p>
            <p>Auction ID: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></p>
            <p>Minimum Bid: {tx.inputs.minimum_bid.toString()}</p>
            <p>Minimum Increase: {tx.inputs.minimum_increase_bps / 100}%</p>
            <p>Extension Period: {tx.inputs.extension_period_ms / 1000 / 60} minutes</p>
            <p>Creator: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></p>
        </div>
    );
};
