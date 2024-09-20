import { AuctionObj, SuiItem, TxAdminCreatesAuction } from "@polymedia/bidder-sdk";
import { formatTimeDiff } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Glitch } from "./components/Glitch";
import { CardAuctionItems, CardLoading, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";

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
                <div>
                    <Link to="/new" className="btn">CREATE AUCTION</Link>
                </div>
            </div>

            <SectionRecentAuctions />

        </div>

    </div>
    </>;
};

const MAX_ITEMS_PER_AUCTION = 3;

type TxWithAuctionAndItems = {
    tx: TxAdminCreatesAuction;
    auction: AuctionObj;
    items: SuiItem[];
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<TxWithAuctionAndItems[] | undefined>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchRecentAuctions();
    }, []);

    // === functions ===

    const fetchRecentAuctions = async () => // TODO: "load more" / "next page"
    {
        setTxs(undefined);
        setErrFetch(null);
        try {
            // fetch recent txs
            const recentTxs = await bidderClient.fetchTxsAdminCreatesAuction(null, 12);

            // collect all unique item addresses
            const itemIds = new Set(
                recentTxs.data.flatMap(tx => tx.inputs.item_addrs.slice(0, MAX_ITEMS_PER_AUCTION))
            );

            const auctionIds = recentTxs.data.map(tx => tx.auctionId);

            // fetch all items with a single RPC call
            const auctionsAndItems = await bidderClient.fetchAuctionsAndItems(auctionIds, [...itemIds]);
            const auctionMap = new Map(auctionsAndItems.auctions.map(auction => [auction.id, auction]));
            const itemMap = new Map(auctionsAndItems.items.map(item => [item.id, item]));

            // assign items to each transaction
            const newTxs = recentTxs.data.map(tx => ({
                tx,
                auction: auctionMap.get(tx.auctionId)!,
                items: tx.inputs.item_addrs
                    .slice(0, MAX_ITEMS_PER_AUCTION)
                    .map(addr => itemMap.get(addr))
                    .filter((item): item is SuiItem => item !== undefined)
                }));

            setTxs(newTxs);
        } catch (err) {
            setErrFetch("Failed to fetch recent auctions");
            console.warn("[fetchRecentAuctions]", err);
        }
    };

    // === html ===

    let content: React.ReactNode;
    if (txs === undefined) {
        content = <CardLoading />;
    } else if (errFetch) {
        content = <CardWithMsg>{errFetch}</CardWithMsg>;
    } else {
        content = <div className="card-list">
            {txs.map(({ tx, auction, items }) => (
                <CardTxAdminCreatesAuction
                    tx={tx}
                    key={tx.digest}
                    auction={auction}
                    items={items}
                    hiddenItemCount={Math.max(0, tx.inputs.item_addrs.length - MAX_ITEMS_PER_AUCTION)}
                />
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

const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction;
    auction: AuctionObj;
    items: SuiItem[];
    hiddenItemCount: number;
}> = ({
    tx,
    auction,
    items,
    hiddenItemCount,
}) =>
{
    return (
        <Link to={`/auction/${tx.auctionId}/items`} className="card link">
            <div className="card-header column-on-small">
                <div className="card-title">{tx.inputs.name}</div>
                <div className="auction-header-info">
                    <TopBid auction={auction} />
                    <HeaderLabel auction={auction} />
                </div>
            </div>

            {tx.inputs.description.length > 0 &&
            <div className="card-description">{tx.inputs.description}</div>}

            <CardAuctionItems items={items} hiddenItemCount={hiddenItemCount} />
        </Link>
    );
};

// const fetchConfig = async () => {
//     const config = await bidderClient.fetchConfig();
//     console.log(JSON.stringify(config, null, 2));
// };
