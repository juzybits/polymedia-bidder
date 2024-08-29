import { AuctionClient, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Balance } from "./components/cards";
import { Glitch } from "./components/Glitch";

export const PageHome: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();

    return <>
    {header}
    <div id="page-home" className="page-regular">

        <div className="page-content">

            <div id="home-hero" className="page-section">
                <Glitch text="BIDDER" />
                <div id="hero-title">
                    <h1>Sui's Auction House</h1>
                </div>
                <div id="hero-description">
                    <p>
                        BIDDER is a decentralized platform for creating and bidding on auctions.
                    </p>
                </div>
            </div>

            <div className="page-section">
                <div className="section-description">
                    <h2>Recent auctions</h2>
                </div>
                <SectionRecentAuctions />
            </div>

        </div>

    </div>
    </>;
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsAdminCreatesAuction"]>>>();

    // === functions ===

    const fetchRecentAuctions = async () => { // TODO: "load more" / "next page"
        try {
            const newTxs = await auctionClient.fetchTxsAdminCreatesAuction(null);
            setTxs(newTxs);
        } catch (err) {
            console.warn(err); // TODO show error to user
        }
    };

    // const fetchConfig = async () => {
    //     const config = await auctionClient.fetchConfig();
    //     console.log(JSON.stringify(config, null, 2));
    // };

    // === effects ===

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
    tx: TxAdminCreatesAuction;
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card auction-card">
            <div>auctionId: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></div>
            <div>type_coin: {tx.inputs.type_coin}</div>
            <div>name: {tx.inputs.name}</div>
            <div>description: {tx.inputs.description}</div>
            <div>pay_addr: <LinkToPolymedia addr={tx.inputs.pay_addr} kind="address" network={network} /></div>
            <div>begin_delay_ms: {tx.inputs.begin_delay_ms}</div>
            <div>duration_ms: {tx.inputs.duration_ms}</div>
            <div>minimum_bid: <Balance balance={tx.inputs.minimum_bid} coinType={tx.inputs.type_coin} /></div>
            <div>minimum_increase_bps: {tx.inputs.minimum_increase_bps}</div>
            <div>extension_period_ms: {tx.inputs.extension_period_ms}</div>
            <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
            <div><Link to={`/auction/${tx.auctionId}`} className="btn">VIEW</Link></div>
        </div>
    );
};
