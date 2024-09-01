import { AuctionClient } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Glitch } from "./components/Glitch";
import { CardTxAdminCreatesAuction } from "./components/cards";

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
                <div className="section-title">
                    Recent auctions
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
            console.warn("[fetchRecentAuctions]", err); // TODO show error to user
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
            <div className="card" key={tx.digest}>
                <CardTxAdminCreatesAuction tx={tx} />
            </div>
        ))}
    </>;
};
