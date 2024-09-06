import { AuctionClient } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Glitch } from "./components/Glitch";
import { CardLoading, CardTxAdminCreatesAuction, CardWithMsg } from "./components/cards";

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

            <SectionRecentAuctions />

        </div>

    </div>
    </>;
};

const MAX_ITEMS_PER_AUCTION = 3;

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsAdminCreatesAuction"]>>>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === functions ===

    const fetchRecentAuctions = async () => // TODO: "load more" / "next page"
    {
        setTxs(undefined);
        setErrFetch(null);
        try
        {
            // fetch recent txs
            const newTxs = await auctionClient.fetchTxsAdminCreatesAuction(null);
            // fetch all the auctioned objects that will be displayed, and populate the cache
            const itemAddrs = newTxs.data.flatMap(tx => tx.inputs.item_addrs.slice(0, MAX_ITEMS_PER_AUCTION));
            const uniqItemAddrs = [...new Set(itemAddrs)];
            await auctionClient.fetchItems(uniqItemAddrs, true);
            // now that the cache is populated, display the txs
            setTxs(newTxs);
        } catch (err) {
            setErrFetch("Failed to fetch recent auctions");
            console.warn("[fetchRecentAuctions]", err);
        }
    };

    // === effects ===

    useEffect(() => {
        fetchRecentAuctions();
    }, []);

    // === html ===

    let content: React.ReactNode;
    if (txs === undefined) {
        content = <CardLoading />;
    } else if (errFetch) {
        content = <CardWithMsg>{errFetch}</CardWithMsg>;
    } else {
        content = <div className="list-cards">
            {txs.data.map(tx => (
                <CardTxAdminCreatesAuction tx={tx} key={tx.digest} maxItems={MAX_ITEMS_PER_AUCTION} />
            ))}
        </div>;
    }

    return (
        <div className="page-section">
            <div className="section-title">
                Recent auctions
            </div>
            {content}
        </div>
    );
};

// const fetchConfig = async () => {
//     const config = await auctionClient.fetchConfig();
//     console.log(JSON.stringify(config, null, 2));
// };
